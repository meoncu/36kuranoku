import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { X, Search } from 'lucide-react';
import { CHAPTERS } from '../constants/chapters';

interface AddJuzModalProps {
    onClose: () => void;
    initialGroupName?: string;
    existingJuzs?: number[];
}

export default function AddJuzModal({ onClose, initialGroupName = '', existingJuzs = [] }: AddJuzModalProps) {
    const { user } = useAuth();
    const [selectionType, setSelectionType] = useState<'juz' | 'surah' | 'monthly_page' | 'custom'>('juz');
    const [selectedJuzs, setSelectedJuzs] = useState<number[]>(() => {
        if (existingJuzs.length > 0) {
            // Find the first missing juz and suggest it
            for (let i = 1; i <= 30; i++) {
                if (!existingJuzs.includes(i)) return [i];
            }
        }
        return [1];
    });
    const [selectedSurahId, setSelectedSurahId] = useState(0);
    const [startPageCustom, setStartPageCustom] = useState(1);
    const [endPageCustom, setEndPageCustom] = useState(20);
    const [groupName, setGroupName] = useState(initialGroupName);
    const [searchQuery, setSearchQuery] = useState('');

    // Monthly Page Tracking Logic
    const [assignedPage, setAssignedPage] = useState(1);
    // Default to January of Current Year per user request
    const [startMonth, setStartMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-01`;
    });

    const [title, setTitle] = useState('');
    const [assignedBy, setAssignedBy] = useState('');
    const [notes, setNotes] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [loading, setLoading] = useState(false);

    const getReadableStartMonth = () => {
        if (!startMonth) return '';
        const [y, m] = startMonth.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    };

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

                for (const jNo of selectedJuzs) {
                    let startPage, endPage, totalPages;

                    if (jNo === 1) {
                        startPage = 1;
                        endPage = 21;
                        totalPages = 21;
                    } else if (jNo === 30) {
                        startPage = 582;
                        endPage = 604;
                        totalPages = 23;
                    } else {
                        startPage = ((jNo - 1) * 20) + 2;
                        endPage = startPage + 19;
                        totalPages = 20;
                    }

                    // If user didn't enter a custom title, default to "X. Cüz"
                    // If user entered a custom title (e.g. "Ramazan"), append " (X. Cüz)"
                    // UNLESS it is a single selection, then just let the title be what it is or default.

                    let finalTitle;
                    if (title) {
                        finalTitle = `${title} (${jNo}. Cüz)`;
                    } else {
                        finalTitle = `${jNo}. Cüz`;
                    }

                    const isGrouped = selectedJuzs.length > 1;

                    promises.push(addDoc(collection(db, 'users', user.uid, 'juzler'), {
                        type: 'juz',
                        juzNo: jNo,
                        surahId: 0,
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
                        createdAt: serverTimestamp(),
                        groupName: groupName.trim() || title || (isGrouped ? 'Toplu Takip' : null),
                        isGrouped: isGrouped || !!groupName.trim()
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
                        createdAt: serverTimestamp(),
                        groupName: groupName.trim() || null,
                        isGrouped: !!groupName.trim()
                    }));
                }
            } else if (selectionType === 'custom') {
                const totalPages = (endPageCustom - startPageCustom) + 1;
                const finalTitle = title || `${startPageCustom}-${endPageCustom}. Sayfalar`;

                promises.push(addDoc(collection(db, 'users', user.uid, 'juzler'), {
                    type: 'juz', // Use standard juz object but with custom range
                    juzNo: Math.ceil(startPageCustom / 20),
                    surahId: 0,
                    title: finalTitle,
                    toplamSayfa: totalPages,
                    startPage: startPageCustom,
                    endPage: endPageCustom,
                    baslangicTarihi: serverTimestamp(),
                    hedefBitisTarihi: targetDate ? new Date(targetDate) : null,
                    okunanSayfalar: [],
                    durum: 'devam-ediyor',
                    assignedBy: assignedBy,
                    notes: notes,
                    createdAt: serverTimestamp(),
                    groupName: groupName.trim() || title || null,
                    isGrouped: !!(groupName.trim() || title)
                }));
            } else if (selectionType === 'monthly_page') {
                // Use input directly
                let finalTitle = title || `Aylık Hatim - ${getReadableStartMonth()}`;

                promises.push(addDoc(collection(db, 'users', user.uid, 'juzler'), {
                    type: 'monthly_page',
                    juzNo: 0,
                    surahId: 0,
                    title: finalTitle,
                    toplamSayfa: 30,
                    startPage: 0,
                    endPage: 0,
                    isSingleMonth: true, // Manual creation implies single month focus
                    baslangicTarihi: serverTimestamp(),
                    hedefBitisTarihi: targetDate ? new Date(targetDate) : null,
                    okunanSayfalar: [],
                    durum: 'devam-ediyor',
                    assignedBy: assignedBy,
                    notes: notes,
                    createdAt: serverTimestamp(),
                    assignedPage: assignedPage, // Explicit User Input
                    startMonth: startMonth,     // Explicit User Input
                    monthlyProgress: {},
                    groupName: groupName.trim() || null,
                    isGrouped: !!groupName.trim()
                }));
            }

            await Promise.all(promises);

            onClose();
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
        if (selectionType === 'custom') return 'Özel Plan İsmi';
        if (selectionType === 'surah') return 'Sure Seçiniz';
        return `Aylık Takip (${assignedPage}. Sayfa)`;
    };

    return createPortal(
        <div className="fixed inset-0 z-[999] grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="bg-[#1c1c1c] border border-white/10 w-full max-w-sm p-6 rounded-3xl relative animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Yeni Takip Ekle</h2>

                <div className="flex bg-white/5 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
                    <button onClick={() => setSelectionType('juz')} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold rounded-lg transition-all ${selectionType === 'juz' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>Cüz</button>
                    <button onClick={() => setSelectionType('surah')} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold rounded-lg transition-all ${selectionType === 'surah' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>Sure</button>
                    <button onClick={() => setSelectionType('custom')} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold rounded-lg transition-all ${selectionType === 'custom' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>Özel</button>
                    <button onClick={() => setSelectionType('monthly_page')} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold rounded-lg transition-all ${selectionType === 'monthly_page' ? 'bg-[#C59E57] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>Aylık</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-white/50 mb-1 block">Takip İsmi</label>
                            <input
                                type="text"
                                placeholder={getTitlePlaceholder()}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-white/50 mb-1 block">Grup/Klasör Adı</label>
                            <input
                                type="text"
                                placeholder="Örn: Hatm-i Şerif"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary"
                            />
                        </div>
                    </div>

                    {selectionType === 'juz' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-white/50 block">Cüz Numaraları ({selectedJuzs.length} Seçili)</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={handleSelectAll} className="text-[10px] bg-[#C59E57]/20 text-[#C59E57] px-2 py-1 rounded hover:bg-[#C59E57] hover:text-white transition-colors">Hatim (Hepsi)</button>
                                    <button type="button" onClick={() => setSelectedJuzs([])} className="text-[10px] bg-white/5 text-white/50 px-2 py-1 rounded hover:bg-white/10 transition-colors">Temizle</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-6 gap-2 bg-white/5 p-2 rounded-xl">
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(jNo => {
                                    const isExisting = existingJuzs.includes(jNo);
                                    const isSelected = selectedJuzs.includes(jNo);

                                    return (
                                        <button
                                            key={jNo}
                                            type="button"
                                            onClick={() => toggleJuzSelection(jNo)}
                                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all relative
                                                ${isSelected ? 'bg-[#C59E57] text-white shadow-lg scale-105 z-10' :
                                                    isExisting ? 'bg-green-500/10 text-green-500/50' : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'}`}
                                        >
                                            {jNo}
                                            {isExisting && !isSelected && (
                                                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                                            )}
                                        </button>
                                    );
                                })}
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
                                        onClick={() => { setSelectedSurahId(chapter.id); setTitle(`${chapter.name} Suresi`); }}
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

                    {selectionType === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl">
                            <div>
                                <label className="text-xs text-white/50 mb-1 block">Başlangıç Sayfa</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="604"
                                    value={startPageCustom}
                                    onChange={(e) => setStartPageCustom(Number(e.target.value))}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-secondary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-white/50 mb-1 block">Bitiş Sayfa</label>
                                <input
                                    type="number"
                                    min={startPageCustom}
                                    max="604"
                                    value={endPageCustom}
                                    onChange={(e) => setEndPageCustom(Number(e.target.value))}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-secondary transition-colors"
                                />
                            </div>
                            <p className="col-span-2 text-[10px] text-white/30 text-center">Toplam {Math.max(0, endPageCustom - startPageCustom + 1)} sayfalık bir plan oluşturuyorsunuz.</p>
                        </div>
                    )}

                    {selectionType === 'monthly_page' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-white/50 mb-1 block">
                                    Başlangıç Ayı
                                </label>
                                <p className="text-[10px] text-white/40 mb-2">
                                    Takibi başlatmak istediğiniz ay. Geçmiş bir ay seçerseniz o aydan itibaren hesaplama yapılır.
                                </p>
                                <input
                                    type="month"
                                    value={startMonth}
                                    onChange={(e) => setStartMonth(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary color-scheme-dark"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-white/50 mb-1 block">
                                    Başlangıç Ayı Sayfa Hedefi ({getReadableStartMonth()})
                                </label>
                                <p className="text-[10px] text-white/40 mb-2">
                                    Seçtiğiniz başlangıç ayında (genelde Ocak) hangi sayfayı okumak istiyorsunuz?
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={assignedPage}
                                    onChange={(e) => setAssignedPage(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-sm text-white/50 mb-1 block">Notlar (İsteğe bağlı)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary min-h-[80px]"
                            placeholder="Notlarınız..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#C59E57] hover:bg-[#b08d4b] text-white rounded-xl py-4 font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Ekleniyor...' : 'Takibi Başlat'}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
}
