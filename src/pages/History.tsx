import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { BookOpen, Calendar, Clock, CheckCircle2, ChevronRight, LayoutGrid, Trash2, ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function History() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [archivedJuzs, setArchivedJuzs] = useState<Juz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'users', user.uid, 'juzler'),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Juz))
                .filter(j => j.isArchived || j.okunanSayfalar.length >= (j.toplamSayfa || 20));
            setArchivedJuzs(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '---';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const getDuration = (start: any, end: any) => {
        if (!start || !end) return null;
        const s = start.toDate ? start.toDate() : new Date(start);
        const e = end.toDate ? end.toDate() : new Date(end);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 0 ? 'Aynı gün bitti' : `${diffDays} gün sürdü`;
    };

    const handleDuaConfirm = async (juzId: string) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid, 'juzler', juzId), {
                isDuaRead: true,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-24 pt-4 sm:px-4 px-2">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/40 hover:bg-foreground/10 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight leading-none mb-1">Hatim Geçmişi</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 font-sans">Tamamlanan ve Arşivlenen Takipler</p>
                </div>
            </div>

            <main className="space-y-4">
                {loading ? (
                    <div className="grid gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="glass-card h-32 rounded-3xl animate-pulse" />)}
                    </div>
                ) : archivedJuzs.length === 0 ? (
                    <div className="text-center py-16 glass-card rounded-[40px] border-[var(--border)]">
                        <BookOpen className="w-16 h-16 text-foreground/5 mx-auto mb-6" />
                        <h3 className="text-foreground/40 font-sans">Henüz tamamlanmış hatim bulunmuyor</h3>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {archivedJuzs.map(juz => (
                            <motion.div
                                key={juz.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card p-4 sm:p-6 rounded-[32px] border-[var(--border)] relative overflow-hidden group"
                            >
                                {/* Progress Background */}
                                <div className="absolute inset-y-0 left-0 bg-green-500/[0.03] w-full" />

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-base text-foreground truncate">{juz.title || `${juz.juzNo}. Cüz`}</h3>
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-foreground/30 uppercase tracking-widest font-sans">
                                                    <Clock className="w-3 h-3" />
                                                    {getDuration(juz.baslangicTarihi, juz.completedAt || juz.updatedAt)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest font-sans mb-0.5">Bitiş</div>
                                            <div className="text-[10px] font-bold text-foreground/60">{formatDate(juz.completedAt || juz.updatedAt)}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-[var(--border)] my-3">
                                        <div className="space-y-0.5">
                                            <div className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest font-sans">Başlangıç</div>
                                            <div className="text-[10px] font-bold text-foreground/60">{formatDate(juz.baslangicTarihi)}</div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest font-sans">İçerik</div>
                                            <div className="text-[10px] font-bold text-foreground/60">
                                                {juz.type === 'surah' ? 'Sure Takibi' : juz.type === 'custom' ? `${juz.toplamSayfa} Sayfa` : `${juz.juzNo}. Cüz`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {!juz.isDuaRead ? (
                                                <button
                                                    onClick={() => handleDuaConfirm(juz.id)}
                                                    className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                                >
                                                    <Heart className="w-3.5 h-3.5 fill-current" />
                                                    Duayı Yaptım
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2 text-green-600 bg-green-500/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                                    <Heart className="w-3.5 h-3.5 fill-current" />
                                                    Duası Yapıldı
                                                </div>
                                            )}
                                        </div>
                                        <Link to={juz.type === 'surah' ? `/reader/${juz.surahId}` : `/juz/${juz.id}`} className="p-2 bg-foreground/5 rounded-xl text-foreground/40 hover:text-secondary hover:bg-secondary/10 transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
