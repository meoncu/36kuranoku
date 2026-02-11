import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { ChevronLeft, ChevronRight, X, CheckCircle2, Settings, Type, Minus, Plus } from 'lucide-react';
import { MushafPage } from '../components/MushafPage';
import { motion, AnimatePresence } from 'framer-motion';
import { useMushafSettings } from '../hooks/useMushafSettings';

export default function Reader() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Core State
    const [juz, setJuz] = useState<Juz | null>(null);
    const [firestoreDocId, setFirestoreDocId] = useState<string | null>(null);

    // Navigation State
    const [currentPage, setCurrentPage] = useState(1); // 1-20 (Normal Mode)
    const [direction, setDirection] = useState(0);

    // Monthly Mode State
    const [readingMode, setReadingMode] = useState<'normal' | 'monthly'>('normal');
    const [currentJuzIndex, setCurrentJuzIndex] = useState(1); // 1-30 (Monthly Mode)
    const [monthlyTargetPage, setMonthlyTargetPage] = useState(1); // 1-20

    // Read Only (Guest/Preview)
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Font Settings
    const { fontSize, setFontSize, fontFamily, setFontFamily } = useMushafSettings();
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (!user || !id) return;

        const mode = searchParams.get('mode') === 'monthly' ? 'monthly' : 'normal';
        setReadingMode(mode);

        const setupReader = async () => {
            let targetDocId = id;

            // Set initial state from params for Monthly Mode
            if (mode === 'monthly') {
                const jIndex = Number(searchParams.get('juzIndex')) || 1;
                const tPage = Number(searchParams.get('targetPage')) || 1;
                setCurrentJuzIndex(jIndex);
                setMonthlyTargetPage(tPage);
                setFirestoreDocId(id);
            } else {
                // Normal Mode Logic (Existing)
                let isNumeric = /^\d+$/.test(id) && Number(id) >= 1 && Number(id) <= 30;
                if (isNumeric) {
                    const juzNo = Number(id);
                    const q = query(
                        collection(db, 'users', user.uid, 'juzler'),
                        where('juzNo', '==', juzNo),
                        limit(1)
                    );
                    const snapshot = await getDocs(q);

                    if (!snapshot.empty) {
                        targetDocId = snapshot.docs[0].id;
                        setFirestoreDocId(targetDocId);
                    } else {
                        // Dummy for unsaved Juz
                        setJuz({
                            id: 'temp',
                            juzNo: juzNo,
                            toplamSayfa: 20,
                            okunanSayfalar: [],
                            durum: 'devam-ediyor',
                            createdAt: null,
                            baslangicTarihi: null,
                            hedefBitisTarihi: null
                        });
                        setIsReadOnly(true);

                        const globalPage = Number(searchParams.get('initialPage'));
                        if (globalPage) {
                            const juzStartPage = juzNo === 1 ? 1 : ((juzNo - 1) * 20) + 2;
                            const relativePage = Math.max(1, Math.min(20, globalPage - juzStartPage + 1));
                            setCurrentPage(relativePage);
                        }
                        return;
                    }
                } else {
                    setFirestoreDocId(id);
                }
            }

            const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'juzler', targetDocId), (doc) => {
                if (doc.exists()) {
                    const data = doc.data() as Juz;
                    setJuz(data);

                    if (mode === 'normal') {
                        const globalPage = Number(searchParams.get('initialPage'));
                        const juzTotalPages = data.toplamSayfa || 20;
                        if (globalPage) {
                            const juzStartPage = data.startPage || (data.juzNo === 1 ? 1 : ((data.juzNo - 1) * 20) + 2);
                            const relativePage = Math.max(1, Math.min(juzTotalPages, globalPage - juzStartPage + 1));
                            setCurrentPage(relativePage);
                        } else if (data.okunanSayfalar.length > 0) {
                            const lastRead = Math.max(...data.okunanSayfalar);
                            setCurrentPage(Math.min(lastRead + 1, juzTotalPages));
                        }
                    }
                }
            });
            return unsubscribe;
        };

        setupReader();

    }, [user, id, searchParams]);

    const markAsRead = async () => {
        if (!user || !juz || isReadOnly || !firestoreDocId) return;

        try {
            if (readingMode === 'monthly') {
                const now = new Date();
                const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                // For monthly, we toggle the JUZ INDEX in the monthlyProgress array
                // We check if it's already there to avoid duplicates, although arrayUnion handles uniqueness
                await updateDoc(doc(db, 'users', user.uid, 'juzler', firestoreDocId), {
                    [`monthlyProgress.${currentKey}`]: arrayUnion(currentJuzIndex),
                    updatedAt: serverTimestamp()
                });
            } else {
                // Normal Mode
                if (juz.okunanSayfalar.includes(currentPage)) return;
                const isFinished = juz.okunanSayfalar.length + 1 >= juz.toplamSayfa;
                await updateDoc(doc(db, 'users', user.uid, 'juzler', firestoreDocId), {
                    okunanSayfalar: arrayUnion(currentPage),
                    durum: isFinished ? 'tamamlandi' : 'devam-ediyor',
                    updatedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error updating progress:", error);
        }
    };

    const handleNext = () => {
        markAsRead(); // Auto-mark previous/current as read on next?
        // Usually better to mark *current* as read then move.

        if (readingMode === 'monthly') {
            if (currentJuzIndex < 30) {
                setDirection(1);
                setCurrentJuzIndex(prev => prev + 1);
            } else {
                navigate(`/juz/monthly/${id}`);
            }
        } else {
            // Normal
            if (!juz) return;
            const juzTotalPages = juz.toplamSayfa || 20;
            if (currentPage < juzTotalPages) {
                setDirection(1);
                setCurrentPage(prev => prev + 1);
            } else if (currentPage === juzTotalPages) {
                navigate('/');
            }
        }
    };

    const handlePrev = () => {
        if (readingMode === 'monthly') {
            if (currentJuzIndex > 1) {
                setDirection(-1);
                setCurrentJuzIndex(prev => prev - 1);
            }
        } else {
            if (currentPage > 1) {
                setDirection(-1);
                setCurrentPage(prev => prev - 1);
            }
        }
    };

    if (!juz) return null;

    // Calculate Absolute Mushaf Page
    let currentMushafPage = 1;
    let headerTitle = '';
    let isPageRead = false;

    if (readingMode === 'monthly') {
        const juzStartPage = currentJuzIndex === 1 ? 1 : ((currentJuzIndex - 1) * 20) + 2;
        currentMushafPage = juzStartPage + (monthlyTargetPage - 1);
        headerTitle = `${currentJuzIndex}. Cüz - ${monthlyTargetPage}. Sayfa`;

        const now = new Date();
        const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        isPageRead = juz.monthlyProgress?.[currentKey]?.includes(currentJuzIndex) || false;
    } else {
        const juzStartPage = juz.startPage || (juz.juzNo === 1 ? 1 : ((juz.juzNo - 1) * 20) + 2);
        const juzTotalPages = juz.toplamSayfa || 20;
        currentMushafPage = juzStartPage + (currentPage - 1);
        headerTitle = `${juz.juzNo}. Cüz - Sayfa ${currentPage}/${juzTotalPages}`;
        isPageRead = juz.okunanSayfalar.includes(currentPage);
    }

    return (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="glass-card border-b border-white/5 p-4 flex items-center justify-between z-30 reader-header">
                <button
                    onClick={() => {
                        if (readingMode === 'monthly') navigate(`/juz/monthly/${id}`);
                        else navigate('/');
                    }}
                    className="p-2 hover:bg-white/5 rounded-xl text-white transition-colors"
                    aria-label="Kapat"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h2 className="text-sm font-bold text-white">{headerTitle}</h2>
                    <p className="text-[10px] text-primary font-medium tracking-wider uppercase">
                        Dinamik Tecvidli Render
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Settings Trigger */}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-xl transition-all border ${showSettings ? 'bg-primary/20 border-primary/50 text-primary' : 'hover:bg-white/5 border-white/10 text-white'}`}
                        aria-label="Ayarlar"
                    >
                        <Settings className="w-6 h-6" />
                    </button>

                    {/* Font Settings Panel */}
                    <AnimatePresence>
                        {showSettings && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                                    onClick={() => setShowSettings(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                    className="absolute right-4 top-full mt-4 w-72 bg-[#1a1a1a] border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                                >
                                    <div className="p-4 space-y-6">
                                        {/* Font Size Control */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Type className="w-3 h-3" /> Metin Boyutu
                                                </span>
                                                <span className="text-xs font-bold text-primary">{fontSize}px</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setFontSize(prev => Math.max(16, prev - 2))}
                                                    className="flex-1 p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-white transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setFontSize(prev => Math.min(64, prev + 2))}
                                                    className="flex-1 p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-white transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Font Family Control */}
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Yazı Tipi</span>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { name: 'Diyanet Abay', family: "'Diyanet Abay', serif" },
                                                    { name: 'Diyanet Hamdullah', family: "'Diyanet Hamdullah', serif" },
                                                    { name: 'Diyanet Latif', family: "'Diyanet Latif', serif" },
                                                    { name: 'Amiri Quran', family: "'Amiri Quran', serif" }
                                                ].map((f) => (
                                                    <button
                                                        key={f.name}
                                                        onClick={() => setFontFamily(f.family)}
                                                        className={`w-full text-left px-3 py-2.5 text-xs font-medium rounded-lg transition-all ${fontFamily === f.family ? 'bg-primary text-white shadow-lg' : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'}`}
                                                    >
                                                        {f.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-3 flex justify-center border-t border-white/5">
                                        <button
                                            onClick={() => setShowSettings(false)}
                                            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-white transition-colors"
                                        >
                                            Tamam
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    <div className="w-10 flex justify-center">
                        {isPageRead && (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto bg-[#F4EBD0] dark:bg-[#0a0a09] p-2 sm:p-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${readingMode}-${readingMode === 'monthly' ? currentJuzIndex : currentPage}`}
                        initial={{ opacity: 0, scale: 0.98, y: direction > 0 ? 20 : -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.02, y: direction > 0 ? -20 : 20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex flex-col items-center"
                    >
                        <MushafPage pageNumber={currentMushafPage} />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Sticky Interaction Area */}
            <div className="glass-card border-t border-white/5 p-4 sm:p-6 flex items-center justify-between gap-4 safe-bottom reader-footer">
                <button
                    onClick={handlePrev}
                    disabled={readingMode === 'monthly' ? currentJuzIndex === 1 : currentPage === 1}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all disabled:opacity-20 border border-white/5"
                >
                    <ChevronLeft className="w-5 h-5" />
                    {readingMode === 'monthly' ? "Önceki Cüz" : "Önceki Sayfa"}
                </button>

                <button
                    onClick={handleNext}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary/90 rounded-2xl text-white font-bold shadow-lg shadow-primary/20 transition-all border border-primary/20"
                >
                    {readingMode === 'monthly'
                        ? (currentJuzIndex === 30 ? "Ayı Tamamla" : "Okundu / Sonraki Cüz")
                        : (currentPage === 20 ? "Cüzü Bitir" : "Okundu / Sonraki")
                    }
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
