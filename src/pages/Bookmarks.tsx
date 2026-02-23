import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { ChevronLeft, Bookmark, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookmarkItem {
    id: string;
    type: 'verse' | 'page';
    verseKey?: string; // e.g., "2:255"
    surahName?: string;
    verseNumber?: number;
    pageNumber: number;
    textPreview?: string;
    note?: string;
    createdAt: any;
}

export default function Bookmarks() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'users', user.uid, 'bookmarks'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookmarkItem));
            setBookmarks(docs);
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !confirm('Bu yer imini silmek istediğinize emin misiniz?')) return;

        try {
            await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', id));
        } catch (error) {
            console.error("Error deleting bookmark:", error);
        }
    };

    const handleNavigate = (b: BookmarkItem) => {
        // Navigate to Reader with specific page and optionally highlight verse
        // Adding a query param for highlight could be a nice touch later
        navigate(`/juz/${Math.ceil(b.pageNumber / 20)}?initialPage=${b.pageNumber}`);
    };

    return (
        <div className="max-w-2xl mx-auto pb-24 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 pt-4 px-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full glass-card grid place-items-center text-foreground/70 hover:text-foreground hover:bg-foreground/10 transition-all border border-[var(--border)]"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Yer İmleri</h1>
                    <p className="text-foreground/40 text-xs font-sans">{bookmarks.length} Kayıtlı Not</p>
                </div>
            </div>

            {/* Bookmarks List */}
            <div className="px-4 space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-foreground/40 text-sm font-sans">Yükleniyor...</p>
                    </div>
                ) : bookmarks.length === 0 ? (
                    <div className="text-center py-16 glass-card rounded-[40px] border-dashed border-[var(--border)] bg-foreground/[0.02]">
                        <Bookmark className="w-16 h-16 text-foreground/5 mx-auto mb-6" />
                        <h3 className="text-lg font-medium text-foreground/60 font-sans">Henüz yer imi yok</h3>
                        <p className="text-foreground/30 text-xs px-10 mt-2 font-sans">Okurken ayetlerin üzerine tıklayarak yer imi ekleyebilirsin.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {bookmarks.map((b, index) => (
                            <motion.div
                                key={b.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleNavigate(b)}
                                className="glass-card p-5 rounded-2xl group cursor-pointer hover:bg-foreground/[0.05] transition-all border-[var(--border)] relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-secondary/10 transition-all" />

                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-[var(--border)] grid place-items-center text-secondary">
                                            <Bookmark className="w-5 h-5 fill-current" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-foreground font-bold text-lg">
                                                    {b.type === 'verse' ? `${b.surahName}, Ayet ${b.verseNumber}` : `Sayfa ${b.pageNumber}`}
                                                </h3>
                                                <span className="text-[10px] bg-foreground/10 px-2 py-0.5 rounded text-foreground/60 uppercase tracking-wider font-bold font-sans">
                                                    {b.type === 'verse' ? 'Ayet' : 'Sayfa'}
                                                </span>
                                            </div>
                                            {b.textPreview && (
                                                <p className="text-foreground/60 text-sm font-mushaf line-clamp-1 opacity-80 mb-2 dir-rtl">
                                                    {b.textPreview}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 text-[10px] text-foreground/30 font-sans">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {b.createdAt?.toDate().toLocaleDateString('tr-TR')}
                                                </span>
                                                <span>•</span>
                                                <span>Sayfa {b.pageNumber}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDelete(b.id, e)}
                                            className="w-8 h-8 rounded-full hover:bg-red-500/20 hover:text-red-400 text-foreground/20 transition-colors grid place-items-center"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="w-8 h-8 rounded-full group-hover:bg-foreground/10 text-foreground/20 group-hover:text-foreground transition-colors grid place-items-center">
                                            <ExternalLink className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
