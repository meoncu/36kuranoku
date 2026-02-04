import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Juz } from '../types';
import { Plus, BookOpen, Clock, ChevronRight, CheckCircle2, TrendingUp, X, Search, Calendar, AlertTriangle, User, StickyNote, Edit2, Archive } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AddJuzModal from '../components/AddJuzModal';
import EditJuzModal from '../components/EditJuzModal';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAPTERS } from '../constants/chapters';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [juzler, setJuzler] = useState<Juz[]>([]);
    const [showModal, setShowModal] = useState(false);
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
    const startPageOfJuz = lastActiveJuz ? (lastActiveJuz.juzNo === 1 ? 1 : ((lastActiveJuz.juzNo - 1) * 20) + 2) : 1;
    const currentGlobalPage = startPageOfJuz + (lastActiveJuz ? Math.min(lastReadPage - 1, 19) : 0);

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
                    updatedAt: serverTimestamp() // Import serverTimestamp if needed, but keeping simple for now or assuming it is imported
                });
            } catch (error) {
                console.error("Error archiving:", error);
                alert("Arşivlenirken bir hata oluştu.");
            }
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-24">
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
            {lastActiveJuz && (
                <div className="bg-[#C59E57] rounded-3xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden group">
                    {/* Background Pattern */}
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
                        {/* Simple Mosque Icon representation */}
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

            {/* Existing Header Stats (Condensed) */}
            <div className="flex items-center justify-between px-2 pt-4">
                <h2 className="text-lg font-bold text-white">Okuma Takibi</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 text-[#C59E57] font-bold text-xs bg-[#C59E57]/10 px-3 py-1.5 rounded-lg hover:bg-[#C59E57]/20 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Yeni Ekle
                </button>
            </div>

            {/* List of Juzlar */}
            <main className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">Aktif Cüzlerin</h2>
                    <span className="text-[10px] text-white/30 font-bold">{stats.activeCount} Cüz</span>
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
                        {juzler.map((juz, index) => {
                            // Special Handling for Monthly Page Tracker
                            if (juz.type === 'monthly_page') {
                                const now = new Date();
                                const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                const completedCount = juz.monthlyProgress?.[currentKey]?.length || 0;
                                const progress = (completedCount / 30) * 100;

                                // Calculate Target Page
                                const [startYear, startMonth] = (juz.startMonth || currentKey).split('-').map(Number);
                                const diffMonths = (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth);
                                const basePage = juz.assignedPage || 1;
                                const targetPage = ((basePage - 1 + diffMonths) % 20) + 1;

                                return (
                                    <motion.div
                                        key={juz.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Link
                                            to={`/juz/monthly/${juz.id}`}
                                            className="glass-card p-6 rounded-[32px] block hover:bg-white/[0.08] transition-all group border-white/5 relative overflow-hidden"
                                        >
                                            <div
                                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C59E57]/10 to-[#C59E57]/30 transition-all duration-1000 border-r border-[#C59E57]/20"
                                                style={{ width: `${progress}%` }}
                                            />

                                            {/* Content */}
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
                                                            {/* Dynamic Target Label */}
                                                            <span className="text-white/60 text-xs font-medium">
                                                                {now.toLocaleString('tr-TR', { month: 'long' })} Hedefi:
                                                            </span>
                                                            <span className="bg-white/10 px-2 py-0.5 rounded text-white text-xs font-bold">{targetPage}. Sayfalar</span>
                                                        </div>

                                                        {/* Start Date Info */}
                                                        {juz.startMonth && (
                                                            <div className="text-white/30 text-[10px] mt-1 font-medium">
                                                                Başlangıç: {new Date(juz.startMonth).toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
                                                            </div>
                                                        )}

                                                        <div className="text-[#C59E57] text-xs font-bold mt-2">
                                                            {completedCount} / 30 Cüz Okundu
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 pl-2">
                                                    <div className="w-10 h-10 rounded-full bg-white/5 grid place-items-center group-hover:bg-primary group-hover:text-white transition-all">
                                                        <ChevronRight className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            }

                            const progress = (juz.okunanSayfalar.length / juz.toplamSayfa) * 100;
                            const isCompleted = juz.okunanSayfalar.length >= juz.toplamSayfa;
                            const remainingDays = juz.hedefBitisTarihi
                                ? Math.ceil((juz.hedefBitisTarihi.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                : null;

                            return (
                                <motion.div
                                    key={juz.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link
                                        to={`/juz/${juz.id}`}
                                        className="glass-card p-6 rounded-[32px] block hover:bg-white/[0.08] transition-all group border-white/5 relative overflow-hidden"
                                    >
                                        <div
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C59E57]/10 to-[#C59E57]/30 transition-all duration-1000 border-r border-[#C59E57]/20"
                                            style={{ width: `${progress}%` }}
                                        />

                                        {/* Large Percentage Background - Positioned to left of buttons */}
                                        <div className="absolute right-28 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
                                            <span className="text-5xl font-black text-white/10 tracking-tighter">
                                                %{Math.round(progress)}
                                            </span>
                                        </div>

                                        <div className="relative z-10 flex items-center justify-between">

                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 grid place-items-center relative">
                                                    <span className="font-bold text-xl text-white">{juz.juzNo}</span>
                                                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                                                        <circle
                                                            cx="28" cy="28" r="24"
                                                            fill="transparent"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            className="text-white/5"
                                                        />
                                                        <circle
                                                            cx="28" cy="28" r="24"
                                                            fill="transparent"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeDasharray={150}
                                                            strokeDashoffset={150 - (150 * progress) / 100}
                                                            className="text-primary"
                                                        />
                                                    </svg>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex flex-col gap-1">
                                                            <h3 className="font-bold text-lg text-white">
                                                                {juz.title ? juz.title : `${juz.juzNo}. Cüz`}
                                                            </h3>
                                                            {(juz.assignedBy || juz.notes) && (
                                                                <div className="flex items-center gap-2 text-[10px] text-white/40">
                                                                    {juz.assignedBy && (
                                                                        <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded">
                                                                            <User className="w-3 h-3" /> {juz.assignedBy}
                                                                        </span>
                                                                    )}
                                                                    {juz.notes && (
                                                                        <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded" title={juz.notes}>
                                                                            <StickyNote className="w-3 h-3" /> Not
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider mt-1">
                                                            {isCompleted ? (
                                                                <span className="text-green-400 flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3 h-3" /> Tamamlandı
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    <span className="bg-white/5 text-white/70 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                                                        <BookOpen className="w-3 h-3" /> {juz.okunanSayfalar.length}/{juz.toplamSayfa} Sayfa
                                                                    </span>
                                                                    {remainingDays !== null && (
                                                                        <span className={`${remainingDays <= 3 ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'} px-2 py-1 rounded-lg flex items-center gap-1.5`}>
                                                                            <Clock className="w-3 h-3" /> {remainingDays > 0 ? `${remainingDays} GÜN KALDI` : 'SÜRE DOLDU'}
                                                                        </span>
                                                                    )}
                                                                    {remainingDays !== null && remainingDays > 0 && !isCompleted && (
                                                                        <span className="text-[#C59E57] flex items-center gap-1 bg-[#C59E57]/10 px-2 py-0.5 rounded-full">
                                                                            <TrendingUp className="w-3 h-3" />
                                                                            GÜNDE {Math.ceil((juz.toplamSayfa - juz.okunanSayfalar.length) / remainingDays)} SAYFA
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pl-2">
                                                {isCompleted ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleArchive(juz);
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all backdrop-blur-sm z-20"
                                                        title="Tamamla ve Arşivle"
                                                    >
                                                        <Archive className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setEditingJuz(juz);
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-[#C59E57] hover:text-white transition-all backdrop-blur-sm group/edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
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
                        })}
                    </div>
                )
                }
            </main >
        </div >
    );
}
