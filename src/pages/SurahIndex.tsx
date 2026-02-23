import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHAPTERS } from '../constants/chapters';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, PlayCircle } from 'lucide-react';

export default function SurahIndex() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredChapters = CHAPTERS.filter(chapter =>
        chapter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chapter.id.toString().includes(searchQuery)
    );

    return (
        <div className="max-w-2xl mx-auto pb-24 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 pt-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full glass-card grid place-items-center text-foreground/70 hover:text-foreground hover:bg-foreground/10 transition-all border border-[var(--border)]"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground font-sans">Sure İndeksi</h1>
                    <p className="text-foreground/40 text-xs font-sans">Toplam 114 Sure</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative font-sans">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30" />
                <input
                    type="text"
                    placeholder="Sure ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-foreground/5 border border-[var(--border)] rounded-2xl pl-12 pr-4 py-4 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-secondary transition-all"
                />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-[var(--border)] px-2 font-sans">
                <button className="py-3 text-secondary font-bold text-sm border-b-2 border-secondary">Sureler</button>
                <button className="py-3 text-foreground/40 font-medium text-sm hover:text-foreground/70">Cüzler</button>
                <button className="py-3 text-foreground/40 font-medium text-sm hover:text-foreground/70">Sayfalar</button>
            </div>

            {/* Surah List */}
            <div className="space-y-3">
                {filteredChapters.map((chapter, index) => (
                    <motion.div
                        key={chapter.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => navigate(`/juz/${Math.ceil(chapter.startPage / 20)}?initialPage=${chapter.startPage}`)}
                        className="glass-card p-4 rounded-2xl flex items-center justify-between group hover:bg-foreground/[0.02] cursor-pointer transition-all border border-[var(--border)]"
                    >
                        <div className="flex items-center gap-4">
                            {/* Surah Number */}
                            <div className="w-10 h-10 rounded-full bg-secondary/10 grid place-items-center text-sm font-bold text-secondary group-hover:bg-secondary group-hover:text-white transition-colors relative font-sans">
                                {chapter.id}
                                <svg className="absolute inset-0 w-full h-full text-secondary/20" viewBox="0 0 36 36">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="100, 100" />
                                </svg>
                            </div>

                            {/* Surah Details */}
                            <div className="font-sans">
                                <h3 className="text-foreground font-bold text-base">{chapter.name}</h3>
                                <div className="flex items-center gap-2 text-[10px] text-foreground/40 uppercase tracking-wider font-medium">
                                    <span>{chapter.meaning}</span>
                                    <span className="w-1 h-1 rounded-full bg-foreground/20" />
                                    <span>{chapter.verseCount} Ayet</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Arabic & Action */}
                        <div className="flex items-center gap-4">
                            <span className="font-mushaf text-xl text-secondary group-hover:opacity-80 transition-opacity">{chapter.arabic}</span>
                            <div className="w-8 h-8 rounded-full border border-[var(--border)] grid place-items-center text-foreground/30 group-hover:border-secondary/50 group-hover:text-secondary transition-all">
                                <PlayCircle className="w-4 h-4 fill-current" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
