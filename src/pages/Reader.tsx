import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { ChevronLeft, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { MushafPage } from '../components/MushafPage';
import { motion, AnimatePresence } from 'framer-motion';

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
            <div className="glass-card border-b border-white/5 p-4 flex items-center justify-between z-10">
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
                    {/* Font Selector */}
                    <div className="relative group">
                        <button className="p-2 hover:bg-white/5 rounded-xl text-white transition-colors flex items-center gap-1 border border-white/10">
                            <span className="text-xs font-bold font-sans">A</span>
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] p-2">
                            {[
                                { name: 'Diyanet Abay', family: "'Diyanet Abay', serif" },
                                { name: 'Diyanet Hamdullah', family: "'Diyanet Hamdullah', serif" },
                                { name: 'Diyanet Latif', family: "'Diyanet Latif', serif" },
                                { name: 'Amiri Quran', family: "'Amiri Quran', serif" }
                            ].map((f) => (
                                <button
                                    key={f.name}
                                    onClick={() => document.documentElement.style.setProperty('--mushaf-font', f.family)}
                                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-primary/20 rounded-lg transition-colors text-white"
                                >
                                    {f.name}
                                </button>
                            ))}
                        </div>
                    </div>

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
            <div className="glass-card border-t border-white/5 p-4 sm:p-6 flex items-center justify-between gap-4 safe-bottom">
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
