import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { ChevronLeft, BookOpen, CheckCircle2, Calendar, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MonthlyTracker() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tracker, setTracker] = useState<Juz | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewingDate, setViewingDate] = useState(new Date());

    useEffect(() => {
        if (!user || !id) return;

        const fetchTracker = async () => {
            try {
                const docRef = doc(db, 'users', user.uid, 'juzler', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTracker({ id: docSnap.id, ...docSnap.data() } as Juz);
                }
            } catch (error) {
                console.error("Error fetching tracker:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTracker();
    }, [user, id]);

    if (loading) return <div className="p-8 text-center text-white/50">Yükleniyor...</div>;
    if (!tracker) return <div className="p-8 text-center text-white/50">Takip bulunamadı.</div>;

    // Calculation Logic based on VIEWING DATE
    const currentKey = `${viewingDate.getFullYear()}-${String(viewingDate.getMonth() + 1).padStart(2, '0')}`;
    const [startYear, startMonth] = (tracker.startMonth || currentKey).split('-').map(Number);
    const diffMonths = (viewingDate.getFullYear() - startYear) * 12 + (viewingDate.getMonth() + 1 - startMonth);
    const basePage = tracker.assignedPage || 1;
    // Ensure positive modulo behavior for negative diffs if user goes back before start
    // Actually, logic: if diff is negative, page decreases. 
    // Example: Start Jan (Pg 1). View Dec (Prev Year). Diff = -1. Page = 0 -> 20.
    // ((base - 1 + diff) % 20 + 20) % 20 + 1
    const targetPage = (((basePage - 1 + diffMonths) % 20) + 20) % 20 + 1;

    const completedJuzs = tracker.monthlyProgress?.[currentKey] || [];
    const progress = (completedJuzs.length / 30) * 100;

    const handlePrevMonth = () => {
        setViewingDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    const handleNextMonth = () => {
        setViewingDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    const toggleReadStatus = async (juzIndex: number) => {
        if (!user || !tracker) return;

        try {
            const isRead = completedJuzs.includes(juzIndex);
            const docRef = doc(db, 'users', user.uid, 'juzler', tracker.id);

            // We need to update the specific month's array in the map
            // Firestore map update syntax for nested fields: "monthlyProgress.2024-02"
            const fieldPath = `monthlyProgress.${currentKey}`;

            await updateDoc(docRef, {
                [fieldPath]: isRead ? arrayRemove(juzIndex) : arrayUnion(juzIndex)
            });

            // Optimistic update
            setTracker(prev => {
                if (!prev) return null;
                const newProgress = { ...prev.monthlyProgress };
                const currentList = newProgress[currentKey] || [];
                newProgress[currentKey] = isRead
                    ? currentList.filter(i => i !== juzIndex)
                    : [...currentList, juzIndex];
                return { ...prev, monthlyProgress: newProgress };
            });

        } catch (error) {
            console.error("Error toggling status:", error);
            alert("Durum güncellenirken hata oluştu.");
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-24 px-4 pt-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                    <span className="font-bold text-sm">Geri Dön</span>
                </Link>

                <div className="flex items-center gap-4">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 bg-[#C59E57]/10 px-3 py-1.5 rounded-lg text-[#C59E57] min-w-[140px] justify-center">
                        <Calendar className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-widest">
                            {viewingDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>

                    <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5 rotate-180" />
                    </button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="glass-card p-6 rounded-[32px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#C59E57]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <h1 className="text-2xl font-bold text-white mb-2">{tracker.title}</h1>
                <p className="text-white/60 text-sm mb-6">
                    Seçili ayda her cüzün <strong className="text-white bg-white/10 px-2 py-0.5 rounded mx-1">{targetPage}.</strong> sayfasını okumalısınız.
                </p>

                <div className="flex items-center gap-4">
                    <div className="flex-1 bg-black/20 h-3 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#C59E57] transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[#C59E57] font-bold text-sm whitespace-nowrap">
                        {completedJuzs.length} / 30
                    </span>
                </div>
            </div>

            {/* Juz List */}
            <div className="space-y-3">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juzIndex) => {
                    const isRead = completedJuzs.includes(juzIndex);

                    return (
                        <motion.div
                            key={juzIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: juzIndex * 0.02 }}
                            className={`glass-card p-4 rounded-2xl flex items-center justify-between border transition-all ${isRead ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isRead ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-white/50'}`}>
                                    {juzIndex}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-sm ${isRead ? 'text-green-500' : 'text-white'}`}>
                                        {juzIndex}. Cüz
                                    </h3>
                                    <p className="text-[10px] text-white/40 font-medium">
                                        Hedef: {targetPage}. Sayfa
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Read Button */}
                                <Link
                                    to={`/juz/${tracker.id}?mode=monthly&juzIndex=${juzIndex}&targetPage=${targetPage}&month=${currentKey}`}
                                    className="p-2 rounded-lg bg-[#C59E57]/10 text-[#C59E57] hover:bg-[#C59E57] hover:text-white transition-all group"
                                    title="Sayfayı oku"
                                >
                                    <BookOpen className="w-5 h-5" />
                                </Link>

                                {/* Checkbox / Toggle */}
                                <button
                                    onClick={() => toggleReadStatus(juzIndex)}
                                    className={`p-2 rounded-lg transition-all ${isRead ? 'bg-green-500 text-white' : 'bg-white/5 text-white/20 hover:text-white'}`}
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
