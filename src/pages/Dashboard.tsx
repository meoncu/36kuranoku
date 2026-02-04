import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { Plus, BookOpen, Clock, ChevronRight, CheckCircle2, TrendingUp, X, Search, Calendar, AlertTriangle, User, StickyNote, Edit2, Archive, Trash2, Folder, FolderOpen, ChevronDown, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AddJuzModal from '../components/AddJuzModal';
import EditJuzModal from '../components/EditJuzModal';
import ProfileModal from '../components/ProfileModal';
import PrayerTimes from '../components/PrayerTimes';
import InstallPWA from '../components/InstallPWA';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAPTERS } from '../constants/chapters';

export default function Dashboard() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [juzler, setJuzler] = useState<Juz[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Page Navigation State
    const [showPageModal, setShowPageModal] = useState(false);
    const [editingJuz, setEditingJuz] = useState<Juz | null>(null);
    const [targetPage, setTargetPage] = useState('');

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'users', user.uid, 'juzler'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Juz));
            // Filter out archived juzs
            setJuzler(docs.filter(j => !j.isArchived));
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    // Auto-create Monthly Tracker for Admin
    useEffect(() => {
        const checkAndCreateMonthlyTracker = async () => {
            if (!user || user.email !== 'meoncu@gmail.com') return;

            const now = new Date();
            const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Check if tracker already exists (even if archived)
            const q = query(
                collection(db, 'users', user.uid, 'juzler'),
                where('type', '==', 'monthly_page'),
                where('startMonth', '==', currentKey)
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) return; // Already exists

            // Create new tracker
            const startYear = 2026;
            const startMonth = 1; // Jan
            const basePage = 11;

            const diffMonths = (now.getFullYear() - startYear) * 12 + ((now.getMonth() + 1) - startMonth);
            const targetPage = (((basePage - 1 + diffMonths) % 20) + 20) % 20 + 1;

            // Calculate end of month
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
                console.log("Auto-created monthly tracker for", currentKey);
            } catch (error) {
                console.error("Auto-create error:", error);
            }
        };

        checkAndCreateMonthlyTracker();
    }, [user]);

    const stats = {
        totalRead: juzler.reduce((acc, curr) => acc + curr.okunanSayfalar.length, 0),
        completedCount: juzler.filter(j => j.okunanSayfalar.length >= j.toplamSayfa).length,
        activeCount: juzler.filter(j => j.okunanSayfalar.length < j.toplamSayfa).length
    };

    const lastActiveJuz = juzler
        .filter(j => j.durum === 'devam-ediyor' && j.type !== 'monthly_page')
        .sort((a, b) => {
            const timeA = (a as any).updatedAt?.seconds || a.createdAt?.seconds || 0;
            const timeB = (b as any).updatedAt?.seconds || b.createdAt?.seconds || 0;
            return timeB - timeA;
        })[0];
    const lastReadPage = lastActiveJuz ? (Math.max(...(lastActiveJuz.okunanSayfalar.length > 0 ? lastActiveJuz.okunanSayfalar : [0])) + 1) : 1;
    // Calculate global page number for generic reader
    const startPageOfJuz = lastActiveJuz
        ? (lastActiveJuz.startPage || (lastActiveJuz.juzNo === 1 ? 1 : ((lastActiveJuz.juzNo - 1) * 20) + 2))
        : 1;
    const currentGlobalPage = startPageOfJuz + (lastActiveJuz ? Math.min(lastReadPage - 1, (lastActiveJuz.toplamSayfa || 20) - 1) : 0);

    // Find Surah Name
    const getSurahName = (page: number) => {
        const surah = CHAPTERS.slice().reverse().find(c => c.startPage <= page);
        return surah ? `Sûre-i ${surah.name}` : 'Sûre Bulunamadı';
    };

    const handlePageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(targetPage);
        if (pageNum >= 1 && pageNum <= 604) {
            const juzId = Math.ceil(pageNum / 20);
            navigate(`/juz/${juzId}?initialPage=${pageNum}`);
            setShowPageModal(false);
            setTargetPage('');
        } else {
            alert('Lütfen 1 ile 604 arasında bir sayfa numarası giriniz.');
        }
    };

    const handleArchive = async (juz: Juz) => {
        if (!user) return;
        if (window.confirm('Bu takibi tamamladınız mı? Onaylarsanız arşive kaldırılacaktır.')) {
            try {
                await updateDoc(doc(db, 'users', user.uid, 'juzler', juz.id), {
                    isArchived: true,
                    durum: 'tamamlandi',
                    updatedAt: serverTimestamp()
                });
            } catch (error) {
                console.error("Error archiving:", error);
                alert("Arşivlenirken bir hata oluştu.");
            }
        }
    };

    const handleDelete = async (juz: Juz) => {
        if (!user) return;
        if (window.confirm('Bu takibi tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
            try {
                await deleteDoc(doc(db, 'users', user.uid, 'juzler', juz.id));
            } catch (error) {
                console.error("Error deleting:", error);
                alert("Silinirken bir hata oluştu.");
            }
        }
    };

    // --- Components for Grouping ---

    const GroupCard = ({ title, juzs }: { title: string, juzs: Juz[] }) => {
        const [isExpanded, setIsExpanded] = useState(false);

        // Use Navigate inside component
        const navigate = useNavigate();

        // Calculate Stats
        const totalPages = juzs.reduce((acc, j) => acc + j.toplamSayfa, 0);
        const readPages = juzs.reduce((acc, j) => acc + j.okunanSayfalar.length, 0);
        const progress = totalPages > 0 ? Math.round((readPages / totalPages) * 100) : 0;

        // Sort juzs by juzNo
        const sortedJuzs = [...juzs].sort((a, b) => (a.juzNo || 0) - (b.juzNo || 0));

        return (
            <div className="space-y-2">
                <motion.div
                    layout
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`glass-card p-5 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${isExpanded ? 'border-[#C59E57]/50 bg-[#C59E57]/5' : 'border-white/5 hover:border-white/10'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner transition-colors ${progress === 100 ? 'bg-green-500/20 text-green-500' : 'bg-[#C59E57]/20 text-[#C59E57]'}`}>
                            {isExpanded ? <FolderOpen className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white group-hover:text-[#C59E57] transition-colors">{title}</h3>
                            <p className="text-xs text-white/40 font-medium">
                                {juzs.length} Parça • %{progress} Tamamlandı
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <span className="text-xs text-white/30 font-mono block">{readPages} / {totalPages} Sayfa</span>
                            <div className="w-24 h-1.5 bg-black/20 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-[#C59E57]" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                        <div className={`p-2 rounded-full transition-all ${isExpanded ? 'bg-white/10 rotate-180' : 'bg-white/5'}`}>
                            <ChevronDown className="w-5 h-5 text-white/50" />
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 pl-4 border-l-2 border-white/5 ml-6 py-2"
                        >
                            {sortedJuzs.map(juz => (
                                <JuzCard key={juz.id} juz={juz} isChild />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const JuzCard = ({ juz, isChild = false }: { juz: Juz, isChild?: boolean }) => {
        const navigate = useNavigate(); // Hook must be used inside component

        // Special Render for Monthly
        if (juz.type === 'monthly_page') {
            const now = new Date();
            const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const completedCount = juz.monthlyProgress?.[currentKey]?.length || 0;
            const progress = (completedCount / 30) * 100;

            const [startYear, startMonth] = (juz.startMonth || currentKey).split('-').map(Number);
            const diffMonths = (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth);
            const basePage = juz.assignedPage || 1;

            // If Single Month, target is always base page. Else, calculate offset.
            const targetPage = juz.isSingleMonth
                ? basePage
                : (((basePage - 1 + diffMonths) % 20) + 20) % 20 + 1;

            return (
                <motion.div layout>
                    <Link
                        to={`/juz/monthly/${juz.id}`}
                        className={`glass-card p-6 rounded-[32px] block hover:bg-white/[0.08] transition-all group border-white/5 relative overflow-hidden ${isChild ? 'bg-black/20' : ''}`}
                    >
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C59E57]/10 to-[#C59E57]/30 transition-all duration-1000 border-r border-[#C59E57]/20"
                            style={{ width: `${progress}%` }}
                        />
                        {/* Large Percentage Background */}
                        <div className="absolute right-40 sm:right-44 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
                            <span className="text-5xl font-black text-white/10 tracking-tighter">
                                %{Math.round(progress)}
                            </span>
                        </div>

                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#C59E57]/20 flex items-center justify-center text-[#C59E57]">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-white font-bold text-lg">{juz.title}</h3>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-white/60 text-xs font-medium">
                                            {now.toLocaleString('tr-TR', { month: 'long' })} Hedefi:
                                        </span>
                                        <span className="bg-white/10 px-2 py-0.5 rounded text-white text-xs font-bold">{targetPage}. Sayfalar</span>
                                    </div>
                                    <div className="text-white/30 text-[10px] mt-1 font-medium flex gap-2">
                                        <span>Başlangıç: {basePage}. Sayfa</span>
                                        <span>•</span>
                                        <span>{new Date(juz.startMonth || currentKey).toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pl-2">
                                {/* Delete Button */}
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(juz); }}
                                    className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm z-20"
                                    title="Sil"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-white/5 grid place-items-center group-hover:bg-primary group-hover:text-white transition-all">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            )
        }

        // Standard or Surah Tracker
        const progress = juz.toplamSayfa > 0 ? (juz.okunanSayfalar.length / juz.toplamSayfa) * 100 : 0;
        const isCompleted = juz.okunanSayfalar.length >= juz.toplamSayfa;

        return (
            <motion.div layout>
                <Link
                    to={`/juz/${juz.id}`}
                    className={`glass-card p-6 rounded-[32px] block hover:bg-white/[0.08] transition-all group border-white/5 relative overflow-hidden ${isChild ? 'bg-black/20' : ''}`}
                >
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C59E57]/10 to-[#C59E57]/30 transition-all duration-1000 border-r border-[#C59E57]/20"
                        style={{ width: `${progress}%` }}
                    />

                    {/* Large Percentage Background */}
                    <div className="absolute right-40 sm:right-44 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
                        <span className="text-5xl font-black text-white/10 tracking-tighter">
                            %{Math.round(progress)}
                        </span>
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl bg-white/5 grid place-items-center relative ${isChild ? 'scale-90' : ''}`}>
                                <span className="font-bold text-xl text-white">
                                    {juz.type === 'surah' ? <BookOpen className="w-6 h-6" /> : juz.juzNo}
                                </span>
                                {juz.type !== 'surah' && (
                                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                                        <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="2" className="text-white/5" />
                                        <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="2" strokeDasharray={150} strokeDashoffset={150 - (150 * progress) / 100} className="text-primary" />
                                    </svg>
                                )}
                            </div>

                            <div className="space-y-1">
                                <h3 className="font-bold text-lg text-white">
                                    {juz.title ? juz.title : `${juz.juzNo}. Cüz`}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider mt-1">
                                    {isCompleted ? (
                                        <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Tamamlandı</span>
                                    ) : (
                                        <span className="bg-white/5 text-white/70 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                            <BookOpen className="w-3 h-3" /> {juz.okunanSayfalar.length}/{juz.toplamSayfa} Sayfa
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pl-2">
                            {/* Delete Button */}
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(juz); }}
                                className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm z-20"
                                title="Sil"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {!isCompleted && (
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingJuz(juz); }}
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-[#C59E57] hover:text-white transition-all backdrop-blur-sm group/edit z-20"
                                    title="Düzenle"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            )}

                            {isCompleted && (
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleArchive(juz); }}
                                    className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all backdrop-blur-sm z-20"
                                    title="Arşivle"
                                >
                                    <Archive className="w-4 h-4" />
                                </button>
                            )}

                            <div className="w-10 h-10 rounded-full bg-white/5 grid place-items-center group-hover:bg-primary group-hover:text-white transition-all">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </Link>
            </motion.div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-24 pt-4 px-4">
            {/* Profile Settings Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <ProfileModal
                        user={user}
                        profile={profile}
                        onClose={() => setShowProfileModal(false)}
                    />
                )}
            </AnimatePresence>

            {/* Header / User Profile */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div
                        onClick={() => setShowProfileModal(true)}
                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all cursor-pointer overflow-hidden group"
                    >
                        {profile?.photoURL ? (
                            <img src={profile.photoURL} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        ) : (
                            <User className="w-5 h-5" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-tight">
                            Merhaba, {profile?.displayName?.split(' ')[0] || 'Kullanıcı'}
                        </h1>
                        <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Bugün ne okuyoruz?</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowProfileModal(true)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5 group"
                >
                    <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                </button>
            </div>

            {/* PWA Install Banner */}
            <InstallPWA />

            {/* Prayer Times Section */}
            {profile?.showPrayerTimes !== false && (
                <PrayerTimes city={profile?.city || 'Ankara'} />
            )}

            {/* Page Navigation Modal */}
            <AnimatePresence>
                {showPageModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setShowPageModal(false)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 grid place-items-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex flex-col items-center gap-6 pt-2">
                                <div className="w-16 h-16 bg-[#C59E57]/10 rounded-2xl grid place-items-center text-[#C59E57]">
                                    <Search className="w-8 h-8" />
                                </div>

                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-bold text-white">Sayfaya Git</h3>
                                    <p className="text-white/40 text-sm">Gitmek istediğin sayfa numarasını gir</p>
                                    {targetPage && Number(targetPage) >= 1 && Number(targetPage) <= 604 && (
                                        <div className="mt-2 bg-primary/10 py-1.5 px-3 rounded-lg border border-primary/20 inline-flex items-center gap-2">
                                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-primary font-bold text-xs">
                                                {getSurahName(Number(targetPage))}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handlePageSubmit} className="w-full space-y-4">
                                    <input
                                        type="number"
                                        placeholder="Örn: 35"
                                        value={targetPage}
                                        onChange={(e) => setTargetPage(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-[#C59E57] transition-colors"
                                        autoFocus
                                        min="1"
                                        max="604"
                                    />
                                    <button
                                        type="submit"
                                        className="w-full bg-[#C59E57] text-white font-bold py-4 rounded-xl hover:bg-[#b08d4b] transition-all active:scale-95"
                                    >
                                        Git
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showModal && (
                    <AddJuzModal onClose={() => setShowModal(false)} />
                )}
            </AnimatePresence>

            {editingJuz && (
                <EditJuzModal
                    juz={editingJuz}
                    onClose={() => setEditingJuz(null)}
                />
            )}

            {/* Resume Reading Banner */}
            {profile?.showResumeReading !== false && lastActiveJuz && (
                <div className="bg-[#C59E57] rounded-3xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-all" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <BookOpen className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">{getSurahName(currentGlobalPage)}</h2>
                            <p className="text-white/70 text-xs font-medium">Sayfa {lastReadPage} (Cüz {lastActiveJuz.juzNo})</p>
                        </div>
                    </div>
                    <Link
                        to={`/juz/${lastActiveJuz.id}`}
                        className="relative z-10 bg-white text-[#C59E57] px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-white/90 transition-colors"
                    >
                        Okumaya Devam Et
                    </Link>
                </div>
            )}

            {/* Main Navigation Grid */}
            <div className="grid grid-cols-2 gap-4">
                <Link to="/juzs" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all text-center group h-40">
                    <BookOpen className="w-8 h-8 text-[#C59E57] group-hover:scale-110 transition-transform" />
                    <span className="text-white font-medium text-sm">Cüz İndeksi</span>
                </Link>

                <Link to="/surahs" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all text-center group h-40 relative">
                    <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">YENİ</span>
                    <div className="w-8 h-8 text-[#C59E57] group-hover:scale-110 transition-transform">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L4 7v13h16V7l-8-5z" />
                            <path d="M10 20v-6h4v6" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-white font-medium text-sm block">Sure İndeksi</span>
                        <span className="text-white/40 text-[10px] block">( Sesli Dinle )</span>
                    </div>
                </Link>

                <button
                    onClick={() => setShowPageModal(true)}
                    className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all text-center group h-40"
                >
                    <div className="w-8 h-8 text-[#C59E57] group-hover:scale-110 transition-transform">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                            <path d="M16 13H8" />
                            <path d="M16 17H8" />
                            <path d="M10 9H8" />
                        </svg>
                    </div>
                    <span className="text-white font-medium text-sm">Sayfaya Git</span>
                </button>

                <Link to="/bookmarks" className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all text-center group h-40">
                    <div className="w-8 h-8 text-[#C59E57] group-hover:scale-110 transition-transform">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <span className="text-white font-medium text-sm">Yer İmleri</span>
                </Link>
            </div>

            {/* Header Stats */}
            <div className="flex items-center justify-between px-2 pt-4">
                <h2 className="text-lg font-bold text-white">Okuma Takibi</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 text-[#C59E57] font-bold text-xs bg-[#C59E57]/10 px-3 py-1.5 rounded-lg hover:bg-[#C59E57]/20 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Yeni Ekle
                </button>
            </div>

            {/* List of Juzlar / Groups */}
            <main className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">Aktif Cüzlerin</h2>
                    <span className="text-xs text-white/30 font-bold">{stats.activeCount} Cüz</span>
                </div>

                {loading ? (
                    <div className="grid gap-4">
                        {[1, 2].map(i => <div key={i} className="glass-card h-32 rounded-3xl animate-pulse" />)}
                    </div>
                ) : juzler.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 glass-card rounded-[40px] border-dashed bg-white/[0.02]"
                    >
                        <BookOpen className="w-16 h-16 text-white/5 mx-auto mb-6" />
                        <h3 className="text-lg font-medium text-white/60">Henüz cüz eklenmemiş</h3>
                        <p className="text-white/30 text-xs px-10 mt-2">Takip etmek istediğin cüzleri artı butonuna basarak ekleyebilirsin.</p>
                        <button onClick={() => setShowModal(true)} className="mt-8 text-primary font-bold text-sm bg-primary/10 px-6 py-3 rounded-2xl hover:bg-primary/20 transition-all">
                            İlk Cüzü Ekle
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid gap-4">
                        {/* Grouping Logic Implementation */}
                        {Object.entries(
                            juzler.reduce((acc, juz) => {
                                // Default Group
                                let key = 'ungrouped';

                                // Priority 1: Explicit Group Name (New Logic)
                                if (juz.groupName) {
                                    key = juz.groupName;
                                }
                                // Priority 2: Regex Matching (Legacy/Fallback Logic)
                                else {
                                    // Regex: Matches "Text (1. Cüz)" or "Text (12. Cüz)" etc.
                                    // Capture group 1 is the Title part.
                                    const title = juz.title || '';
                                    const match = title.match(/(.+?)\s*\(\d+\.\s*Cüz\)/i);

                                    if (juz.type === 'juz' && match) {
                                        key = match[1].trim();
                                    }
                                }

                                if (!acc[key]) acc[key] = [];
                                acc[key].push(juz);
                                return acc;
                            }, {} as Record<string, Juz[]>)
                        ).sort((a, b) => {
                            // Sort Ungrouped last
                            if (a[0] === 'ungrouped') return 1;
                            if (b[0] === 'ungrouped') return -1;
                            return 0;
                        }).map(([groupName, groupJuzs]) => {
                            if (groupName === 'ungrouped') {
                                return groupJuzs.map(juz => (
                                    <JuzCard key={juz.id} juz={juz} />
                                ));
                            }
                            return (
                                <GroupCard key={groupName} title={groupName} juzs={groupJuzs} />
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
