import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { X, Save } from 'lucide-react';
import { Juz } from '../types';

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
        <div className="fixed inset-0 z-[999] grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="bg-[#1c1c1c] border border-white/10 w-full max-w-sm p-6 rounded-3xl relative animate-in fade-in zoom-in duration-300 shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Grubu Düzenle</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-white/50 mb-1 block">Grup İsmi</label>
                        <input
                            type="text"
                            placeholder="Yeni grup ismi..."
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C59E57] transition-colors"
                            autoFocus
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading || !newGroupName.trim() || newGroupName === groupName}
                            className="w-full bg-[#C59E57] hover:bg-[#b08d4b] text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            {loading ? 'Güncelleniyor...' : 'Grup Adını Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
