import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { X, Search, Trash2 } from 'lucide-react';
import { Juz } from '../types';
import { CHAPTERS } from '../constants/chapters';
import { motion, AnimatePresence } from 'framer-motion';

interface EditJuzModalProps {
    juz: Juz;
    onClose: () => void;
}

export default function EditJuzModal({ juz, onClose }: EditJuzModalProps) {
    const { user } = useAuth();

    // Initialize selection state based on existing juz data
    const [selectionType, setSelectionType] = useState<'juz' | 'surah' | 'monthly_page' | 'custom' | 'hijri_plan'>(juz.type || (juz.surahId ? 'surah' : 'juz'));
    const [juzNo, setJuzNo] = useState(juz.juzNo || 1);
    const [selectedSurahId, setSelectedSurahId] = useState(juz.surahId || 0);
    const [startPageCustom, setStartPageCustom] = useState(juz.startPage || 1);
    const [endPageCustom, setEndPageCustom] = useState(juz.endPage || 20);
    const [searchQuery, setSearchQuery] = useState('');

    // Specific for Monthly Page
    const [assignedPage, setAssignedPage] = useState(juz.assignedPage || 1);
    const [startMonth, setStartMonth] = useState(juz.startMonth || '');
    const [groupName, setGroupName] = useState(juz.groupName || '');

    // For Hijri Planning
    const [startHijriDate, setStartHijriDate] = useState(juz.hijriPlanConfig?.startHijriDate || '');
    const [startJuzPlan, setStartJuzPlan] = useState(juz.hijriPlanConfig?.startJuz || 1);

    const [title, setTitle] = useState(juz.title || '');
    const [assignedBy, setAssignedBy] = useState(juz.assignedBy || '');
    const [notes, setNotes] = useState(juz.notes || '');

    const initialDate = juz.hedefBitisTarihi?.toDate
        ? juz.hedefBitisTarihi.toDate().toISOString().split('T')[0]
        : '';
    const [targetDate, setTargetDate] = useState(initialDate);

    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!user || !juz.id) return;

        if (window.confirm('Bu takibi tamamen silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            try {
                setLoading(true);
                await deleteDoc(doc(db, 'users', user.uid, 'juzler', juz.id));
                onClose();
            } catch (error) {
                console.error("Error deleting document:", error);
                alert("Silme işlemi başarısız oldu.");
                setLoading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            let totalPages = 20;
            let startPage = (juzNo - 1) * 20 + 2;
            let endPage = startPage + 19;
            let finalTitle = title;
            let surahId = 0;

            if (selectionType === 'surah') {
                const surah = CHAPTERS.find(c => c.id === selectedSurahId);
                const nextSurah = CHAPTERS.find(c => c.id === selectedSurahId + 1);

                if (!surah) return;

                startPage = surah.startPage;
                endPage = nextSurah ? nextSurah.startPage - 1 : 604;
                totalPages = (endPage - startPage) + 1;

                if (!title || title.includes('Cüz') || title.includes('Suresi')) {
                    finalTitle = `${surah.name} Suresi`;
                }
                surahId = surah.id;
            } else if (selectionType === 'monthly_page') {
                totalPages = 30;
                startPage = 0;
                endPage = 0;
                if (!title) finalTitle = `Aylık Cüz Takibi (${assignedPage}. Sayfa)`;
            } else if (selectionType === 'custom') {
                startPage = startPageCustom;
                endPage = endPageCustom;
                totalPages = (endPage - startPage) + 1;
                if (!title) finalTitle = `${startPage}-${endPage}. Sayfalar`;
            } else if (selectionType === 'hijri_plan') {
                totalPages = 30; // Hatim is 30 juz
                if (!title) finalTitle = `Hicri Hatim Planı`;
            } else {
                if (juzNo === 1) startPage = 1;
                if (!title || title.includes('Cüz') || title.includes('Suresi')) {
                    finalTitle = `${juzNo}. Cüz`;
                }
            }

            if (!title) {
                if (selectionType === 'surah') finalTitle = `${CHAPTERS.find(c => c.id === selectedSurahId)?.name} Suresi`;
                else if (selectionType === 'monthly_page') finalTitle = `Aylık Cüz Takibi (${assignedPage}. Sayfa)`;
                else finalTitle = `${juzNo}. Cüz`;
            } else {
                finalTitle = title;
            }

            const updateData: any = {
                type: selectionType,
                juzNo: selectionType === 'juz' ? juzNo : 0,
                surahId: surahId,
                title: finalTitle,
                toplamSayfa: totalPages,
                startPage: startPage,
                endPage: endPage,
                assignedBy,
                notes,
                groupName: groupName.trim() || null,
                isGrouped: !!groupName.trim(),
                hedefBitisTarihi: new Date(targetDate),
                updatedAt: serverTimestamp()
            };

            if (selectionType === 'monthly_page') {
                updateData.assignedPage = assignedPage;
                updateData.startMonth = startMonth;
            } else if (selectionType === 'hijri_plan') {
                updateData.hijriPlanConfig = {
                    startHijriDate,
                    startJuz: startJuzPlan,
                    dailyJuzCount: juz.hijriPlanConfig?.dailyJuzCount || 1
                };
                updateData.baslangicTarihi = new Date(targetDate);
            }

            await updateDoc(doc(db, 'users', user.uid, 'juzler', juz.id), updateData);
            onClose();
        } catch (error) {
            console.error("Error updating juz:", error);
            alert("Güncelleme sırasında hata oluştu.");
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
                    className="bg-card glass-card border border-[var(--border)] w-full max-w-sm p-6 rounded-[32px] relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    <button onClick={onClose} className="absolute top-4 right-4 text-foreground/30 hover:text-foreground transition-colors">
                        <X className="w-6 h-6" />
                    </button>

                    <h2 className="text-xl font-bold text-foreground mb-6 font-sans">Takibi Düzenle</h2>

                    <div className="flex bg-foreground/5 p-1 rounded-[16px] mb-6 border border-[var(--border)] font-sans overflow-x-auto gap-1">
                        <button type="button" onClick={() => setSelectionType('juz')} className={`flex-1 min-w-[50px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'juz' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Cüz</button>
                        <button type="button" onClick={() => setSelectionType('surah')} className={`flex-1 min-w-[50px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'surah' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Sure</button>
                        <button type="button" onClick={() => setSelectionType('custom')} className={`flex-1 min-w-[50px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'custom' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Özel</button>
                        <button type="button" onClick={() => setSelectionType('monthly_page')} className={`flex-1 min-w-[50px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'monthly_page' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Aylık</button>
                        <button type="button" onClick={() => setSelectionType('hijri_plan')} className={`flex-1 min-w-[50px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'hijri_plan' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Hicri</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Selection UI */}
                        {selectionType === 'juz' && (
                            <div className="font-sans">
                                <label className="text-xs text-foreground/40 mb-1 block font-bold uppercase tracking-widest">Cüz Numarası</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={juzNo}
                                    onChange={(e) => setJuzNo(Number(e.target.value))}
                                    className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary transition-all"
                                />
                            </div>
                        )}

                        {selectionType === 'surah' && (
                            <div className="space-y-3 font-sans">
                                <label className="text-xs text-foreground/40 mb-1 block font-bold uppercase tracking-widest">Sure Seç</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                                    <input
                                        type="text"
                                        placeholder="Ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-foreground text-sm focus:outline-none focus:border-secondary transition-colors"
                                    />
                                </div>

                                <div className="max-h-40 overflow-y-auto bg-foreground/5 border border-[var(--border)] rounded-xl custom-scrollbar">
                                    {CHAPTERS.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toString().includes(searchQuery)).map(chapter => (
                                        <button
                                            key={chapter.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedSurahId(chapter.id);
                                                if (!title || title.includes('Suresi') || title.includes('Cüz')) {
                                                    setTitle(`${chapter.name} Suresi`);
                                                }
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-foreground/5 transition-colors ${selectedSurahId === chapter.id ? 'bg-secondary/10 text-secondary' : 'text-foreground/80'}`}
                                        >
                                            <span className="font-medium">{chapter.id}. {chapter.name}</span>
                                            <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{chapter.verseCount} Ayet</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectionType === 'custom' && (
                            <div className="grid grid-cols-2 gap-4 bg-foreground/5 p-4 rounded-2xl border border-[var(--border)] font-sans">
                                <div>
                                    <label className="text-[10px] font-bold text-foreground/40 mb-1 block uppercase tracking-widest">Başlangıç</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="604"
                                        value={startPageCustom}
                                        onChange={(e) => setStartPageCustom(Number(e.target.value))}
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-2 text-foreground focus:outline-none focus:border-secondary"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-foreground/40 mb-1 block uppercase tracking-widest">Bitiş</label>
                                    <input
                                        type="number"
                                        min={startPageCustom}
                                        max="604"
                                        value={endPageCustom}
                                        onChange={(e) => setEndPageCustom(Number(e.target.value))}
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-2 text-foreground focus:outline-none focus:border-secondary"
                                    />
                                </div>
                            </div>
                        )}

                        {selectionType === 'monthly_page' && (
                            <div className="space-y-4 font-sans">
                                <div>
                                    <label className="text-sm text-foreground/50 mb-1 block">Başlangıç Sayfası</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={assignedPage}
                                        onChange={(e) => setAssignedPage(Number(e.target.value))}
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-foreground/50 mb-1 block">Başlangıç Ayı</label>
                                    <input
                                        type="month"
                                        value={startMonth}
                                        onChange={(e) => setStartMonth(e.target.value)}
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary"
                                    />
                                </div>
                            </div>
                        )}

                        {selectionType === 'hijri_plan' && (
                            <div className="space-y-4 font-sans">
                                <div>
                                    <label className="text-sm text-foreground/50 mb-1 block">Başlangıç Cüzü (1-30)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={startJuzPlan}
                                        onChange={(e) => setStartJuzPlan(Number(e.target.value))}
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-foreground/50 mb-1 block">Hicri Başlangıç Tarihi</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={startHijriDate}
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground/50 cursor-not-allowed"
                                        placeholder="Miladi Tarihten hesaplanır"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 font-sans">
                            <div>
                                <label className="text-xs text-foreground/40 mb-1 block font-bold uppercase tracking-widest">Takip İsmi</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-secondary transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-foreground/40 mb-1 block font-bold uppercase tracking-widest">Grup Adı</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-secondary transition-all"
                                />
                            </div>
                        </div>

                        <div className="font-sans">
                            <label className="text-sm text-foreground/50 mb-1 block">Atayan Kişi/Grup</label>
                            <input
                                type="text"
                                value={assignedBy}
                                onChange={(e) => setAssignedBy(e.target.value)}
                                className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary"
                            />
                        </div>

                        <div className="font-sans">
                            <label className="text-sm text-foreground/50 mb-1 block">Notlar</label>
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary resize-none"
                            />
                        </div>

                        <div className="font-sans">
                            <label className="text-sm text-foreground/50 mb-1 block">Bitiş Hedefi</label>
                            <input
                                type="date"
                                required
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary"
                            />
                        </div>

                        <div className="pt-6 border-t border-[var(--border)] flex items-center justify-between gap-4 font-sans">
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-6 py-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                                Sil
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 btn-secondary py-4 rounded-xl shadow-lg shadow-secondary/20 font-bold"
                            >
                                {loading ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
