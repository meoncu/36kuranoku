import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { X, Search } from 'lucide-react';
import { CHAPTERS } from '../constants/chapters';

interface AddJuzModalProps {
    onClose: () => void;
}

export default function AddJuzModal({ onClose }: AddJuzModalProps) {
    const { user } = useAuth();
    const [selectionType, setSelectionType] = useState<'juz' | 'surah' | 'monthly_page'>('juz');
    const [selectedJuzs, setSelectedJuzs] = useState<number[]>([1]); // Changed from single number to array
    const [selectedSurahId, setSelectedSurahId] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    // New state for Monthly Page Tracking
    const [assignedPage, setAssignedPage] = useState(1);
    const [startMonth, setStartMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const [title, setTitle] = useState('');
    const [assignedBy, setAssignedBy] = useState('');
    const [notes, setNotes] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleJuzSelection = (juz: number) => {
        setSelectedJuzs(prev => {
            if (prev.includes(juz)) return prev.filter(n => n !== juz);
            return [...prev, juz].sort((a, b) => a - b);
        });
    };

    const handleSelectAll = () => {
        setSelectedJuzs(Array.from({ length: 30 }, (_, i) => i + 1));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const promises = [];

            if (selectionType === 'juz') {
                if (selectedJuzs.length === 0) {
                    alert("Lütfen en az bir cüz seçiniz.");
                    setLoading(false);
                    return;
                }

                // Create a doc for EACH selected juz
                for (const jNo of selectedJuzs) {
                    let startPage = (jNo === 1) ? 1 : ((jNo - 1) * 20) + 2;
                    let endPage = startPage + 19;

                    // Smart Title Logic
                    // If user wrote "Ramazan", it becomes "Ramazan - 5. Cüz"
                    // If title is empty, it becomes "5. Cüz"
                    let finalTitle = title ? `${title} (${jNo}. Cüz)` : `${jNo}. Cüz`;

                    promises.push(addDoc(collection(db, 'users', user.uid, 'juzler'), {
                        type: 'juz',
                        juzNo: jNo,
                        surahId: 0,
                        title: finalTitle,
                        toplamSayfa: 20,
                        startPage: startPage,
                        endPage: endPage,
                        baslangicTarihi: serverTimestamp(),
                        hedefBitisTarihi: targetDate ? new Date(targetDate) : null,
                        okunanSayfalar: [],
                        durum: 'devam-ediyor',
                        assignedBy: assignedBy,
                        notes: notes,
                        createdAt: serverTimestamp()
                    }));
                }
            } else if (selectionType === 'surah') {
                const surah = CHAPTERS.find(c => c.id === selectedSurahId);
                const nextSurah = CHAPTERS.find(c => c.id === selectedSurahId + 1);

                if (surah) {
                    let startPage = surah.startPage;
                    let endPage = nextSurah ? nextSurah.startPage - 1 : 604;
                    let totalPages = (endPage - startPage) + 1;
                    let finalTitle = title || `${surah.name} Suresi`;

                    promises.push(addDoc(collection(db, 'users', user.uid, 'juzler'), {
                        type: 'surah',
                        juzNo: 0,
                        surahId: surah.id,
                        title: finalTitle,
                        toplamSayfa: totalPages,
                        startPage: startPage,
                        endPage: endPage,
                        baslangicTarihi: serverTimestamp(),
                        hedefBitisTarihi: targetDate ? new Date(targetDate) : null,
                        okunanSayfalar: [],
                        durum: 'devam-ediyor',
                        assignedBy: assignedBy,
                        notes: notes,
                        createdAt: serverTimestamp()
                    }));
                }
            } else if (selectionType === 'monthly_page') {
                let finalTitle = title || `Aylık Cüz Takibi (${assignedPage}. Sayfa)`;
                promises.push(addDoc(collection(db, 'users', user.uid, 'juzler'), {
                    type: 'monthly_page',
                    juzNo: 0,
                    surahId: 0,
                    title: finalTitle,
                    toplamSayfa: 30, // 30 Juzs
                    startPage: 0,
                    endPage: 0,
                    baslangicTarihi: serverTimestamp(),
                    hedefBitisTarihi: targetDate ? new Date(targetDate) : null,
                    okunanSayfalar: [],
                    durum: 'devam-ediyor',
                    assignedBy: assignedBy,
                    notes: notes,
                    createdAt: serverTimestamp(),
                    assignedPage: assignedPage,
                    startMonth: startMonth,
                    monthlyProgress: {}
                }));
            }

            await Promise.all(promises);

            onClose();
            // Reset form
            setTitle('');
            setNotes('');
            setAssignedBy('');
            setSelectedJuzs([1]);
        } catch (error) {
            console.error("Error adding tracker:", error);
            alert("Eklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const getTitlePlaceholder = () => {
        if (selectionType === 'juz') {
            if (selectedJuzs.length === 30) return "Ramazan Hatmi";
            if (selectedJuzs.length > 1) return `Toplu Takip (${selectedJuzs.length} Cüz)`;
            return `${selectedJuzs[0] || 1}. Cüz`;
        }
        if (selectionType === 'surah') return 'Sure Seçiniz';
        return `Aylık Takip (${assignedPage}. Sayfa)`;
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="glass-card w-full max-w-sm p-6 rounded-3xl relative animate-in fade-in zoom-in duration-200 flow-root max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Yeni Takip Ekle</h2>

                <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => setSelectionType('juz')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectionType === 'juz' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        Cüz
                    </button>
                    <button
                        onClick={() => setSelectionType('surah')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectionType === 'surah' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        Sure
                    </button>
                    <button
                        onClick={() => setSelectionType('monthly_page')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectionType === 'monthly_page' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        Aylık
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-white/50 mb-1 block">Takip İsmi</label>
                        <input
                            type="text"
                            placeholder={getTitlePlaceholder()}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary"
                        />
                    </div>

                    {selectionType === 'juz' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-white/50 block">Cüz Numaraları ({selectedJuzs.length} Seçili)</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSelectAll}
                                        className="text-[10px] bg-[#C59E57]/20 text-[#C59E57] px-2 py-1 rounded hover:bg-[#C59E57] hover:text-white transition-colors"
                                    >
                                        Hatim (Hepsi)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedJuzs([])}
                                        className="text-[10px] bg-white/5 text-white/50 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                                    >
                                        Temizle
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-6 gap-2 bg-white/5 p-2 rounded-xl">
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(jNo => (
                                    <button
                                        key={jNo}
                                        type="button"
                                        onClick={() => toggleJuzSelection(jNo)}
                                        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${selectedJuzs.includes(jNo) ? 'bg-[#C59E57] text-white shadow-lg scale-105' : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        {jNo}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectionType === 'surah' && (
                        <div>
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
                                            setTitle(`${chapter.name} Suresi`);
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
                                <p className="text-[10px] text-white/40 mb-2">Bu ay (veya seçilen başlangıç ayında) okumanız gereken sayfa.</p>
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
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary color-scheme-dark"
                                />
                            </div>
                        </div>
                    )}



                    <div>
                        <label className="text-sm text-white/50 mb-1 block">Atayan Kişi veya Grup (Opsiyonel)</label>
                        <input
                            type="text"
                            placeholder="Örn: Hatim Grubu, Ahmet"
                            value={assignedBy}
                            onChange={(e) => setAssignedBy(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-white/50 mb-1 block">Notlar (Opsiyonel)</label>
                        <textarea
                            rows={3}
                            placeholder="Örn: 5 gün içinde bitecek..."
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
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Cüzü Başlat"}
                    </button>
                </form>
            </div >
        </div >
    );
}
