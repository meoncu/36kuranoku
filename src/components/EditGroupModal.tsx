import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { X, Save } from 'lucide-react';
import { Juz } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface EditGroupModalProps {
    groupName: string;
    juzs: Juz[];
    onClose: () => void;
}

export default function EditGroupModal({ groupName, juzs, onClose }: EditGroupModalProps) {
    const { user } = useAuth();
    const [newGroupName, setNewGroupName] = useState(groupName);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newGroupName.trim() || newGroupName === groupName) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);

            juzs.forEach((juz) => {
                const juzRef = doc(db, 'users', user.uid, 'juzler', juz.id);
                batch.update(juzRef, {
                    groupName: newGroupName.trim(),
                    updatedAt: serverTimestamp()
                });
            });

            await batch.commit();
            onClose();
        } catch (error) {
            console.error("Error updating group name:", error);
            alert("Grup adı güncellenirken bir hata oluştu.");
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm text-foreground/50 mb-1 block font-sans">Grup İsmi</label>
                            <input
                                type="text"
                                placeholder="Yeni grup ismi..."
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary transition-colors font-sans"
                                autoFocus
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading || !newGroupName.trim() || newGroupName === groupName}
                                className="w-full btn-secondary py-4 rounded-2xl shadow-lg shadow-secondary/20 font-sans"
                            >
                                <Save className="w-5 h-5" />
                                {loading ? 'Güncelleniyor...' : 'Grup Adını Güncelle'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
