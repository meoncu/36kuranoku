import React, { useEffect, useState } from 'react';
import { quranService, PageData } from '../services/quranService';
import { parseTajweedString, getTajweedClassName } from '../utils/tajweedParser';
import { CHAPTERS } from '../constants/chapters';
import { Loader2, Bookmark, X, Copy, BookOpen, Share2, Volume2, Play, Pause, Square, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp, query, where, onSnapshot, getDocs, deleteDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';

interface MushafPageProps {
    pageNumber: number;
}

export const MushafPage: React.FC<MushafPageProps> = ({ pageNumber }) => {
    const { user } = useAuth();
    const [data, setData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);

    // Interaction States
    const [activeMenu, setActiveMenu] = useState<{ x: number, y: number, data: any, type: 'word' | 'verse' } | null>(null);
    const [translation, setTranslation] = useState<string | null>(null);
    const [fullVerseText, setFullVerseText] = useState<string | null>(null);
    const [verseWords, setVerseWords] = useState<any[]>([]);
    const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<string>>(new Set());
    const [showTranslationModal, setShowTranslationModal] = useState(false);
    const [viewMode, setViewMode] = useState<'translation' | 'words'>('translation');
    const [translating, setTranslating] = useState(false);

    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [isBuffering, setIsBuffering] = useState(false);
    const [activeAudio, setActiveAudio] = useState<{ verseKey: string; text?: string } | null>(null);
    const [activeWordPosition, setActiveWordPosition] = useState<number | null>(null);
    const [audioSegments, setAudioSegments] = useState<any[]>([]);
    const currentAudio = React.useRef<HTMLAudioElement | null>(null);

    // Long Press Refs
    const timerRef = React.useRef<any>(null);
    const isLongPress = React.useRef(false);

    useEffect(() => {
        let isMounted = true;
        const loadPage = async () => {
            setLoading(true);
            try {
                const res = await quranService.getPage(pageNumber);
                if (isMounted) {
                    setData(res);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error loading mushaf page:", error);
            }
        };
        loadPage();
        return () => {
            isMounted = false;
            if (currentAudio.current) {
                currentAudio.current.pause();
                currentAudio.current = null;
            }
        };
    }, [pageNumber]);

    // Listen for bookmarks on this page
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'users', user.uid, 'bookmarks'),
            where('pageNumber', '==', pageNumber)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const keys = new Set<string>();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.verseKey) keys.add(data.verseKey);
            });
            setBookmarkedVerses(keys);
        });

        return () => unsubscribe();
    }, [user, pageNumber]);

    const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent, elementData: any) => {
        isLongPress.current = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            setActiveMenu({
                x: clientX,
                y: clientY,
                data: elementData,
                type: elementData.char_type_name === 'end' ? 'verse' : 'word'
            });
        }, 500); // 500ms for long press
    };

    const handleLongPressEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    const handleCopy = async () => {
        if (!activeMenu?.data.verse_key) return;

        try {
            // Copy FULL verse text, not just the word
            const fullText = await quranService.getVerse(activeMenu.data.verse_key);
            if (fullText) {
                navigator.clipboard.writeText(fullText);
                alert("Ayet metni kopyalandı!");
            } else {
                navigator.clipboard.writeText(activeMenu.data.text_uthmani);
                alert("Metin kopyalandı!");
            }
        } catch (e) {
            console.error("Copy failed", e);
        }
        setActiveMenu(null);
    };

    const handleTranslation = async () => {
        if (!activeMenu?.data.verse_key) return;

        setTranslating(true);
        setActiveMenu(null);
        setShowTranslationModal(true);
        setFullVerseText(null); // Reset previous text
        setVerseWords([]);
        setViewMode('translation');

        const [transText, verseText, words] = await Promise.all([
            quranService.getVerseTranslation(activeMenu.data.verse_key),
            quranService.getVerse(activeMenu.data.verse_key),
            quranService.getVerseWordByWord(activeMenu.data.verse_key)
        ]);

        setTranslation(transText);
        setFullVerseText(verseText);
        setVerseWords(words);
        setTranslating(false);
    };

    const stopAudio = () => {
        if (currentAudio.current) {
            currentAudio.current.pause();
            currentAudio.current = null;
        }
        setIsPlaying(false);
        setActiveAudio(null);
        setAudioProgress(0);
        setActiveWordPosition(null);
        setAudioSegments([]);
    };

    const togglePlayPause = () => {
        if (currentAudio.current) {
            if (isPlaying) {
                currentAudio.current.pause();
                setIsPlaying(false);
            } else {
                currentAudio.current.play();
                setIsPlaying(true);
            }
        } else if (activeAudio) {
            // e.g. if it finished but we want to replay
            handlePlayAudio(activeAudio.verseKey);
        }
    };

    const handlePlayAudio = async (specificVerseKey?: string) => {
        const verseKey = specificVerseKey || activeMenu?.data.verse_key;
        if (!verseKey) return;

        // Stop current if different
        if (currentAudio.current) {
            currentAudio.current.pause();
            currentAudio.current = null;
        }

        setActiveAudio({ verseKey, text: activeMenu?.data.text_uthmani });
        setActiveMenu(null);
        setIsBuffering(true);
        setAudioProgress(0);
        setActiveWordPosition(null);
        setAudioSegments([]);

        const audioData = await quranService.getVerseRecitation(verseKey);
        if (audioData) {
            const audio = new Audio(audioData.url);
            currentAudio.current = audio;
            setAudioSegments(audioData.segments || []);

            audio.ontimeupdate = () => {
                if (audio.duration) {
                    const currentTimeMs = audio.currentTime * 1000;
                    setAudioProgress((audio.currentTime / audio.duration) * 100);

                    // Find active segment
                    // Segments usually: [wordIndex, startTime, endTime]
                    // wordIndex in V4 segments is typically 1-based, matching word.position
                    if (audioData.segments && audioData.segments.length > 0) {
                        const activeSeg = audioData.segments.find((seg: any) =>
                            currentTimeMs >= seg[1] && currentTimeMs <= seg[2]
                        );

                        if (activeSeg) {
                            // activeSeg[0] is the word position.
                            // If API returns 1-based, we use it directly.
                            // If it feels off, we can adjust, but usually it matches word.position.
                            // console.log('Active Word:', activeSeg[0], 'Time:', currentTimeMs);
                            setActiveWordPosition(activeSeg[0]);
                        } else {
                            setActiveWordPosition(null);
                        }
                    }
                }
            };

            audio.onended = () => {
                setIsPlaying(false);
                setAudioProgress(100);
                setActiveWordPosition(null);
            };

            audio.onplay = () => {
                setIsPlaying(true);
                setIsBuffering(false);
            };

            audio.onwaiting = () => setIsBuffering(true);
            audio.onplaying = () => setIsBuffering(false);

            audio.play().catch(e => {
                console.error("Audio play failed", e);
                alert("Ses çalınamadı.");
                stopAudio();
            });
        } else {
            alert("Ses dosyası bulunamadı.");
            stopAudio();
        }
    };

    const handleShare = async () => {
        if (!activeMenu?.data.verse_key) return;

        try {
            const verseKey = activeMenu.data.verse_key;
            const surahId = parseInt(verseKey.split(':')[0]);
            const verseNum = verseKey.split(':')[1];
            const surah = CHAPTERS.find(c => c.id === surahId);

            // Fetch Translation
            const translationText = await quranService.getVerseTranslation(verseKey);

            const title = `${surah?.name} Suresi, ${verseNum}. Ayet`;
            // Format: Title + Newline + Translation + Newline + URL
            const textToShare = `${title}\n\n"${translationText}"\n\n${window.location.href}`;

            if (navigator.share) {
                await navigator.share({
                    title: title,
                    text: textToShare,
                    url: window.location.href
                });
            } else {
                navigator.clipboard.writeText(textToShare);
                alert("Ayet meâli ve referans kopyalandı!");
            }
        } catch (e) {
            console.error("Share failed", e);
        }
        setActiveMenu(null);
    };

    const toggleBookmark = async () => {
        if (!user || !activeMenu) return;

        const selectedData = activeMenu.data;
        // Verify verseKey exists
        const verseKey = selectedData.verse_key;
        if (!verseKey) return;

        const isBookmarked = bookmarkedVerses.has(verseKey);

        try {
            if (isBookmarked) {
                // REMOVE BOOKMARK
                // Iterate to find the doc (since we only stored keys in Set)
                // Optimized query for specific user and verseKey
                const q = query(
                    collection(db, 'users', user.uid, 'bookmarks'),
                    where('verseKey', '==', verseKey)
                );
                const snapshot = await getDocs(q);

                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);

                alert("Yer imi kaldırıldı.");
            } else {
                // ADD BOOKMARK
                // Find Surah Info
                const surahId = parseInt(verseKey.split(':')[0]);
                const surah = CHAPTERS.find(c => c.id === surahId);
                const verseNumber = parseInt(verseKey.split(':')[1]);

                // Fetch full verse text for bookmark preview if available
                let previewText = selectedData.text_uthmani || '';
                const fullText = await quranService.getVerse(verseKey);
                if (fullText) previewText = fullText;

                await addDoc(collection(db, 'users', user.uid, 'bookmarks'), {
                    pageNumber: pageNumber,
                    surahName: surah ? surah.name : 'Bilinmeyen Sure',
                    surahId: surahId,
                    verseNumber: verseNumber,
                    verseKey: verseKey,
                    previewText: previewText,
                    note: '',
                    createdAt: serverTimestamp()
                });
                alert("Ayet kaydedildi!");
            }
        } catch (error) {
            console.error("Error adding bookmark:", error);
            alert('Kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
    };

    // Ref for the menu container
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Close menu on click outside but ignore clicks inside the menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };

        if (activeMenu) {
            // Use mousedown to catch clicks before they might do other things, or stick to click
            window.addEventListener('mousedown', handleClickOutside);
        }
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenu]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse font-sans">Sayfa yükleniyor...</p>
            </div>
        );
    }

    if (!data) return null;

    // Find if any surah starts on this page or the active surah for this page
    const getActiveSurah = (pageNum: number) => {
        return CHAPTERS.slice().reverse().find(c => c.startPage <= pageNum);
    };
    const activeSurah = getActiveSurah(pageNumber);

    // Calculate Juz based on page number (Simplified logic: each juz is approx 20 pages)
    // Juz 1: 1-21, Juz 2: 22-41, etc.
    const juzNumber = Math.ceil((pageNumber - 1) / 20) || 1;

    return (
        <div className="mushaf-paper w-full max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-8 sm:py-12 mb-8 font-mushaf shadow-2xl relative">

            {/* Bookmark Modal */}
            {/* Context Menu */}
            <AnimatePresence>
                {activeMenu && (
                    <div
                        ref={menuRef}
                        className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-4"
                        style={{ left: activeMenu.x, top: activeMenu.y - 10 }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-[#1a1a1a] border border-[#C59E57]/30 rounded-2xl shadow-2xl p-2 flex items-center gap-2 backdrop-blur-xl"
                        >
                            <button onClick={handleCopy} className="p-3 hover:bg-white/10 rounded-xl flex flex-col items-center gap-1 min-w-[60px] group transition-colors">
                                <Copy className="w-5 h-5 text-white/70 group-hover:text-white" />
                                <span className="text-[10px] font-bold text-white/50 group-hover:text-white">Kopyala</span>
                            </button>
                            <div className="w-[1px] h-8 bg-white/10" />
                            <div className="w-[1px] h-8 bg-white/10" />
                            <button onClick={toggleBookmark} className="p-3 hover:bg-white/10 rounded-xl flex flex-col items-center gap-1 min-w-[60px] group transition-colors">
                                {activeMenu.data.verse_key && bookmarkedVerses.has(activeMenu.data.verse_key) ? (
                                    <>
                                        <Trash2 className="w-5 h-5 text-red-500/70 group-hover:text-red-500" />
                                        <span className="text-[10px] font-bold text-red-500/50 group-hover:text-red-500">Kaldır</span>
                                    </>
                                ) : (
                                    <>
                                        <Bookmark className="w-5 h-5 text-white/70 group-hover:text-[#C59E57]" />
                                        <span className="text-[10px] font-bold text-white/50 group-hover:text-[#C59E57]">Kaydet</span>
                                    </>
                                )}
                            </button>
                            <div className="w-[1px] h-8 bg-white/10" />
                            <button onClick={handleTranslation} className="p-3 hover:bg-white/10 rounded-xl flex flex-col items-center gap-1 min-w-[60px] group transition-colors">
                                <BookOpen className="w-5 h-5 text-white/70 group-hover:text-white" />
                                <span className="text-[10px] font-bold text-white/50 group-hover:text-white">Meâl</span>
                            </button>
                            <div className="w-[1px] h-8 bg-white/10" />
                            <button onClick={handleShare} className="p-3 hover:bg-white/10 rounded-xl flex flex-col items-center gap-1 min-w-[60px] group transition-colors">
                                <Share2 className="w-5 h-5 text-white/70 group-hover:text-white" />
                                <span className="text-[10px] font-bold text-white/50 group-hover:text-white">Paylaş</span>
                            </button>
                            <div className="w-[1px] h-8 bg-white/10" />
                            <button onClick={() => handlePlayAudio()} className="p-3 hover:bg-white/10 rounded-xl flex flex-col items-center gap-1 min-w-[60px] group transition-colors">
                                <Volume2 className={`w-5 h-5 ${isPlaying ? 'text-[#C59E57] animate-pulse' : 'text-white/70'} group-hover:text-white`} />
                                <span className={`text-[10px] font-bold ${isPlaying ? 'text-[#C59E57]' : 'text-white/50'} group-hover:text-white`}>Dinle</span>
                            </button>
                        </motion.div>
                        {/* Triangle Arrow */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-3 h-3 bg-[#1a1a1a] border-b border-r border-[#C59E57]/30 rotate-45"></div>
                    </div>
                )}
            </AnimatePresence>

            {/* Translation Modal - Showing in-page context */}
            <AnimatePresence>
                {showTranslationModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="bg-[#fafafa] dark:bg-[#1a1a1a] w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border-t border-white/10"
                        >
                            {/* Header */}
                            <div className="bg-[#C59E57] px-6 py-4 flex items-center justify-between">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    Ayet Meâli
                                </h3>
                                <button onClick={() => setShowTranslationModal(false)} className="w-8 h-8 rounded-full bg-black/10 grid place-items-center text-white/70 hover:bg-black/20 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                {translating ? (
                                    <div className="flex flex-col items-center py-8 gap-4">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#C59E57]" />
                                        <p className="text-muted-foreground text-sm">Meâl yükleniyor...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Toggle View */}
                                        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                                            <button
                                                onClick={() => setViewMode('translation')}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'translation' ? 'bg-white dark:bg-white/10 text-[#C59E57] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                Genel Meâl
                                            </button>
                                            <button
                                                onClick={() => setViewMode('words')}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'words' ? 'bg-white dark:bg-white/10 text-[#C59E57] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                Kelime Kelime
                                            </button>
                                        </div>

                                        {viewMode === 'translation' ? (
                                            <>
                                                <div className="text-center p-4 bg-[#C59E57]/5 rounded-2xl border border-[#C59E57]/10">
                                                    <span className="opacity-40 text-xs font-sans block mb-4 uppercase tracking-widest text-left">Ayet Metni</span>
                                                    <p className="font-mushaf text-2xl sm:text-3xl leading-relaxed text-[#1a1a1a] dark:text-white/90 dir-rtl">
                                                        {fullVerseText || activeMenu?.data.text_uthmani}
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <span className="text-[#C59E57] font-bold text-xs uppercase tracking-widest block mb-2">Türkçe Meâl (Diyanet)</span>
                                                    <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
                                                        {translation}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 dir-rtl">
                                                    {verseWords.filter(w => w.char_type_name !== 'end').map((word, idx) => (
                                                        <div key={idx} className="bg-white dark:bg-white/5 p-3 rounded-xl border border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center gap-2 text-center">
                                                            <p className="font-mushaf text-2xl text-[#1a1a1a] dark:text-white/90">{word.text_uthmani}</p>
                                                            <div className="w-full h-px bg-gray-100 dark:bg-white/5" />
                                                            <p className="text-sm font-medium text-[#C59E57] dir-ltr">
                                                                {word.translation?.text || '-'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Floating Audio Player */}
            <AnimatePresence>
                {activeAudio && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
                    >
                        <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-[#C59E57]/20 rounded-2xl p-4 shadow-2xl flex items-center gap-4 relative overflow-hidden">
                            {/* Progress Bar Background */}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                                <div
                                    className="h-full bg-[#C59E57] transition-all duration-300 ease-linear"
                                    style={{ width: `${audioProgress}%` }}
                                />
                            </div>

                            <button
                                onClick={togglePlayPause}
                                className="w-12 h-12 rounded-full bg-[#C59E57] grid place-items-center text-white shrink-0 shadow-lg shadow-[#C59E57]/20 hover:bg-[#b08d4b] transition-colors"
                            >
                                {isBuffering ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : isPlaying ? (
                                    <Pause className="w-6 h-6 fill-current" />
                                ) : (
                                    <Play className="w-6 h-6 fill-current ml-1" />
                                )}
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[#C59E57] text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#C59E57]/10">
                                        Mishary Rashid
                                    </span>
                                </div>
                                <h4 className="text-white font-bold text-sm truncate">
                                    {activeAudio.verseKey}
                                </h4>
                                <p className="text-white/40 text-xs truncate">
                                    Diyanet Vakfı
                                </p>
                            </div>

                            <button
                                onClick={stopAudio}
                                className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center text-white/50 hover:bg-red-500/10 hover:text-red-500 transition-colors shrink-0"
                            >
                                <Square className="w-4 h-4 fill-current" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Page Header (Surah Name & Page Number) */}
            <div className="absolute top-0 left-0 w-full px-8 py-2 flex items-center justify-between pointer-events-none transform -translate-y-full mb-2">
                {/* Visual Header placed *inside* the paper padding visually but structured here */}
            </div>

            {/* Actual Header inside content flow for better print/view layout */}
            <div className="w-full flex items-center justify-between py-2 mb-2 font-sans relative">
                {/* Decorative Background Line */}
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#C59E57]/30 to-transparent top-1/2 -translate-y-1/2"></div>

                {/* Left Side: Page Number */}
                <div className="relative z-10 bg-[#C59E57] text-[#f4ebd0] px-6 py-1.5 rounded-r-full text-xs font-bold tracking-widest shadow-lg shadow-[#C59E57]/20 uppercase">
                    Sayfa {pageNumber}
                </div>

                {/* Center: Decorative Surah Name */}
                {activeSurah && (
                    <div className="relative z-10">
                        <div className="flex flex-col items-center justify-center">
                            {/* Decorative Container Shape */}
                            <div className="bg-[#C59E57] px-8 py-2 relative rounded-xl shadow-lg shadow-[#C59E57]/20">
                                {/* Side Decorations */}
                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#C59E57] rotate-45 border-l border-b border-[#f4ebd0]/30"></div>
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#C59E57] rotate-45 border-r border-t border-[#f4ebd0]/30"></div>

                                <div className="text-center relative z-10">
                                    <span className="block font-mushaf text-xl text-[#f4ebd0] leading-none mb-0.5">{activeSurah.arabic}</span>
                                    <span className="block text-[9px] font-bold text-[#f4ebd0]/90 tracking-[0.2em] uppercase whitespace-nowrap">
                                        {activeSurah.name.toUpperCase()} SURESİ
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Side: Juz Number */}
                <div className="relative z-10 bg-[#C59E57] text-[#f4ebd0] px-6 py-1.5 rounded-l-full text-xs font-bold tracking-widest shadow-lg shadow-[#C59E57]/20 uppercase">
                    {juzNumber}. Cüz
                </div>
            </div>
            <div className="font-mushaf flex flex-col items-center">
                {Object.entries(data.lines)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([lineNum, words]) => {
                        // Check if any word on this line is the first word of a surah
                        const startingSurahInLine = words.find(w => w.verse_key?.endsWith(':1') && w.position === 1);
                        const startingSurah = (startingSurahInLine && startingSurahInLine.verse_key)
                            ? CHAPTERS.find(s => s.id === parseInt(startingSurahInLine.verse_key!.split(':')[0]))
                            : null;

                        return (
                            <React.Fragment key={lineNum}>
                                {startingSurah && (
                                    <div className="w-full mt-2 mb-4 flex flex-col items-center line-header">
                                        <div className="w-full flex items-center gap-4 my-6 opacity-70 group/header">
                                            <div className="h-px bg-[#C59E57] flex-1 opacity-30 group-hover/header:opacity-100 transition-opacity"></div>
                                            <div className="flex items-center gap-3 text-[#C59E57]">
                                                <span className="font-sans font-bold text-[10px] uppercase tracking-[0.2em]">{startingSurah.id}. {startingSurah.name}</span>
                                                <span className="font-mushaf text-lg">{startingSurah.arabic}</span>
                                            </div>
                                            <div className="h-px bg-[#C59E57] flex-1 opacity-30 group-hover/header:opacity-100 transition-opacity"></div>
                                        </div>
                                        {startingSurah.id !== 1 && startingSurah.id !== 9 && (
                                            <div className="text-2xl sm:text-4xl lg:text-5xl text-center mb-8 text-foreground/80 font-mushaf">
                                                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div
                                    className={`mushaf-line w-full px-4 sm:px-8 transition-all duration-300 hover:bg-primary/5 rounded text-[#1a1a1a] dark:text-[#f3f3f3] flex flex-wrap gap-y-4 ${words.length <= 4 ? 'justify-center gap-x-8 sm:gap-x-12' : 'justify-center sm:justify-between'}`}
                                    style={{ direction: 'rtl' }}
                                >
                                    {words.map((word) => {
                                        const segments = parseTajweedString(word.tagged_text);
                                        const isEnd = word.char_type_name === 'end';

                                        // Check if this word is currently being spoken
                                        const isActive = activeAudio?.verseKey === word.verse_key && activeWordPosition === word.position;

                                        // Check if verse is bookmarked
                                        const isBookmarked = word.verse_key && bookmarkedVerses.has(word.verse_key);

                                        // Determine Color Class
                                        let textClass = 'hover:text-primary'; // Default
                                        if (isActive) textClass = 'text-[#C59E57] scale-110 drop-shadow-md';
                                        else if (isBookmarked) textClass = 'text-emerald-600 dark:text-emerald-500';

                                        return (
                                            <span
                                                key={word.id}
                                                onMouseDown={(e) => handleLongPressStart(e, word)}
                                                onMouseUp={handleLongPressEnd}
                                                onMouseLeave={handleLongPressEnd}
                                                onTouchStart={(e) => handleLongPressStart(e, word)}
                                                onTouchEnd={handleLongPressEnd}
                                                className={`inline-block relative ${isEnd ? 'mx-2' : 'mx-[1px]'} py-1 cursor-pointer transition-colors select-none group/word ${textClass}`}
                                                style={{ fontSize: 'var(--mushaf-size)' }}
                                            >
                                                {isEnd ? (
                                                    <div className="rosette-container group-hover/word:scale-110 transition-transform">
                                                        <div className="rosette-shape" />
                                                        <span className="rosette-number">
                                                            {word.text_uthmani.replace(/[٠-٩]/g, (d: string) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    segments.map((seg, segIdx) => (
                                                        <span
                                                            key={segIdx}
                                                            className={`${getTajweedClassName(seg.type)} whitespace-nowrap`}
                                                        >
                                                            {seg.text}
                                                        </span>
                                                    ))
                                                )}
                                            </span>
                                        );
                                    })}
                                </div>
                            </React.Fragment>
                        );
                    })}
            </div>

            {/* Page Footer Info */}
            <div className="mt-12 pt-6 border-t border-primary/10 flex items-center justify-between text-[10px] sm:text-[11px] font-sans uppercase tracking-[0.2em] text-muted-foreground/50">
                <div className="flex items-center gap-4">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">SYF {pageNumber}</span>
                    <span className="hidden sm:inline">Tecvidli Türkiye Mushafı</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Dynamic Render</span>
                </div>
            </div>
        </div>
    );
};
