import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { ChevronLeft, BookOpen, CheckCircle2, Calendar, Lock, Settings2, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EditJuzModal from '../components/EditJuzModal';
import HatimDuaModal from '../components/HatimDuaModal';

export default function MonthlyTracker() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tracker, setTracker] = useState<Juz | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewingDate, setViewingDate] = useState(new Date());
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDuaModal, setShowDuaModal] = useState(false);

    useEffect(() => {
        if (!user || !id) return;

        // Real-time listener
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'juzler', id), (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as Juz;
                setTracker(data);

                // If Single Month, lock view to that month
                if (data.isSingleMonth && data.startMonth) {
                    const [y, m] = data.startMonth.split('-');
                    setViewingDate(new Date(parseInt(y), parseInt(m) - 1));
                }
            } else {
                setTracker(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tracker:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, id]);

    if (loading) return <div className="p-8 text-center text-white/50">Yükleniyor...</div>;
    if (!tracker) return <div className="p-8 text-center text-white/50">Takip bulunamadı.</div>;

    // Calculation Logic based on VIEWING DATE
    const currentKey = `${viewingDate.getFullYear()} -${String(viewingDate.getMonth() + 1).padStart(2, '0')} `;
    const [startYear, startMonth] = (tracker.startMonth || currentKey).split('-').map(Number);
    const diffMonths = (viewingDate.getFullYear() - startYear) * 12 + (viewingDate.getMonth() + 1 - startMonth);
    const basePage = tracker.assignedPage || 1;
    // Ensure positive modulo behavior for negative diffs if user goes back before start
    // Actually, logic: if diff is negative, page decreases. 
    // Example: Start Jan (Pg 1). View Dec (Prev Year). Diff = -1. Page = 0 -> 20.
    // ((base - 1 + diff) % 20 + 20) % 20 + 1
    const targetPage = tracker.isSingleMonth
        ? basePage
        : (((basePage - 1 + diffMonths) % 20) + 20) % 20 + 1;

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
            const fieldPath = `monthlyProgress.${currentKey} `;

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
                    {!tracker.isSingleMonth && (
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}

                    <div className="flex items-center gap-2 bg-[#C59E57]/10 px-3 py-1.5 rounded-lg text-[#C59E57] min-w-[140px] justify-center">
                        <Calendar className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-widest">
                            {viewingDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>

                    {!tracker.isSingleMonth && (
                        <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5 rotate-180" />
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Card */}
            <div className="glass-card p-6 rounded-[32px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#C59E57]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10 flex justify-between items-start mb-2">
                    <h1 className="text-2xl font-bold text-white">{tracker.title}</h1>
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all"
                    >
                        <Settings2 className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-white/60 text-sm mb-6 relative z-10">
                    Seçili ayda her cüzün <strong className="text-white bg-white/10 px-2 py-0.5 rounded mx-1">{targetPage}.</strong> sayfasını okumalısınız.
                </p>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="flex-1 bg-black/20 h-3 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#C59E57] transition-all duration-1000"
                            style={{ width: `${progress}% ` }}
                        />
                    </div>
                    <span className="text-[#C59E57] font-bold text-sm whitespace-nowrap">
                        {completedJuzs.length} / 30
                    </span>
                </div>

                {/* Hatim Completion Banner */}
                <AnimatePresence>
                    {completedJuzs.length === 30 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="relative z-10"
                        >
                            <div className="bg-gradient-to-r from-[#C59E57]/20 to-[#C59E57]/10 border border-[#C59E57]/30 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-[#C59E57] grid place-items-center text-white shadow-lg shadow-[#C59E57]/30 animate-pulse">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#C59E57] text-lg">Bu Ayı Tamamladın!</h3>
                                        <p className="text-white/60 text-xs">Allah kabul etsin, hatim duası okumak ister misin?</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDuaModal(true)}
                                    className="px-4 py-2 bg-[#C59E57] text-white rounded-xl font-bold text-sm shadow-lg hover:bg-[#b08d4b] transition-all flex items-center gap-2"
                                >
                                    <ScrollText className="w-4 h-4" />
                                    <span>Dua Oku</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showDuaModal && (
                    <HatimDuaModal onClose={() => setShowDuaModal(false)} />
                )}
            </AnimatePresence>

            {showEditModal && (
                <EditJuzModal
                    juz={tracker}
                    onClose={() => {
                        setShowEditModal(false);
                        // Refresh logic is implicit as the modal updates Firestore,
                        // and this component listens to doc? No, it uses getDoc once.
                        // Ideally we should switch to onSnapshot or re-fetch.
                        // For now we'll reload window or update state.
                        // But since we navigate away usually...
                        // Let's force a reload for now or switch fetch to snapshot.
                        // Actually, I should switch the fetch to snapshot for real-time updates.
                    }}
                />
            )}

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
                            className={`glass-card p-4 rounded-2xl flex items-center gap-4 border transition-all group ${isRead ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 hover:bg-white/5'}`}
                        >
                            {/* Number Box */}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${isRead ? 'bg-green-500/20 text-green-500' : 'bg-black/20 text-white/30 group-hover:text-white/70'} transition-colors`}>
                                {juzIndex}
                            </div>

                            {/* Text Info - Flex 1 to push actions */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold text-base mb-0.5 ${isRead ? 'text-green-500' : 'text-white'}`}>
                                    {juzIndex}. Cüz
                                </h3>
                                <p className="text-xs text-white/40 font-medium truncate">
                                    Hedef: <span className="text-white/60">{targetPage}. Sayfa</span>
                                </p>
                            </div>

                            {/* Actions Group */}
                            <div className="flex items-center gap-2 pl-2 border-l border-white/5">
                                {/* Read Button */}
                                <Link
                                    to={`/juz/${tracker.id}?mode=monthly&juzIndex=${juzIndex}&targetPage=${targetPage}&month=${currentKey}`}
                                    className="p-3 rounded-xl bg-[#C59E57]/10 text-[#C59E57] hover:bg-[#C59E57] hover:text-white transition-all hover:shadow-lg active:scale-95"
                                    title="Sayfayı oku"
                                >
                                    <BookOpen className="w-5 h-5" />
                                </Link>

                                {/* Checkbox / Toggle */}
                                <button
                                    onClick={() => toggleReadStatus(juzIndex)}
                                    className={`p-3 rounded-xl transition-all shadow-lg active:scale-95 ${isRead ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white/5 text-white/20 hover:text-white hover:bg-white/10'}`}
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
