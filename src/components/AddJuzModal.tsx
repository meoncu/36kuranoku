import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { X, Search } from 'lucide-react';
import { CHAPTERS } from '../constants/chapters';
import { motion, AnimatePresence } from 'framer-motion';
import { getHijriDate } from '../utils/hijri';

interface AddJuzModalProps {
    onClose: () => void;
    initialGroupName?: string;
    existingJuzs?: number[];
}

export default function AddJuzModal({ onClose, initialGroupName = '', existingJuzs = [] }: AddJuzModalProps) {
    const { user } = useAuth();
    const [selectionType, setSelectionType] = useState<'juz' | 'surah' | 'monthly_page' | 'custom' | 'hijri_plan'>('juz');
    const [selectedJuzs, setSelectedJuzs] = useState<number[]>(() => {
        if (existingJuzs.length > 0) {
            // Find the maximum existing juz number
            const maxJuz = Math.max(...existingJuzs);
            // Suggest the next one if it's within range 1-30
            if (maxJuz < 30 && !existingJuzs.includes(maxJuz + 1)) {
                return [maxJuz + 1];
            }
            // Otherwise find the first missing one
            for (let i = 1; i <= 30; i++) {
                if (!existingJuzs.includes(i)) return [i];
            }
        }
        return []; // Default to empty instead of [1]
    });
    const [startJuz, setStartJuz] = useState(() => {
        if (existingJuzs.length > 0) {
            const maxJuz = Math.max(...existingJuzs);
            return maxJuz < 30 ? maxJuz + 1 : 1;
        }
        return 1;
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
    const [startDate, setStartDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
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
            } else if (selectionType === 'hijri_plan') {
                const [y, m, d] = startDate.split('-').map(Number);
                const localDate = new Date(y, m - 1, d);
                const hDate = getHijriDate(localDate);
                let finalTitle = title || `Hicri Hatim Planı`;

                promises.push(addDoc(collection(db, 'users', user.uid, 'juzler'), {
                    type: 'hijri_plan',
                    juzNo: startJuz,
                    surahId: 0,
                    title: finalTitle,
                    toplamSayfa: 30, // Full hatim plan
                    startPage: 0,
                    endPage: 0,
                    baslangicTarihi: localDate,
                    hedefBitisTarihi: targetDate ? new Date(targetDate) : null,
                    okunanSayfalar: [],
                    durum: 'devam-ediyor',
                    assignedBy: assignedBy,
                    notes: notes,
                    createdAt: serverTimestamp(),
                    hijriPlanConfig: {
                        startHijriDate: `${hDate.year}-${hDate.monthName}-${hDate.day}`, // For display
                        startJuz: startJuz,
                        dailyJuzCount: 1
                    },
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
        if (selectionType === 'hijri_plan') return 'Hicri Hatim Planı';
        return `Aylık Takip (${assignedPage}. Sayfa)`;
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

                    <h2 className="text-xl font-bold text-foreground mb-6 font-sans">Yeni Takip Ekle</h2>

                    <div className="flex bg-foreground/5 p-1 rounded-[16px] mb-6 overflow-x-auto no-scrollbar border border-[var(--border)] font-sans">
                        <button onClick={() => setSelectionType('juz')} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'juz' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Cüz</button>
                        <button onClick={() => setSelectionType('surah')} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'surah' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Sure</button>
                        <button onClick={() => setSelectionType('custom')} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'custom' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Özel</button>
                        <button onClick={() => setSelectionType('monthly_page')} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'monthly_page' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Aylık</button>
                        <button onClick={() => setSelectionType('hijri_plan')} className={`flex-1 min-w-[60px] py-2 text-[10px] font-bold rounded-xl transition-all ${selectionType === 'hijri_plan' ? 'bg-secondary text-white shadow-lg' : 'text-foreground/40 hover:text-foreground'}`}>Hicri Plan</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-foreground/40 mb-1 block font-sans">Takip İsmi</label>
                                <input
                                    type="text"
                                    placeholder={getTitlePlaceholder()}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-secondary transition-all font-sans"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-foreground/40 mb-1 block font-sans">Grup Adı</label>
                                <input
                                    type="text"
                                    placeholder="Örn: Hatm-i Şerif"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-secondary transition-all font-sans"
                                />
                            </div>
                        </div>

                        {selectionType === 'juz' && (
                            <div className="space-y-3 font-sans">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-foreground/50 block">Cüz Numaraları ({selectedJuzs.length})</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={handleSelectAll} className="text-[10px] font-bold text-secondary hover:underline">Hepsini Seç</button>
                                        <button type="button" onClick={() => setSelectedJuzs([])} className="text-[10px] font-bold text-foreground/40 hover:underline">Temizle</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-6 gap-2 bg-foreground/5 p-3 rounded-2xl border border-[var(--border)]">
                                    {Array.from({ length: 30 }, (_, i) => i + 1).map(jNo => {
                                        const isExisting = existingJuzs.includes(jNo);
                                        const isSelected = selectedJuzs.includes(jNo);

                                        return (
                                            <button
                                                key={jNo}
                                                type="button"
                                                onClick={() => toggleJuzSelection(jNo)}
                                                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative
                                                    ${isSelected ? 'bg-secondary text-white shadow-lg scale-105 z-10' :
                                                        isExisting ? 'bg-emerald-500/10 text-emerald-500/50' : 'bg-foreground/5 text-foreground/30 hover:bg-foreground/10 hover:text-foreground'}`}
                                            >
                                                {jNo}
                                                {isExisting && !isSelected && (
                                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {selectionType === 'surah' && (
                            <div className="font-sans">
                                <label className="text-sm text-foreground/50 mb-1 block">Sure Seç</label>
                                <div className="relative mb-2">
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
                                            onClick={() => { setSelectedSurahId(chapter.id); setTitle(`${chapter.name} Suresi`); }}
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
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-2 text-foreground text-sm focus:outline-none focus:border-secondary"
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
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-2 text-foreground text-sm focus:outline-none focus:border-secondary"
                                    />
                                </div>
                            </div>
                        )}

                        {selectionType === 'monthly_page' && (
                            <div className="space-y-4 font-sans">
                                <div>
                                    <label className="text-sm text-foreground/50 mb-1 block">Başlangıç Ayı</label>
                                    <input
                                        type="month"
                                        value={startMonth}
                                        onChange={(e) => setStartMonth(e.target.value)}
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-foreground/50 mb-1 block">Sayfa Hedefi (1-20)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={assignedPage}
                                        onChange={(e) => setAssignedPage(Number(e.target.value))}
                                        className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-secondary"
                                    />
                                </div>
                            </div>
                        )}

                        {selectionType === 'hijri_plan' && (
                            <div className="space-y-4 font-sans border border-secondary/20 bg-secondary/5 p-4 rounded-2xl">
                                <div>
                                    <label className="text-xs font-bold text-secondary mb-1 block uppercase tracking-widest">Başlangıç Tarihi</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-background border border-[var(--border)] rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-secondary transition-all"
                                    />
                                    <p className="text-[10px] text-secondary/60 mt-1 font-bold">
                                        Hicri: {(() => {
                                            const [y, m, d] = startDate.split('-').map(Number);
                                            return getHijriDate(new Date(y, m - 1, d)).full;
                                        })()}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary mb-1 block uppercase tracking-widest">Hangi Cüzle Başlıyorsun?</label>
                                    <div className="grid grid-cols-6 gap-1 bg-background/50 p-2 rounded-xl border border-[var(--border)]">
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map(jNo => (
                                            <button
                                                key={jNo}
                                                type="button"
                                                onClick={() => setStartJuz(jNo)}
                                                className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all
                                                    ${startJuz === jNo ? 'bg-secondary text-white shadow-lg scale-110' : 'bg-foreground/5 text-foreground/40 hover:bg-foreground/10'}`}
                                            >
                                                {jNo}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-foreground/40 mt-2 italic">
                                        Her gün 1 cüz okunacak şekilde planlanacaktır.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="font-sans">
                            <label className="text-sm text-foreground/50 mb-1 block">Bitiş Hedefi</label>
                            <input
                                type="date"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-secondary"
                            />
                        </div>

                        <div className="font-sans">
                            <label className="text-sm text-foreground/50 mb-1 block">Notlar</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-secondary min-h-[80px] resize-none"
                                placeholder="Notlarınız..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-secondary py-4 rounded-xl shadow-lg shadow-secondary/20 font-sans"
                        >
                            {loading ? 'Ekleniyor...' : 'Takibi Başlat'}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
