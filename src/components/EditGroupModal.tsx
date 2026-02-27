import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { X, Save, Calendar, CheckSquare, Square } from 'lucide-react';
import { Juz } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getHijriDate } from '../utils/hijri';

interface EditGroupModalProps {
    groupName: string;
    juzs: Juz[];
    onClose: () => void;
}

export default function EditGroupModal({ groupName, juzs, onClose }: EditGroupModalProps) {
    const { user } = useAuth();
    const [newGroupName, setNewGroupName] = useState(groupName);
    const [loading, setLoading] = useState(false);
    const [planMode, setPlanMode] = useState(false);
    const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            const sortedJuzs = [...juzs].sort((a, b) => (a.juzNo || 0) - (b.juzNo || 0));

            sortedJuzs.forEach((juz, index) => {
                const juzRef = doc(db, 'users', user.uid, 'juzler', juz.id);
                const updates: any = {};

                if (newGroupName.trim() !== groupName) {
                    updates.groupName = newGroupName.trim();
                }

                if (planMode) {
                    const [y, m, d] = planStartDate.split('-').map(Number);
                    const startDateObj = new Date(y, m - 1, d);
                    startDateObj.setDate(startDateObj.getDate() + index);
                    updates.hedefBitisTarihi = startDateObj;
                }

                if (Object.keys(updates).length > 0) {
                    updates.updatedAt = serverTimestamp();
                    batch.update(juzRef, updates);
                }
            });

            await batch.commit();
            onClose();
        } catch (error) {
            console.error("Error updating group:", error);
            alert("Güncelleme sırasında bir hata oluştu.");
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
                    className="bg-card glass-card border border-[var(--border)] w-full max-w-sm p-8 rounded-[32px] relative shadow-2xl"
                >
                    <button onClick={onClose} className="absolute top-6 right-6 text-foreground/30 hover:text-foreground transition-colors">
                        <X className="w-6 h-6" />
                    </button>

                    <h2 className="text-xl font-bold text-foreground mb-6 font-sans">Grubu Düzenle</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-xs text-foreground/40 mb-1 block font-bold uppercase tracking-widest font-sans">Grup İsmi</label>
                            <input
                                type="text"
                                placeholder="Yeni grup ismi..."
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary transition-colors font-sans"
                            />
                        </div>

                        {/* Task Planning Section */}
                        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => setPlanMode(!planMode)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${planMode ? 'bg-secondary/10 border-secondary text-secondary' : 'bg-foreground/5 border-[var(--border)] text-foreground/50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold uppercase tracking-widest font-sans">Toplu Tarih Planla</div>
                                        <div className="text-[10px] opacity-60 font-medium font-sans mt-0.5">Her güne bir cüz olacak şekilde bitiş hedefi ata</div>
                                    </div>
                                </div>
                                {planMode ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>

                            {planMode && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-foreground/5 rounded-2xl border border-[var(--border)] space-y-3"
                                >
                                    <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest font-sans px-1">Plan Başlangıç Tarihi</label>
                                    <input
                                        type="date"
                                        value={planStartDate}
                                        onChange={(e) => setPlanStartDate(e.target.value)}
                                        className="w-full bg-background border border-[var(--border)] rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-secondary transition-all font-sans"
                                    />
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                                        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                                            Hicri: {(() => {
                                                const [y, m, d] = planStartDate.split('-').map(Number);
                                                return getHijriDate(new Date(y, m - 1, d)).full;
                                            })()}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-foreground/40 font-medium font-sans leading-relaxed italic border-t border-[var(--border)] pt-2 mt-1">
                                        * Gruptaki {juzs.length} parça, bu tarihten başlayarak her gün biri bitecek şekilde sırayla planlanacaktır.
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading || (newGroupName.trim() === groupName && !planMode)}
                                className="w-full flex items-center justify-center gap-2 bg-secondary text-white py-4 rounded-2xl shadow-lg shadow-secondary/20 font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-20 disabled:scale-100"
                            >
                                <Save className="w-5 h-5" />
                                {loading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
