import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { ChevronLeft, BookOpen, CheckCircle2, Calendar, Settings2, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EditJuzModal from '../components/EditJuzModal';
import HatimDuaModal from '../components/HatimDuaModal';

export default function MonthlyTracker() {
    const { id } = useParams();
    const { user } = useAuth();
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

    if (loading) return (
        <div className="min-h-[60vh] grid place-items-center">
            <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    if (!tracker) return <div className="p-8 text-center text-foreground/50">Takip bulunamadı.</div>;

    // Calculation Logic based on VIEWING DATE
    const currentKey = `${viewingDate.getFullYear()}-${String(viewingDate.getMonth() + 1).padStart(2, '0')}`;
    const [startYear, startMonth] = (tracker.startMonth || currentKey).split('-').map(Number);
    const diffMonths = (viewingDate.getFullYear() - startYear) * 12 + (viewingDate.getMonth() + 1 - startMonth);
    const basePage = tracker.assignedPage || 1;

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
            const fieldPath = `monthlyProgress.${currentKey}`;

            await updateDoc(docRef, {
                [fieldPath]: isRead ? arrayRemove(juzIndex) : arrayUnion(juzIndex)
            });
        } catch (error) {
            console.error("Error toggling status:", error);
            alert("Durum güncellenirken hata oluştu.");
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-24 px-4 pt-4 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors group">
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm">Geri Dön</span>
                </Link>

                <div className="flex items-center gap-4">
                    {!tracker.isSingleMonth && (
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-foreground/10 rounded-xl text-foreground/50 hover:text-foreground transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}

                    <div className="flex items-center gap-2 bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-xl text-secondary min-w-[160px] justify-center">
                        <Calendar className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-widest font-sans">
                            {viewingDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>

                    {!tracker.isSingleMonth && (
                        <button onClick={handleNextMonth} className="p-2 hover:bg-foreground/10 rounded-xl text-foreground/50 hover:text-foreground transition-colors">
                            <ChevronLeft className="w-5 h-5 rotate-180" />
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Card */}
            <div className="glass-card p-6 rounded-[32px] relative overflow-hidden group border-[var(--border)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10 flex justify-between items-start mb-2">
                    <h1 className="text-2xl font-bold text-foreground">{tracker.title}</h1>
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="p-2 bg-foreground/5 hover:bg-foreground/10 rounded-xl text-foreground/50 hover:text-foreground transition-all border border-[var(--border)]"
                    >
                        <Settings2 className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-foreground/60 text-sm mb-6 relative z-10 font-sans">
                    Seçili ayda her cüzün <strong className="text-foreground bg-foreground/10 px-2 py-0.5 rounded mx-1">{targetPage}.</strong> sayfasını okumalısınız.
                </p>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="flex-1 bg-foreground/5 h-3 rounded-full overflow-hidden border border-[var(--border)]">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-secondary shadow-[0_0_12px_rgba(197,158,87,0.4)]"
                        />
                    </div>
                    <span className="text-secondary font-bold text-sm whitespace-nowrap font-sans">
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
                            <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-secondary grid place-items-center text-white shadow-lg shadow-secondary/30">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-secondary text-lg">Bu Ayı Tamamladın!</h3>
                                        <p className="text-foreground/60 text-xs font-sans">Allah kabul etsin, hatim duası okumak ister misin?</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDuaModal(true)}
                                    className="px-4 py-2 bg-secondary text-white rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all flex items-center gap-2 font-sans"
                                >
                                    <BookOpen className="w-4 h-4" />
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
                    onClose={() => setShowEditModal(false)}
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
                            className={`glass-card p-4 rounded-2xl flex items-center gap-4 border transition-all group ${isRead ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--border)] hover:bg-foreground/[0.02]'}`}
                        >
                            {/* Number Box */}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner font-sans ${isRead ? 'bg-emerald-500/20 text-emerald-500' : 'bg-foreground/5 text-foreground/30 group-hover:text-foreground/70'} transition-colors`}>
                                {juzIndex}
                            </div>

                            {/* Text Info - Flex 1 to push actions */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold text-base mb-0.5 ${isRead ? 'text-emerald-500' : 'text-foreground'}`}>
                                    {juzIndex}. Cüz
                                </h3>
                                <p className="text-xs text-foreground/40 font-medium truncate font-sans">
                                    Hedef: <span className="text-foreground/60">{targetPage}. Sayfa</span>
                                </p>
                            </div>

                            {/* Actions Group */}
                            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
                                {/* Read Button */}
                                <Link
                                    to={`/juz/${tracker.id}?mode=monthly&juzIndex=${juzIndex}&targetPage=${targetPage}&month=${currentKey}`}
                                    className="p-3 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-all hover:shadow-lg active:scale-95"
                                    title="Sayfayı oku"
                                >
                                    <BookOpen className="w-5 h-5" />
                                </Link>

                                {/* Checkbox / Toggle */}
                                <button
                                    onClick={() => toggleReadStatus(juzIndex)}
                                    className={`p-3 rounded-xl transition-all shadow-lg active:scale-95 ${isRead ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-foreground/5 text-foreground/20 hover:text-foreground/50 hover:bg-foreground/10 shadow-none'}`}
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
