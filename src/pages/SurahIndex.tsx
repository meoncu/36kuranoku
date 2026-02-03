import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHAPTERS } from '../constants/chapters';
import { motion } from 'framer-motion';
import { Search, BookOpen, ChevronLeft, PlayCircle } from 'lucide-react';

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
                    className="w-10 h-10 rounded-full glass-card grid place-items-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">Sure İndeksi</h1>
                    <p className="text-white/40 text-xs">Toplam 114 Sure</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                    type="text"
                    placeholder="Sure ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-all"
                />
            </div>

            {/* Tabs (Visual only for now matching the request) */}
            <div className="flex items-center gap-6 border-b border-white/10 px-2">
                <button className="py-3 text-primary font-bold text-sm border-b-2 border-primary">Sureler</button>
                <button className="py-3 text-white/40 font-medium text-sm hover:text-white/70">Cüzler</button>
                <button className="py-3 text-white/40 font-medium text-sm hover:text-white/70">Sayfalar</button>
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
                        className="glass-card p-4 rounded-2xl flex items-center justify-between group hover:bg-white/10 cursor-pointer transition-all border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            {/* Surah Number */}
                            <div className="w-10 h-10 rounded-full bg-white/5 grid place-items-center text-sm font-bold text-primary group-hover:bg-primary group-hover:text-white transition-colors relative">
                                {chapter.id}
                                <svg className="absolute inset-0 w-full h-full text-white/10" viewBox="0 0 36 36">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="100, 100" />
                                </svg>
                            </div>

                            {/* Surah Details */}
                            <div>
                                <h3 className="text-white font-bold text-base">{chapter.name}</h3>
                                <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-wider font-medium">
                                    <span>{chapter.meaning}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <span>{chapter.verseCount} Ayet</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Arabic & Action */}
                        <div className="flex items-center gap-4">
                            <span className="font-mushaf text-xl text-[#C59E57] group-hover:text-[#e0b86e] transition-colors">{chapter.arabic}</span>
                            <div className="w-8 h-8 rounded-full border border-white/10 grid place-items-center text-white/30 group-hover:border-[#C59E57]/50 group-hover:text-[#C59E57] transition-all">
                                <PlayCircle className="w-4 h-4 fill-current" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
