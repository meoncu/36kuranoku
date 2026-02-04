import { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { X, Search } from 'lucide-react';
import { Juz } from '../types';
import { CHAPTERS } from '../constants/chapters';

interface EditJuzModalProps {
    juz: Juz;
    onClose: () => void;
}

export default function EditJuzModal({ juz, onClose }: EditJuzModalProps) {
    const { user } = useAuth();

    // Initialize selection state based on existing juz data
    const [selectionType, setSelectionType] = useState<'juz' | 'surah' | 'monthly_page'>(juz.type || (juz.surahId ? 'surah' : 'juz'));
    const [juzNo, setJuzNo] = useState(juz.juzNo || 1);
    const [selectedSurahId, setSelectedSurahId] = useState(juz.surahId || 0);
    const [searchQuery, setSearchQuery] = useState('');

    // Specific for Monthly Page
    const [assignedPage, setAssignedPage] = useState(juz.assignedPage || 1);
    const [startMonth, setStartMonth] = useState(juz.startMonth || '');

    const [title, setTitle] = useState(juz.title || '');
    const [assignedBy, setAssignedBy] = useState(juz.assignedBy || '');
    const [notes, setNotes] = useState(juz.notes || '');

    const initialDate = juz.hedefBitisTarihi?.toDate
        ? juz.hedefBitisTarihi.toDate().toISOString().split('T')[0]
        : '';
    const [targetDate, setTargetDate] = useState(initialDate);

    const [loading, setLoading] = useState(false);

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
                hedefBitisTarihi: new Date(targetDate),
                updatedAt: serverTimestamp()
            };

            if (selectionType === 'monthly_page') {
                updateData.assignedPage = assignedPage;
                updateData.startMonth = startMonth;
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

    return (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="glass-card w-full max-w-sm p-6 rounded-3xl relative animate-in fade-in zoom-in duration-200 flow-root max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Takibi Düzenle</h2>

                <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => setSelectionType('juz')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${selectionType === 'juz' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        Cüz
                    </button>
                    <button
                        onClick={() => setSelectionType('surah')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${selectionType === 'surah' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        Sure
                    </button>
                    <button
                        onClick={() => setSelectionType('monthly_page')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${selectionType === 'monthly_page' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        Aylık
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Selection UI */}
                    {selectionType === 'juz' && (
                        <div>
                            <label className="text-sm text-white/50 mb-1 block">Cüz Numarası</label>
                            <input
                                type="number"
                                min="1"
                                max="30"
                                value={juzNo}
                                onChange={(e) => setJuzNo(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary"
                            />
                        </div>
                    )}

                    {selectionType === 'surah' && (
                        <div className="space-y-2">
                            <label className="text-sm text-white/50 mb-1 block">Sure Ara ve Seç</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="text"
                                    placeholder="Sure adı ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-secondary transition-colors"
                                />
                            </div>

                            <div className="max-h-40 overflow-y-auto bg-black/20 border border-white/5 rounded-xl mt-2 custom-scrollbar">
                                {CHAPTERS.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toString().includes(searchQuery)).map(chapter => (
                                    <button
                                        key={chapter.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSurahId(chapter.id);
                                            // Optional: Auto-update title if user selects a surah
                                            if (!title || title.includes('Suresi') || title.includes('Cüz')) {
                                                setTitle(`${chapter.name} Suresi`);
                                            }
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-white/5 transition-colors ${selectedSurahId === chapter.id ? 'bg-[#C59E57]/20 text-[#C59E57]' : 'text-white/80'}`}
                                    >
                                        <span>{chapter.id}. {chapter.name}</span>
                                        <span className="text-xs opacity-50">{chapter.verseCount} Ayet</span>
                                    </button>
                                ))}
                                {CHAPTERS.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                    <div className="p-4 text-center text-white/30 text-xs">Sonuç bulunamadı</div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectionType === 'monthly_page' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-white/50 mb-1 block">Başlangıç Sayfası</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={assignedPage}
                                    onChange={(e) => setAssignedPage(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-white/50 mb-1 block">Başlangıç Ayı</label>
                                <input
                                    type="month"
                                    value={startMonth}
                                    onChange={(e) => setStartMonth(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-sm text-white/50 mb-1 block">Takip İsmi</label>
                        <input
                            type="text"
                            placeholder="Örn: Ramazan Mukabelesi"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-white/50 mb-1 block">Atayan Kişi veya Grup</label>
                        <input
                            type="text"
                            placeholder="Örn: Hatim Grubu"
                            value={assignedBy}
                            onChange={(e) => setAssignedBy(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-white/50 mb-1 block">Notlar</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-white/50 mb-1 block">Hedef Bitiş Tarihi</label>
                        <input
                            type="date"
                            required
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary [color-scheme:dark]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-secondary w-full py-4 mt-4 flex items-center justify-center"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Güncelle"}
                    </button>
                </form>
            </div>
        </div>
    );
}
