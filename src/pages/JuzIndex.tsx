import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, BookOpen, ChevronRight } from 'lucide-react';

export default function JuzIndex() {
    const navigate = useNavigate();

    // Generate array of 30 Juz
    const juzs = Array.from({ length: 30 }, (_, i) => i + 1);

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
                    <h1 className="text-2xl font-bold text-foreground font-sans">Cüz İndeksi</h1>
                    <p className="text-foreground/40 text-xs font-sans">Toplam 30 Cüz</p>
                </div>
            </div>

            {/* Juz List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
                {juzs.map((juzNo, index) => (
                    <motion.div
                        key={juzNo}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => navigate(`/juz/${juzNo}`)}
                        className="glass-card p-4 rounded-2xl flex items-center justify-between group hover:bg-foreground/[0.02] cursor-pointer transition-all border border-[var(--border)]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 group-hover:bg-secondary transition-all grid place-items-center relative">
                                <span className="font-bold text-lg text-secondary group-hover:text-white transition-colors font-sans">{juzNo}</span>
                                <BookOpen className="w-6 h-6 absolute text-secondary/10 group-hover:text-white/20" />
                            </div>
                            <div className="font-sans">
                                <h3 className="text-foreground font-bold text-lg">{juzNo}. Cüz</h3>
                                <p className="text-foreground/40 text-xs uppercase tracking-wider font-medium">
                                    {(juzNo - 1) * 20 + 2}. Sayfa
                                </p>
                            </div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-foreground/5 grid place-items-center text-foreground/30 group-hover:text-foreground transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
