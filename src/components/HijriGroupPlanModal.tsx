import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { X, Calendar, Save, CheckCircle2 } from 'lucide-react';
import { Juz } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getHijriDate, hijriToGregorian, HIJRI_MONTHS } from '../utils/hijri';

interface HijriGroupPlanModalProps {
    groupName: string;
    juzs: Juz[];
    onClose: () => void;
}

export default function HijriGroupPlanModal({ groupName, juzs, onClose }: HijriGroupPlanModalProps) {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Default to today's hijri date
    const todayH = getHijriDate(new Date(), profile?.hijriOffset || 0);

    const [hStartDay, setHStartDay] = useState(todayH.day);
    const [hStartMonthName, setHStartMonthName] = useState(todayH.monthName);
    const [hStartYear, setHStartYear] = useState(todayH.year);

    // Sort juzs to assign sequentially
    const sortedJuzs = [...juzs].sort((a, b) => (a.juzNo || 0) - (b.juzNo || 0));
    const [startPieceId, setStartPieceId] = useState(sortedJuzs[0]?.id || '');

    // Function to get shifted juzs based on startPieceId
    const getShiftedJuzs = () => {
        const startIndex = sortedJuzs.findIndex(j => j.id === startPieceId);
        if (startIndex === -1) return sortedJuzs;
        return [...sortedJuzs.slice(startIndex), ...sortedJuzs.slice(0, startIndex)];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            const mIndex = HIJRI_MONTHS.indexOf(hStartMonthName) + 1;

            // Calculate start gregorian date
            let currentGregorian = hijriToGregorian(hStartYear, mIndex, hStartDay, profile?.hijriOffset || 0);
            const shiftedJuzs = getShiftedJuzs();

            shiftedJuzs.forEach((juz, index) => {
                const juzRef = doc(db, 'users', user.uid, 'juzler', juz.id);

                // For each piece, we move one day forward
                const targetDate = new Date(currentGregorian);
                targetDate.setDate(targetDate.getDate() + index);

                batch.update(juzRef, {
                    hedefBitisTarihi: targetDate,
                    updatedAt: serverTimestamp()
                });
            });

            await batch.commit();
            onClose();
        } catch (error) {
            console.error("Error updates:", error);
            alert("Planlama sırasında bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[999] grid place-items-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-md"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-card glass-card border border-secondary/30 w-full max-w-sm p-8 rounded-[32px] relative shadow-2xl"
                >
                    <button onClick={onClose} className="absolute top-6 right-6 text-foreground/30 hover:text-foreground transition-colors">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Hicri Planlama</h2>
                            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">{groupName}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="p-4 bg-secondary/5 border border-secondary/10 rounded-2xl space-y-4">
                            <label className="text-xs font-bold text-secondary uppercase tracking-widest block">Başlangıç Hicri Tarihi</label>

                            <div className="grid grid-cols-3 gap-2">
                                <select
                                    value={hStartDay}
                                    onChange={(e) => setHStartDay(parseInt(e.target.value))}
                                    className="bg-background border border-[var(--border)] rounded-xl px-2 py-3 text-xs text-foreground focus:border-secondary outline-none"
                                >
                                    {Array.from({ length: 30 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select
                                    value={hStartMonthName}
                                    onChange={(e) => setHStartMonthName(e.target.value)}
                                    className="bg-background border border-[var(--border)] rounded-xl px-2 py-3 text-xs text-foreground focus:border-secondary outline-none"
                                >
                                    {HIJRI_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select
                                    value={hStartYear}
                                    onChange={(e) => setHStartYear(parseInt(e.target.value))}
                                    className="bg-background border border-[var(--border)] rounded-xl px-2 py-3 text-xs text-foreground focus:border-secondary outline-none"
                                >
                                    {[1445, 1446, 1447, 1448, 1449, 1450].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            <div className="pt-2 border-t border-secondary/10">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block mb-1.5">İlk sıradaki parça hangisi olsun?</label>
                                <select
                                    value={startPieceId}
                                    onChange={(e) => setStartPieceId(e.target.value)}
                                    className="w-full bg-background border border-[var(--border)] rounded-xl px-4 py-3 text-xs text-foreground focus:border-secondary outline-none font-bold"
                                >
                                    {sortedJuzs.map(j => (
                                        <option key={j.id} value={j.id}>
                                            {j.title || `${j.juzNo}. Cüz`}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[9px] text-foreground/40 leading-relaxed mt-2 italic">
                                    Seçtiğiniz bu cüz <strong>{hStartDay} {hStartMonthName}</strong> tarihine atanacak, diğerleri sırayla devam edecektir.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Önizleme</span>
                            </div>
                            <div className="bg-foreground/5 rounded-2xl p-4 border border-[var(--border)] max-h-52 overflow-y-auto custom-scrollbar space-y-2">
                                {getShiftedJuzs().slice(0, 10).map((j, i) => {
                                    const mIndex = HIJRI_MONTHS.indexOf(hStartMonthName) + 1;
                                    const d = hijriToGregorian(hStartYear, mIndex, hStartDay, profile?.hijriOffset || 0);
                                    d.setDate(d.getDate() + i);
                                    const hd = getHijriDate(d, profile?.hijriOffset || 0);
                                    return (
                                        <div key={j.id} className="flex items-center justify-between text-[10px] font-bold">
                                            <span className="text-foreground/60">{j.title || `${j.juzNo}. Cüz`}</span>
                                            <span className="text-secondary">{hd.day} {hd.monthName}</span>
                                        </div>
                                    );
                                })}
                                {juzs.length > 10 && <div className="text-[9px] text-foreground/30 text-center italic mt-1 pb-1">... ve diğer {juzs.length - 10} parça</div>}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-secondary text-white py-4 rounded-2xl shadow-lg shadow-secondary/20 font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            {loading ? 'Planlanıyor...' : 'Planı Uygula'}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
