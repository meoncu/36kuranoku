import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { BookOpen, Calendar, Clock, CheckCircle2, ChevronRight, LayoutGrid, Trash2, ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getHijriDate } from '../utils/hijri';

export default function History() {
    const { user, profile } = useAuth();
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

    const getDurationInDays = (start: any, end: any) => {
        if (!start || !end) return 0;
        const s = start.toDate ? start.toDate() : new Date(start);
        const e = end.toDate ? end.toDate() : new Date(end);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    };

    const handleDuaConfirmGroup = async (groupItems: Juz[]) => {
        if (!user) return;
        try {
            const batchPromises = groupItems.map(j =>
                updateDoc(doc(db, 'users', user.uid, 'juzler', j.id), {
                    isDuaRead: true,
                    updatedAt: serverTimestamp()
                })
            );
            await Promise.all(batchPromises);
        } catch (err) {
            console.error(err);
        }
    };

    // Grouping Logic
    const groupedHatims = archivedJuzs.reduce((acc, juz) => {
        const key = juz.groupName || juz.id; // If no group, treat as single item
        if (!acc[key]) {
            acc[key] = {
                title: juz.groupName || juz.title || 'İsimsiz Hatim',
                items: [],
                isHatim: juz.type === 'monthly_page' || juz.type === 'hijri_plan' || false, // Single 30-unit tracker or group
                isGroup: !!juz.groupName
            };
        }
        acc[key].items.push(juz);
        // If it's a group, mark as hatim if it has 30 items or specifically marked
        if (acc[key].items.length >= 30) acc[key].isHatim = true;
        return acc;
    }, {} as Record<string, { title: string, items: Juz[], isHatim: boolean, isGroup: boolean }>);

    const hatimSummaries = Object.values(groupedHatims).map(group => {
        const starts = group.items.map(j => j.baslangicTarihi?.toDate ? j.baslangicTarihi.toDate() : new Date(j.baslangicTarihi)).filter(Boolean);
        const ends = group.items.map(j => j.completedAt?.toDate ? j.completedAt.toDate() : (j.updatedAt?.toDate ? j.updatedAt.toDate() : new Date())).filter(Boolean);

        const startDate = starts.length > 0 ? new Date(Math.min(...starts.map(d => d.getTime()))) : null;
        const endDate = ends.length > 0 ? new Date(Math.max(...ends.map(d => d.getTime()))) : null;
        const duration = getDurationInDays(startDate, endDate);
        const isAllDuaDone = group.items.every(j => j.isDuaRead);
        const completedJuzCount = group.isHatim ? 30 : group.items.length;

        return {
            ...group,
            startDate,
            endDate,
            duration,
            isAllDuaDone,
            completedJuzCount,
            id: group.items[0].id // Use first item's ID as key
        };
    }).sort((a, b) => (b.endDate?.getTime() || 0) - (a.endDate?.getTime() || 0));

    const globalStats = {
        totalFullHatims: hatimSummaries.filter(h => h.isHatim).length,
        totalJuzs: archivedJuzs.length,
        avgDuration: Math.round(hatimSummaries.filter(h => h.isHatim).reduce((acc, h) => acc + h.duration, 0) / (hatimSummaries.filter(h => h.isHatim).length || 1))
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-24 pt-4 sm:px-4 px-2">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/40 hover:bg-foreground/10 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight leading-none mb-1">Hatim İstatistikleri</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 font-sans">Tamamlanan Kur'an Yolculuklarınız</p>
                </div>
            </div>

            {/* Global Stats Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="glass-card p-5 rounded-[32px] border-secondary/20 bg-secondary/5 text-center">
                    <div className="text-2xl font-black text-secondary mb-1">{globalStats.totalFullHatims}</div>
                    <div className="text-[9px] font-black text-secondary/60 uppercase tracking-widest">TOPLAM HATİM</div>
                </div>
                <div className="glass-card p-5 rounded-[32px] border-green-500/20 bg-green-500/5 text-center">
                    <div className="text-2xl font-black text-green-600 mb-1">{globalStats.totalJuzs}</div>
                    <div className="text-[9px] font-black text-green-600/60 uppercase tracking-widest">OKUNAN CÜZ</div>
                </div>
                <div className="glass-card p-5 rounded-[32px] border-amber-500/20 bg-amber-500/5 text-center col-span-2 sm:col-span-1">
                    <div className="text-2xl font-black text-amber-600 mb-1">{globalStats.avgDuration} gün</div>
                    <div className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest">ORT. HATİM SÜRESİ</div>
                </div>
            </div>

            <main className="space-y-4">
                {loading ? (
                    <div className="grid gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="glass-card h-32 rounded-3xl animate-pulse" />)}
                    </div>
                ) : hatimSummaries.length === 0 ? (
                    <div className="text-center py-16 glass-card rounded-[40px] border-[var(--border)]">
                        <BookOpen className="w-16 h-16 text-foreground/5 mx-auto mb-6" />
                        <h3 className="text-foreground/40 font-sans">Henüz tamamlanmış hatim bulunmuyor</h3>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {hatimSummaries.map(hatim => (
                            <motion.div
                                key={hatim.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`glass-card p-6 rounded-[32px] border-[var(--border)] relative overflow-hidden transition-all ${hatim.isHatim ? 'ring-2 ring-secondary/20' : ''}`}
                            >
                                <div className="absolute inset-y-0 left-0 bg-green-500/[0.03] w-full" />

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${hatim.isHatim ? 'bg-secondary/20 text-secondary' : 'bg-foreground/5 text-foreground/20'}`}>
                                                {hatim.isHatim ? <Heart className="w-6 h-6 fill-current" /> : <BookOpen className="w-6 h-6" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-lg text-foreground truncate">{hatim.title}</h3>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-[0.15em] font-sans">
                                                    {hatim.isHatim ? 'TAMAMLANMIŞ HATİM' : 'PARÇA TAKİBİ'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-black text-foreground/20 uppercase tracking-widest mb-0.5">BİTİŞ</div>
                                            <div className="text-xs font-bold text-foreground/60">{formatDate(hatim.endDate)}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 py-4 border-y border-[var(--border)] my-4">
                                        <div className="space-y-1">
                                            <div className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">SÜREÇ</div>
                                            <div className="text-xs font-bold text-foreground/70 flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 opacity-30" />
                                                {formatDate(hatim.startDate)} - {hatim.duration} Gün
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">İÇERİK</div>
                                            <div className="text-xs font-bold text-foreground/70 flex items-center gap-2">
                                                <LayoutGrid className="w-3.5 h-3.5 opacity-30" />
                                                {hatim.completedJuzCount} Cüz Tamamlandı
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-3">
                                            {!hatim.isAllDuaDone ? (
                                                <button
                                                    onClick={() => handleDuaConfirmGroup(hatim.items)}
                                                    className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
                                                >
                                                    <Heart className="w-3.5 h-3.5 fill-current" />
                                                    HATİM DUASINI YAPTIM
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2 text-green-600 bg-green-500/10 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    DUASI YAPILDI
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/20 group-hover:bg-secondary/10 group-hover:text-secondary transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
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
