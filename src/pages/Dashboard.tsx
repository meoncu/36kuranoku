import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, where, getDocs, addDoc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { Plus, BookOpen, Clock, ChevronRight, CheckCircle2, TrendingUp, X, Search, Calendar, AlertTriangle, User, StickyNote, Edit2, Archive, Trash2, Folder, FolderOpen, ChevronDown, Settings, LayoutGrid, Heart, Moon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AddJuzModal from '../components/AddJuzModal';
import EditJuzModal from '../components/EditJuzModal';
import EditGroupModal from '../components/EditGroupModal';
import ProfileModal from '../components/ProfileModal';
import PrayerTimes from '../components/PrayerTimes';
import InstallPWA from '../components/InstallPWA';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAPTERS } from '../constants/chapters';
import { quranService } from '../services/quranService';
import { calculatePlannedJuz, getHijriDate } from '../utils/hijri';
import HijriGroupPlanModal from '../components/HijriGroupPlanModal';

const JuzCard = ({ juz, profile, isChild = false, onDelete, onComplete, onEdit, onArchive, onUnarchive, onTogglePage }: { juz: Juz, profile: any, isChild?: boolean, onDelete: (j: Juz) => void, onComplete: (j: Juz) => void, onEdit: (j: Juz) => void, onArchive: (j: Juz) => void, onUnarchive: (j: Juz) => void, onTogglePage: (id: string, page: number, read: boolean) => void }) => {
    const [showGrid, setShowGrid] = useState(false);
    const [selectedPageInfo, setSelectedPageInfo] = useState<{
        pageNo: number;
        surahName: string;
        verseNo: number;
        snippet: string;
        absolutePage: number;
    } | null>(null);
    const [loadingInfo, setLoadingInfo] = useState(false);

    const handlePageClick = async (e: React.MouseEvent, pageNo: number, isRead: boolean) => {
        e.preventDefault();
        e.stopPropagation();

        // Toggle read status
        onTogglePage(juz.id, pageNo, isRead);

        // Fetch info
        setLoadingInfo(true);
        try {
            let absolutePage;
            if (juz.type === 'juz') {
                const start = juz.startPage || (juz.juzNo === 1 ? 1 : juz.juzNo === 30 ? 582 : ((juz.juzNo - 1) * 20) + 2);
                absolutePage = start + pageNo - 1;
            } else if (juz.type === 'surah') {
                const surah = CHAPTERS.find(c => c.id === juz.surahId);
                absolutePage = (surah?.startPage || 1) + pageNo - 1;
            } else {
                absolutePage = (juz.startPage || 1) + pageNo - 1;
            }

            const data = await quranService.getPage(absolutePage);
            const sortedLines = Object.entries(data.lines).sort((a, b) => Number(a[0]) - Number(b[0]));

            if (sortedLines.length > 0) {
                const firstLineWords = sortedLines[0][1];
                const firstWord = firstLineWords.find(w => w.char_type_name === 'word') || firstLineWords[0];
                const [sId, vId] = firstWord.verse_key!.split(':').map(Number);
                const surah = CHAPTERS.find(c => c.id === sId);

                // Get first 3 words
                const allWords = sortedLines.flatMap(l => l[1]).filter(w => w.char_type_name === 'word');
                const snippet = allWords.slice(0, 3).map(w => w.text_uthmani).join(' ');

                setSelectedPageInfo({
                    pageNo,
                    surahName: surah?.name || 'Bilinmiyor',
                    verseNo: vId,
                    snippet,
                    absolutePage
                });
            }
        } catch (err) {
            console.error("Bilgi alınamadı:", err);
        } finally {
            setLoadingInfo(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return null;
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return `${date.getDate()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    };


    const progress = juz.toplamSayfa > 0 ? (juz.okunanSayfalar.length / juz.toplamSayfa) * 100 : 0;
    const isCompleted = juz.okunanSayfalar.length >= juz.toplamSayfa;

    if (juz.type === 'monthly_page') {
        const now = new Date();
        const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const completedCount = juz.monthlyProgress?.[currentKey]?.length || 0;
        const progressPercent = (completedCount / 30) * 100;

        const [startYear, startMonth] = (juz.startMonth || currentKey).split('-').map(Number);
        const diffMonths = (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth);
        const basePage = juz.assignedPage || 1;
        const targetPage = juz.isSingleMonth ? basePage : (((basePage - 1 + diffMonths) % 20) + 20) % 20 + 1;

        return (
            <motion.div layout>
                <Link to={`/juz/monthly/${juz.id}`} className={`glass-card p-6 rounded-[32px] block hover:bg-foreground/[0.08] transition-all group border-[var(--border)] relative overflow-hidden ${isChild ? 'bg-foreground/5' : ''}`}>
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-secondary/10 to-secondary/30 transition-all duration-1000 border-r border-secondary/20" style={{ width: `${progressPercent}%` }} />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary"><Calendar className="w-6 h-6" /></div>
                            <div>
                                <h3 className="text-foreground font-bold text-lg">{juz.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-foreground/60 text-xs font-medium">{now.toLocaleString('tr-TR', { month: 'long' })} Hedefi:</span>
                                    <span className="bg-foreground/5 px-2 py-0.5 rounded text-foreground text-xs font-bold font-sans">{targetPage}. Sayfalar</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pl-2">
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(juz); }} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm z-20"><Trash2 className="w-4 h-4" /></button>
                            <div className="w-10 h-10 rounded-full bg-foreground/5 grid place-items-center group-hover:bg-secondary group-hover:text-white transition-all"><ChevronRight className="w-5 h-5" /></div>
                        </div>
                    </div>
                </Link>
            </motion.div>
        );
    }

    if (juz.type === 'hijri_plan') {
        const startDate = juz.baslangicTarihi?.toDate ? juz.baslangicTarihi.toDate() : new Date(juz.baslangicTarihi);
        const plannedJuz = calculatePlannedJuz(startDate, juz.hijriPlanConfig?.startJuz || 1, 1, profile?.hijriOffset || 0);

        return (
            <motion.div layout>
                <Link to={`/juz/${plannedJuz}?planId=${juz.id}`} className={`glass-card p-6 rounded-[32px] block hover:bg-foreground/[0.08] transition-all group border-secondary/30 relative overflow-hidden bg-secondary/5`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Moon className="w-20 h-20 text-secondary" />
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary">
                                <span className="font-black text-xl">{plannedJuz}</span>
                            </div>
                            <div>
                                <h3 className="text-foreground font-bold text-lg">{juz.title}</h3>
                                <div className="flex flex-col gap-1 mt-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-secondary text-[10px] font-bold uppercase tracking-widest">Bugün Okunacak:</span>
                                        <span className="bg-secondary text-white px-2 py-0.5 rounded text-[10px] font-black">{plannedJuz}. Cüz</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-foreground/40 font-bold">
                                        <Calendar className="w-3 h-3" />
                                        <span>Başlangıç: {juz.hijriPlanConfig?.startHijriDate} ({juz.hijriPlanConfig?.startJuz}. Cüz)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(juz); }} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm z-20"><Trash2 className="w-4 h-4" /></button>
                            <div className="w-10 h-10 rounded-full bg-foreground/5 grid place-items-center group-hover:bg-secondary group-hover:text-white transition-all"><ChevronRight className="w-5 h-5" /></div>
                        </div>
                    </div>

                    {/* Completed Juz Progress for Hijri Plan */}
                    {juz.okunanSayfalar.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-secondary/10 relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold text-secondary/60 uppercase tracking-widest">Tamamlanan Cüzler</span>
                                <span className="text-[9px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-md">{juz.okunanSayfalar.length}/30</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {[...juz.okunanSayfalar].sort((a, b) => a - b).map(n => (
                                    <div key={n} className="w-6 h-6 rounded-lg bg-secondary text-white flex items-center justify-center text-[10px] font-black shadow-sm shadow-secondary/20">
                                        {n}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div layout>
            <Link to={`/juz/${juz.id}`} className={`glass-card p-3 sm:p-5 rounded-[32px] block hover:bg-foreground/[0.02] transition-all group border-[var(--border)] relative overflow-hidden ${isChild ? 'bg-foreground/5' : ''}`}>
                <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r transition-all duration-1000 border-r ${progress >= 100
                        ? 'from-green-500/10 to-green-500/25 dark:from-green-500/20 dark:to-green-500/40 border-green-500/20'
                        : 'from-secondary/[0.1] to-secondary/[0.25] dark:from-secondary/10 dark:to-secondary/40 border-secondary/30'
                        }`}
                    style={{ width: `${progress}%` }}
                />
                <div className="relative z-10 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-foreground/5 grid place-items-center relative group/circle shrink-0 ${isChild ? 'scale-90' : ''}`}>
                            <span className="font-bold text-xl text-foreground group-hover/circle:opacity-0 transition-opacity">
                                {juz.type === 'surah' ? <BookOpen className="w-6 h-6" /> : juz.type === 'custom' ? <TrendingUp className="w-6 h-6" /> : juz.juzNo}
                            </span>
                            {juz.type !== 'surah' && (
                                <svg className="absolute inset-0 w-full h-full -rotate-90 group-hover/circle:opacity-0 transition-opacity">
                                    <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="2" className="text-foreground/[0.08] dark:text-foreground/5" />
                                    <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="2" strokeDasharray={150} strokeDashoffset={150 - (150 * progress) / 100} className="text-secondary" />
                                </svg>
                            )}
                            {!isCompleted && (
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onComplete(juz); }} className="absolute inset-0 flex items-center justify-center bg-green-500/20 text-green-500 opacity-0 group-hover/circle:opacity-100 transition-opacity rounded-2xl"><CheckCircle2 className="w-8 h-8" /></button>
                            )}
                            {isCompleted && <div className="absolute inset-0 flex items-center justify-center text-green-500"><CheckCircle2 className="w-8 h-8" /></div>}
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight truncate">{juz.title || `${juz.juzNo}. Cüz`}</h3>
                                {juz.hedefBitisTarihi && (() => {
                                    const targetDate = juz.hedefBitisTarihi.toDate ? juz.hedefBitisTarihi.toDate() : new Date(juz.hedefBitisTarihi);
                                    const today = new Date();
                                    const isToday = targetDate.getDate() === today.getDate() &&
                                        targetDate.getMonth() === today.getMonth() &&
                                        targetDate.getFullYear() === today.getFullYear();

                                    return (
                                        <div
                                            className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md cursor-help transition-all ${isToday ? 'bg-secondary text-white shadow-lg shadow-secondary/20 animate-pulse' : 'text-secondary bg-secondary/10'}`}
                                            title={`Hicri: ${getHijriDate(targetDate, profile?.hijriOffset || 0).full}`}
                                        >
                                            <Calendar className={`w-3 h-3 ${isToday ? 'animate-bounce' : ''}`} />
                                            <span>{isToday ? 'BUGÜNÜN HEDEFİ' : formatDate(juz.hedefBitisTarihi)}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                            {juz.type === 'custom' && (
                                <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">Sayfa {juz.startPage}-{juz.endPage}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                                {isCompleted ? <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Tamamlandı</span> : <span className="text-foreground/30 flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> {juz.okunanSayfalar.length}/{juz.toplamSayfa} Sayfa</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 relative z-20">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowGrid(!showGrid); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${showGrid ? 'bg-secondary text-white shadow-lg shadow-secondary/20 scale-110' : 'bg-foreground/5 text-foreground/40 hover:bg-foreground/10'}`}>
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(juz); }} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm"><Trash2 className="w-4 h-4" /></button>

                        {!isCompleted && (
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(juz); }} className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/40 hover:bg-secondary hover:text-white transition-all backdrop-blur-sm"><Edit2 className="w-4 h-4" /></button>
                        )}
                        {isCompleted && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUnarchive(juz); }}
                                className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary hover:bg-secondary hover:text-white transition-all backdrop-blur-sm"
                                title="Arşivden Geri Çıkar"
                            >
                                <Clock className="w-4 h-4" />
                            </button>
                        )}
                        {isCompleted && !juz.isArchived && (
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(juz); }} className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all backdrop-blur-sm"><Archive className="w-4 h-4" /></button>
                        )}
                        <div className="w-10 h-10 rounded-full bg-foreground/5 grid place-items-center group-hover:bg-secondary group-hover:text-white transition-all"><ChevronRight className="w-5 h-5" /></div>
                    </div>
                </div>
            </Link>
            <AnimatePresence>
                {showGrid && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-1.5 sm:px-6 pb-4 sm:pb-6 pt-2 bg-foreground/[0.03] border-t border-[var(--border)] space-y-3">
                            <div className="flex items-center justify-between mb-1 px-1">
                                <span className="text-[9px] sm:text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Hızlı Takip</span>
                                <span className="text-[9px] sm:text-[10px] font-bold text-secondary uppercase tracking-widest bg-secondary/10 px-2 py-0.5 rounded-md">S. {juz.okunanSayfalar.length}/{juz.toplamSayfa}</span>
                            </div>
                            <div className="grid grid-cols-4 min-[340px]:grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2">
                                {Array.from({ length: juz.toplamSayfa || 20 }, (_, i) => i + 1).map(page => {
                                    const isRead = juz.okunanSayfalar.includes(page);
                                    return (
                                        <button
                                            key={page}
                                            onClick={(e) => handlePageClick(e, page, isRead)}
                                            className={`aspect-square rounded-xl font-bold text-xs transition-all border flex items-center justify-center shadow-inner relative ${isRead ? 'bg-secondary border-secondary text-white shadow-secondary/20 active:scale-95' : 'bg-foreground/5 border-foreground/10 text-foreground/40 hover:border-foreground/20 hover:bg-foreground/10'} ${selectedPageInfo?.pageNo === page ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background' : ''}`}
                                        >
                                            {loadingInfo && selectedPageInfo?.pageNo === page ? <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl"><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /></div> : page}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedPageInfo && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 p-4 rounded-2xl bg-red-500/5 border-2 border-red-500/20 text-red-500 relative"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Quran Sayfası</div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl font-black tracking-tighter">{selectedPageInfo.absolutePage}</span>
                                                <div className="h-6 w-px bg-red-500/20" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold leading-none mb-1">{selectedPageInfo.surahName} Suresi</span>
                                                    <span className="text-[10px] font-medium opacity-70 uppercase tracking-widest">{selectedPageInfo.verseNo}. Ayet başı</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="sm:text-right border-t sm:border-t-0 border-red-500/10 pt-3 sm:pt-0">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-1">Sayfa Başı</div>
                                            <div className="text-2xl font-mushaf leading-tight" dir="rtl">{selectedPageInfo.snippet}...</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedPageInfo(null)}
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
};

const GroupCard = ({ title, juzs, profile, onDeleteGroup, onDeleteJuz, onCompleteJuz, onEditJuz, onArchiveJuz, onUnarchiveJuz, onTogglePage, onArchiveGroup }: { title: string, juzs: Juz[], profile: any, onDeleteGroup: (n: string, j: Juz[]) => void, onDeleteJuz: (j: Juz) => void, onCompleteJuz: (j: Juz) => void, onEditJuz: (j: Juz) => void, onArchiveJuz: (j: Juz) => void, onUnarchiveJuz: (j: Juz) => void, onTogglePage: (id: string, p: number, r: boolean) => void, onArchiveGroup: (n: string, j: Juz[]) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showAddInGroup, setShowAddInGroup] = useState(false);
    const [showCompletedGrid, setShowCompletedGrid] = useState(false);
    const [showHijriPlanModal, setShowHijriPlanModal] = useState(false);

    const activeJuzs = juzs.filter(j => !j.isArchived);
    const finishedJuzs = juzs.filter(j => j.okunanSayfalar.length >= (j.toplamSayfa || 20));
    const remainingJuzs = juzs.length - finishedJuzs.length;
    const progress = juzs.length > 0 ? Math.round((finishedJuzs.length / juzs.length) * 100) : 0;
    
    const sortedJuzs = [...activeJuzs].sort((a, b) => (a.juzNo || 0) - (b.juzNo || 0));
    const existingJuzNos = juzs.map(j => j.juzNo).filter(n => n !== undefined && n > 0) as number[];
    // Extract all completed juz numbers (both active-completed and archived)
    const completedJuzNos = Array.from(new Set(
        juzs.filter(j => j.juzNo && (j.isArchived || j.okunanSayfalar.length >= (j.toplamSayfa || 20)))
            .map(j => j.juzNo as number)
    )).sort((a, b) => a - b);

    // Group planned juzs by Hijri month (include all pieces, even archived ones, for a complete plan view)
    const plansByMonth = juzs.filter(j => j.hedefBitisTarihi).reduce((acc, j) => {
        const date = j.hedefBitisTarihi.toDate ? j.hedefBitisTarihi.toDate() : new Date(j.hedefBitisTarihi);
        const h = getHijriDate(date, profile?.hijriOffset || 0);
        const monthKey = `${h.monthName} ${h.year}`;
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push({ ...j, hijriDay: h.day, hijriMonth: h.monthName, date });
        return acc;
    }, {} as Record<string, any[]>);
    const onArchiveGroupLocal = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm(`${title} grubundaki 30 cüzün tamamı arşive kaldırılacak. Onaylıyor musunuz?`)) {
            onArchiveGroup(title, juzs);
        }
    };

    return (
        <div className="space-y-2">
            <motion.div layout onClick={() => setIsExpanded(!isExpanded)} className={`glass-card p-3 sm:p-5 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${isExpanded ? 'border-secondary/50 bg-secondary/5' : 'border-[var(--border)] hover:border-foreground/10'}`}>
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner transition-colors shrink-0 ${progress === 100 ? 'bg-green-500/20 text-green-500' : 'bg-secondary/20 text-secondary'}`}>{isExpanded ? <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" /> : <Folder className="w-5 h-5 sm:w-6 sm:h-6" />}</div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-lg text-foreground group-hover:text-secondary transition-colors truncate">{title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[9px] sm:text-xs text-foreground/40 font-medium font-sans truncate">{juzs.length} Parça • %{progress}</p>
                            {remainingJuzs > 0 && (
                                <span className="bg-secondary/10 text-secondary text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">{remainingJuzs} Cüz Kaldı</span>
                            )}
                            {progress === 100 && (
                                <span className="bg-green-500/10 text-green-500 text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Bitti</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        {progress < 100 && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAddInGroup(true); }}
                                className="flex items-center gap-1.5 bg-secondary text-white px-2.5 py-1.5 rounded-xl text-[10px] font-bold hover:opacity-90 transition-all shadow-lg shadow-secondary/20 active:scale-95 z-20 font-sans shrink-0"
                            >
                                <Plus className="w-3 h-3" />
                                <span className="hidden min-[400px]:inline">Ekle</span>
                            </button>
                        )}
                        {progress === 100 && (
                            <button
                                onClick={onArchiveGroupLocal}
                                className="flex items-center gap-1.5 bg-green-500 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-bold hover:opacity-90 transition-all shadow-lg shadow-green-500/20 active:scale-95 z-20 font-sans shrink-0"
                            >
                                <Archive className="w-3 h-3" />
                                <span className="hidden min-[400px]:inline">Arşivle</span>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        {completedJuzNos.length > 0 && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCompletedGrid(!showCompletedGrid); }}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-sm z-20 ${showCompletedGrid ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                                title="Biten Cüzleri Göster"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        )}
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHijriPlanModal(true); }} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-white transition-all backdrop-blur-sm z-20" title="Hicri Planla"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/40 hover:bg-secondary hover:text-white transition-all backdrop-blur-sm z-20"><Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteGroup(title, juzs); }} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm z-20"><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                        <div className={`p-1.5 sm:p-2 rounded-full transition-all ${isExpanded ? 'bg-foreground/10 rotate-180' : 'bg-foreground/5'}`}><ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-foreground/40" /></div>
                    </div>
                </div>
                {isEditing && <EditGroupModal groupName={title} juzs={juzs} onClose={() => setIsEditing(false)} />}
                <AnimatePresence>{showAddInGroup && <AddJuzModal initialGroupName={title} existingJuzs={existingJuzNos} onClose={() => setShowAddInGroup(false)} />}</AnimatePresence>
                <AnimatePresence>{showHijriPlanModal && <HijriGroupPlanModal groupName={title} juzs={juzs} onClose={() => setShowHijriPlanModal(false)} />}</AnimatePresence>
            </motion.div>

            <AnimatePresence>
                {showCompletedGrid && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass-card p-4 rounded-2xl border border-green-500/20 bg-green-500/5 mb-2">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold text-green-600/60 dark:text-green-400/40 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Okunan / Arşivlenen Cüzler
                                </span>
                                <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-md">
                                    {completedJuzNos.length} Cüz Bitti
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {juzs.filter(j => j.isArchived).sort((a, b) => (a.juzNo || 0) - (b.juzNo || 0)).map(j => (
                                    <button
                                        key={j.id}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUnarchiveJuz(j); }}
                                        className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-green-500/20 hover:bg-red-500 transition-colors relative group"
                                        title={`${j.juzNo}. Cüz - Geri Çıkar`}
                                    >
                                        <span className="group-hover:hidden">{j.juzNo}</span>
                                        <Clock className="w-4 h-4 hidden group-hover:block" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pl-1.5 min-[380px]:pl-2.5 sm:pl-4 border-l border-[var(--border)] ml-1 sm:ml-6 py-2 overflow-x-hidden">
                        {juzs.some(j => j.hedefBitisTarihi) && (
                            <div className="glass-card p-3 sm:p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 mb-2">
                                <div className="flex items-center justify-between mb-3 border-b border-amber-500/10 pb-2">
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400/60 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        Grup Planlaması
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    {Object.entries(plansByMonth).map(([month, items]) => (
                                        <div key={month} className="space-y-2 last:mb-0">
                                            <div className="flex items-center gap-2">
                                                <div className="h-px flex-1 bg-amber-500/10" />
                                                <h4 className="text-[9px] font-black text-amber-600/50 uppercase tracking-[0.2em]">{month}</h4>
                                                <div className="h-px flex-1 bg-amber-500/10" />
                                            </div>
                                            <div className="grid grid-cols-3 min-[340px]:grid-cols-4 min-[400px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 sm:gap-1.5">
                                                {items.sort((a, b) => a.date.getTime() - b.date.getTime()).map(item => {
                                                    const isCompleted = item.okunanSayfalar?.length >= (item.toplamSayfa || 20);
                                                    return (
                                                        <div key={item.id} className={`p-1 sm:p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all aspect-square sm:aspect-auto sm:h-12 ${isCompleted ? 'bg-green-500/5 border-green-500/10 opacity-40' : 'bg-background/50 border-amber-500/10 hover:border-amber-500/30'}`}>
                                                            <span className={`text-[10px] font-black leading-none ${isCompleted ? 'text-green-600' : 'text-amber-600'}`}>{item.hijriDay}</span>
                                                            <span className="text-[8px] font-bold text-foreground/40 leading-none truncate w-full text-center px-0.5">{item.title?.replace('Cüz', 'C.').replace('. ', '.') || `${item.juzNo}.C`}</span>
                                                            {isCompleted && (
                                                                <div className="absolute top-0.5 right-0.5">
                                                                    <CheckCircle2 className="w-2 h-2 text-green-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="space-y-2.5">
                            {sortedJuzs.map(juz => <JuzCard key={juz.id} juz={juz} profile={profile} isChild onDelete={onDeleteJuz} onComplete={onCompleteJuz} onEdit={onEditJuz} onArchive={onArchiveJuz} onUnarchive={onUnarchiveJuz} onTogglePage={onTogglePage} />)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function Dashboard() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [juzler, setJuzler] = useState<Juz[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [showPageModal, setShowPageModal] = useState(false);
    const [editingJuz, setEditingJuz] = useState<Juz | null>(null);
    const [targetPage, setTargetPage] = useState('');

    const hijriTarih = getHijriDate(new Date(), profile?.hijriOffset || 0).full;

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'users', user.uid, 'juzler'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Juz));
            setJuzler(docs);
            setLoading(false);
        });
        return unsubscribe;
    }, [user]);

    useEffect(() => {
        const checkAndCreateMonthlyTracker = async () => {
            if (!user || user.email !== 'meoncu@gmail.com') return;
            const now = new Date();
            const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const q = query(collection(db, 'users', user.uid, 'juzler'), where('type', '==', 'monthly_page'), where('startMonth', '==', currentKey));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) return;
            const startYear = 2026;
            const startMonth = 1;
            const basePage = 11;
            const diffMonths = (now.getFullYear() - startYear) * 12 + ((now.getMonth() + 1) - startMonth);
            const targetPage = (((basePage - 1 + diffMonths) % 20) + 20) % 20 + 1;
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            try {
                await addDoc(collection(db, 'users', user.uid, 'juzler'), {
                    type: 'monthly_page',
                    title: `Aylık Hatim - ${now.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}`,
                    startMonth: currentKey,
                    assignedPage: targetPage,
                    monthlyProgress: {},
                    toplamSayfa: 30,
                    okunanSayfalar: [],
                    hedefBitisTarihi: endDate,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    isArchived: false
                });
            } catch (error) { console.error("Auto-create error:", error); }
        };
        checkAndCreateMonthlyTracker();
    }, [user]);

    const [showHatimCompletedModal, setShowHatimCompletedModal] = useState<{ title: string, duration: number } | null>(null);

    const checkFullCompletion = (juz: Juz, allJuzs: Juz[]) => {
        // If it's a 30-unit tracker (monthly/hijri), check its internal progress
        if ((juz.type === 'monthly_page' || juz.type === 'hijri_plan') && juz.okunanSayfalar.length >= 29) { // 29 because the latest just added makes it 30
            const start = juz.baslangicTarihi?.toDate ? juz.baslangicTarihi.toDate() : new Date(juz.baslangicTarihi);
            const end = new Date();
            const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            setShowHatimCompletedModal({ title: juz.title || 'Hatim', duration: days || 1 });
            return;
        }

        // If it's part of a group, check if all members in the group are now finished
        if (juz.groupName) {
            const groupMembers = allJuzs.filter(j => j.groupName === juz.groupName);
            // Count how many will be finished after this update
            const finishedCount = groupMembers.filter(j =>
                j.id === juz.id ? true : (j.okunanSayfalar.length >= (j.toplamSayfa || 20))
            ).length;

            if (finishedCount === groupMembers.length && groupMembers.length > 1) {
                const starts = groupMembers.map(j => j.baslangicTarihi?.toDate ? j.baslangicTarihi.toDate() : new Date(j.baslangicTarihi));
                const start = new Date(Math.min(...starts.map(d => d.getTime())));
                const end = new Date();
                const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                setShowHatimCompletedModal({ title: juz.groupName, duration: days || 1 });
            }
        }
    };

    const handleTogglePage = async (juzId: string, pageNum: number, currentlyRead: boolean) => {
        if (!user) return;
        const juzRef = doc(db, 'users', user.uid, 'juzler', juzId);
        const juz = juzler.find(j => j.id === juzId);
        if (!juz) return;

        try {
            const nextPagesCount = currentlyRead
                ? juz.okunanSayfalar.length - 1
                : juz.okunanSayfalar.length + 1;

            const isFinished = nextPagesCount >= (juz.toplamSayfa || 20);

            // If this toggle completes the juz, check if it also completes the whole hatim/group
            if (!currentlyRead && isFinished) {
                checkFullCompletion(juz, juzler);
            }

            await updateDoc(juzRef, {
                okunanSayfalar: currentlyRead ? arrayRemove(pageNum) : arrayUnion(pageNum),
                durum: isFinished ? 'tamamlandi' : 'devam-ediyor',
                isArchived: isFinished ? true : false,
                completedAt: isFinished ? (juz.completedAt || serverTimestamp()) : null,
                updatedAt: serverTimestamp(),
                isDuaRead: isFinished ? (juz.isDuaRead ?? false) : false
            });
        } catch (error) { console.error("Toggle error:", error); }
    };

    const handleArchive = async (juz: Juz) => {
        if (!user) return;
        if (window.confirm('Bu takibi tamamladınız mı? Onaylarsanız arşive kaldırılacaktır.')) {
            try {
                await updateDoc(doc(db, 'users', user.uid, 'juzler', juz.id), {
                    isArchived: true,
                    durum: 'tamamlandi',
                    updatedAt: serverTimestamp(),
                    completedAt: serverTimestamp(),
                    isDuaRead: false
                });
            } catch (error) { alert("Hata oluştu."); }
        }
    };

    const handleArchiveGroup = async (groupName: string, juzs: Juz[]) => {
        if (!user) return;
        try {
            const batch = writeBatch(db);
            juzs.forEach(juz => {
                const juzRef = doc(db, 'users', user.uid, 'juzler', juz.id);
                batch.update(juzRef, {
                    isArchived: true,
                    durum: 'tamamlandi',
                    updatedAt: serverTimestamp(),
                    completedAt: juz.completedAt || serverTimestamp()
                });
            });
            await batch.commit();
            alert(`${juzs.length} adet cüz başarıyla arşive kaldırıldı.`);
        } catch (error) { 
            console.error("Archive Group Error:", error);
            alert("Arşivlenirken hata oluştu: " + error); 
        }
    };

    const handleUnarchive = async (juz: Juz) => {
        if (!user) return;
        if (window.confirm(`${juz.title || juz.juzNo + '. Cüz'} arşivden geri çıkarılsın mı?`)) {
            try {
                await updateDoc(doc(db, 'users', user.uid, 'juzler', juz.id), {
                    isArchived: false,
                    durum: 'devam-ediyor',
                    updatedAt: serverTimestamp()
                });
            } catch (error) { alert("Hata oluştu."); }
        }
    };

    const handleDelete = async (juz: Juz) => {
        if (!user) return;
        if (window.confirm('Bu takibi tamamen silmek istediğinize emin misiniz?')) {
            try { await deleteDoc(doc(db, 'users', user.uid, 'juzler', juz.id)); }
            catch (error) { alert("Hata oluştu."); }
        }
    };

    const handleDeleteGroup = async (groupName: string, juzs: Juz[]) => {
        if (!user) return;
        if (window.confirm(`"${groupName}" grubundaki tüm parçaları silmek istediğinize emin misiniz?`)) {
            try {
                const batch = writeBatch(db);
                juzs.forEach(juz => batch.delete(doc(db, 'users', user.uid, 'juzler', juz.id)));
                await batch.commit();
            } catch (error) { alert("Hata oluştu."); }
        }
    };

    const handleCompleteJuz = async (juz: Juz) => {
        if (!user) return;
        if (window.confirm(`${juz.title || juz.juzNo + '. Cüz'} tamamlandı olarak işaretlensin mi?`)) {
            try {
                const allPages = Array.from({ length: juz.toplamSayfa || 20 }, (_, i) => i + 1);
                await updateDoc(doc(db, 'users', user.uid, 'juzler', juz.id), {
                    okunanSayfalar: allPages,
                    durum: 'tamamlandi',
                    updatedAt: serverTimestamp(),
                    completedAt: serverTimestamp(),
                    isDuaRead: false
                });
            } catch (error) { alert("Hata oluştu."); }
        }
    };

    const handlePageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(targetPage);
        if (pageNum >= 1 && pageNum <= 604) {
            navigate(`/juz/${Math.ceil(pageNum / 20)}?initialPage=${pageNum}`);
            setShowPageModal(false);
            setTargetPage('');
        } else { alert('Hatalı sayfa numarası.'); }
    };

    const getSurahName = (page: number) => {
        const surah = CHAPTERS.slice().reverse().find(c => c.startPage <= page);
        return surah ? `Sûre-i ${surah.name}` : 'Sûre Bulunamadı';
    };

    const stats = {
        totalRead: juzler.reduce((acc, curr) => acc + curr.okunanSayfalar.length, 0),
        completedCount: juzler.filter(j => j.okunanSayfalar.length >= (j.toplamSayfa || 20)).length,
        activeCount: juzler.filter(j => j.okunanSayfalar.length < (j.toplamSayfa || 20)).length
    };

    // Only show "Hatim Duası" banner for full 30-juz completions or full plan completions
    const itemsNeedingDua = juzler.filter(j => {
        const isFinished = j.okunanSayfalar.length >= (j.toplamSayfa || 20) || j.durum === 'tamamlandi';
        const isDuaNotRead = j.isDuaRead === false;

        // Condition 1: It's a 30-juz plan (Hijri or Monthly) and it's finished
        if ((j.type === 'hijri_plan' || j.type === 'monthly_page') && isFinished && j.okunanSayfalar.length >= 30) {
            return isDuaNotRead;
        }

        // Condition 2: It's a special multi-juz tracker marked as finished
        // We exclude single 'juz' or 'surah' types unless specifically handled
        return false;
    });

    // Check for fully completed groups (where all 30 juz are present and finished)
    const completedGroups = Object.entries(juzler.reduce((acc, juz) => {
        if (!juz.groupName) return acc;
        if (!acc[juz.groupName]) acc[juz.groupName] = [];
        acc[juz.groupName].push(juz);
        return acc;
    }, {} as Record<string, Juz[]>)).filter(([name, groupJuzs]) => {
        const allFinished = groupJuzs.length >= 30 && groupJuzs.every(j => j.okunanSayfalar.length >= (j.toplamSayfa || 20));
        // We would need a custom flag for 'groupDuaRead' but for now we follow the user's 30 cüz check
        return allFinished;
    });

    const lastActiveJuz = juzler
        .filter(j => j.durum === 'devam-ediyor' && j.type !== 'monthly_page')
        .sort((a, b) => ((b as any).updatedAt?.seconds || 0) - ((a as any).updatedAt?.seconds || 0))[0];

    const lastReadPage = lastActiveJuz ? (Math.max(...(lastActiveJuz.okunanSayfalar.length > 0 ? lastActiveJuz.okunanSayfalar : [0])) + 1) : 1;
    const currentGlobalPage = (lastActiveJuz?.startPage || 1) + (lastReadPage - 1);

    // Auto-archive all completed trackers (Individual cüz or whole groups)
    useEffect(() => {
        if (!user || juzler.length === 0) return;

        const checkAndArchiveCompletedItems = async () => {
            const batch = writeBatch(db);
            let hasChanges = false;

            juzler.forEach(juz => {
                // If it's a 20-page cüz or custom range, check if all pages are done
                const isFinished = juz.okunanSayfalar.length >= (juz.toplamSayfa || 20);
                
                if (isFinished && !juz.isArchived) {
                    batch.update(doc(db, 'users', user.uid, 'juzler', juz.id), {
                        isArchived: true,
                        completedAt: juz.completedAt || serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                try {
                    await batch.commit();
                    console.log("Auto-archived finished items.");
                } catch (e) {
                    console.error("Auto-archive error:", e);
                }
            }
        };

        const timer = setTimeout(checkAndArchiveCompletedItems, 2000); // Wait for sync
        return () => clearTimeout(timer);
    }, [user, juzler]);

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-24 pt-4 sm:px-4 px-2">
            <AnimatePresence>
                {showHatimCompletedModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 p-4 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="bg-card glass-card border-2 border-green-500/30 w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative text-center"
                        >
                            <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center text-green-600 mx-auto mb-6 animate-bounce">
                                <Heart className="w-10 h-10 fill-current" />
                            </div>
                            <h2 className="text-3xl font-black text-foreground mb-2">Mübarek Olsun!</h2>
                            <p className="text-foreground/60 font-medium mb-6">
                                <span className="text-green-600 font-bold">{showHatimCompletedModal.title}</span> takibinizi <span className="text-foreground font-bold">{showHatimCompletedModal.duration} günde</span> başarıyla tamamladınız. Rabbim kabul eylesin.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        setShowHatimCompletedModal(null);
                                        navigate('/history');
                                    }}
                                    className="w-full bg-secondary text-white font-bold py-4 rounded-2xl shadow-lg shadow-secondary/20 active:scale-95 transition-all"
                                >
                                    Hatim Geçmişine Git
                                </button>
                                <button
                                    onClick={() => setShowHatimCompletedModal(null)}
                                    className="w-full bg-foreground/5 text-foreground/40 font-bold py-4 rounded-2xl hover:bg-foreground/10 transition-all"
                                >
                                    Kapat
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>{showProfileModal && <ProfileModal user={user} profile={profile} onClose={() => setShowProfileModal(false)} />}</AnimatePresence>

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div onClick={() => setShowProfileModal(true)} className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-foreground/5 border border-[var(--border)] flex items-center justify-center text-foreground/50 hover:bg-foreground/10 hover:text-foreground transition-all cursor-pointer overflow-hidden group shadow-sm shrink-0">
                        {profile?.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <User className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight leading-none mb-1.5 truncate">{hijriTarih}</h1>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-foreground/40 font-sans">
                            <div className="flex items-center gap-1 shrink-0"><CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-secondary" /> {stats.completedCount} BİTTİ</div>
                            <div className="flex items-center gap-1 shrink-0"><BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-secondary" /> {stats.totalRead} SAYFA</div>
                            <div className="flex items-center gap-1 shrink-0"><TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-secondary" /> {stats.activeCount} AKTİF</div>
                        </div>
                    </div>
                </div>
                <button onClick={() => setShowProfileModal(true)} className="p-2.5 sm:p-3 bg-foreground/5 hover:bg-foreground/10 rounded-2xl text-foreground/40 hover:text-foreground transition-all border border-[var(--border)] group shadow-sm ml-2 shrink-0"><Settings className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-45 transition-transform" /></button>
            </div>

            {profile?.showInstallBanner !== false && <InstallPWA />}
            {profile?.showPrayerTimes !== false && <PrayerTimes city={profile?.city || 'Ankara'} />}

            <AnimatePresence>
                {itemsNeedingDua.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="overflow-hidden"
                    >
                        <Link to="/history" className="glass-card mb-4 p-5 rounded-[32px] border-2 border-amber-500/30 bg-amber-500/5 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 animate-pulse">
                                    <Heart className="w-6 h-6 fill-current" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-foreground leading-tight">Hatim Duası Bekliyor</h3>
                                    <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mt-0.5">
                                        {itemsNeedingDua.length} adet tamamlanmış takibiniz için dua okunması gerekiyor
                                    </p>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 grid place-items-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPageModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card glass-card border-[var(--border)] w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
                            <button onClick={() => setShowPageModal(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-foreground/5 grid place-items-center text-foreground/40 hover:text-foreground hover:bg-foreground/10"><X className="w-4 h-4" /></button>
                            <div className="text-center space-y-4 pt-2">
                                <Search className="w-12 h-12 text-secondary mx-auto" />
                                <h3 className="text-xl font-bold text-foreground">Sayfaya Git</h3>
                                <form onSubmit={handlePageSubmit} className="space-y-4">
                                    <input type="number" placeholder="Sayfa No" value={targetPage} onChange={(e) => setTargetPage(e.target.value)} className="w-full bg-foreground/5 border border-[var(--border)] rounded-xl px-4 py-4 text-center text-2xl font-bold text-foreground focus:outline-none focus:border-secondary" autoFocus />
                                    <button type="submit" className="w-full bg-secondary text-white font-bold py-4 rounded-xl shadow-lg shadow-secondary/20">Git</button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showModal && (
                    <AddJuzModal
                        onClose={() => setShowModal(false)}
                        existingJuzs={juzler.filter(j => j.juzNo > 0).map(j => j.juzNo)}
                    />
                )}
            </AnimatePresence>
            {editingJuz && <EditJuzModal juz={editingJuz} onClose={() => setEditingJuz(null)} />}

            {profile?.showResumeReading !== false && lastActiveJuz && (
                <div className="bg-secondary rounded-3xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden group">
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><BookOpen className="text-white w-6 h-6" /></div>
                        <div>
                            <h2 className="text-white font-bold text-lg">{getSurahName(currentGlobalPage)}</h2>
                            <p className="text-white/70 text-xs font-medium font-sans">Sayfa {lastReadPage} (Cüz {lastActiveJuz.juzNo})</p>
                        </div>
                    </div>
                    <Link to={`/juz/${lastActiveJuz.id}`} className="relative z-10 bg-white text-secondary px-4 py-2 rounded-xl text-xs font-bold font-sans">Okumaya Devam Et</Link>
                </div>
            )}

            <div className="flex items-center justify-between px-2 pt-4">
                <h2 className="text-lg font-bold text-foreground">Okuma Takibi</h2>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 text-secondary font-bold text-xs bg-secondary/10 px-3 py-1.5 rounded-lg hover:bg-secondary/20 transition-all"><Plus className="w-4 h-4" /> Yeni Ekle</button>
            </div>

            <main className="space-y-3">
                {loading ? <div className="grid gap-4"><div className="glass-card h-32 rounded-3xl animate-pulse" /></div> :
                    juzler.length === 0 ? <div className="text-center py-16 glass-card rounded-[40px] border-[var(--border)]"><BookOpen className="w-16 h-16 text-foreground/5 mx-auto mb-6" /><h3 className="text-foreground/40 font-sans">Henüz cüz eklenmemiş</h3></div> :
                        <div className="grid gap-4">
                            {Object.entries(juzler.reduce((acc, juz) => {
                                let key = juz.groupName || 'ungrouped';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(juz);
                                return acc;
                            }, {} as Record<string, Juz[]>)).sort((a, b) => a[0] === 'ungrouped' ? 1 : b[0] === 'ungrouped' ? -1 : 0).map(([groupName, groupJuzs]) => (
                                groupName === 'ungrouped'
                                    ? groupJuzs.filter(j => !j.isArchived).map(juz => <JuzCard key={juz.id} juz={juz} profile={profile} onDelete={handleDelete} onComplete={handleCompleteJuz} onEdit={setEditingJuz} onArchive={handleArchive} onUnarchive={handleUnarchive} onTogglePage={handleTogglePage} />)
                                    : <GroupCard key={groupName} title={groupName} juzs={groupJuzs} profile={profile} onDeleteGroup={handleDeleteGroup} onDeleteJuz={handleDelete} onCompleteJuz={handleCompleteJuz} onEditJuz={setEditingJuz} onArchiveJuz={handleArchive} onUnarchiveJuz={handleUnarchive} onTogglePage={handleTogglePage} onArchiveGroup={handleArchiveGroup} />
                            ))}
                        </div>
                }
            </main>

            <div className="grid grid-cols-2 gap-4">
                <Link to="/juzs" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-foreground/5 transition-all h-40"><BookOpen className="w-8 h-8 text-secondary" /><span className="text-foreground font-medium text-sm">Cüz İndeksi</span></Link>
                <Link to="/surahs" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-foreground/5 transition-all h-40 text-center"><svg className="w-8 h-8 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L4 7v13h16V7l-8-5z" /><path d="M10 20v-6h4v6" /></svg><span className="text-foreground font-medium text-sm">Sure İndeksi</span></Link>
                <button onClick={() => setShowPageModal(true)} className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-foreground/5 h-40 text-foreground font-medium text-sm transition-all"><Search className="w-8 h-8 text-secondary" />Sayfaya Git</button>
                <Link to="/bookmarks" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-foreground/5 h-40 transition-all"><div className="w-8 h-8 text-secondary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg></div><span className="text-foreground font-medium text-sm">Yer İmleri</span></Link>
                <Link to="/history" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-foreground/5 h-40 transition-all"><div className="w-8 h-8 text-secondary"><CheckCircle2 className="w-8 h-8" /></div><span className="text-foreground font-medium text-sm">Geçmiş & İcmal</span></Link>
            </div>
        </div>
    );
}
