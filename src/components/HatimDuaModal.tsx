import { X, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface HatimDuaModalProps {
    onClose: () => void;
}

export default function HatimDuaModal({ onClose }: HatimDuaModalProps) {
    return (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card w-full max-w-lg p-6 sm:p-8 rounded-[40px] relative flow-root max-h-[85vh] overflow-y-auto custom-scrollbar border-[var(--border)]"
            >
                {/* Header */}
                <div className="text-center mb-8 sticky top-0 bg-card backdrop-blur-xl py-4 z-10 -mx-6 -mt-6 px-6 border-b border-[var(--border)]">
                    <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 grid place-items-center text-foreground/50 hover:text-foreground transition-all">
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold text-secondary mb-1">Hatim Duası</h2>
                    <p className="text-foreground/50 text-xs uppercase tracking-widest font-sans">Kuran-ı Kerim Hatim Duası</p>
                </div>

                {/* Content */}
                <div className="space-y-8 leading-relaxed font-mushaf">

                    {/* Arabic Section */}
                    <div className="text-center dir-rtl">
                        <p className="text-2xl sm:text-3xl text-foreground leading-[2.5]">
                            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                            <br />
                            صَدَقَ ٱللَّهُ ٱلْعَظِيمُ وَبَلَّغَ رَسُولُهُ ٱلْكَرِيمُ
                            <br />
                            وَنَحْنُ عَلَىٰ ذَٰلِكَ مِنَ ٱلشَّاهِدِينَ
                        </p>
                    </div>

                    {/* Turkish Section */}
                    <div className="bg-foreground/5 rounded-3xl p-6 text-center space-y-4 font-sans">
                        <p className="text-lg font-bold text-secondary">
                            "Ey Rabbimiz!"
                        </p>
                        <p className="text-foreground/80">
                            Okuduğumuz Kur'an-ı Kerim'i yüce katında kabul eyle. Onu bize dünyada arkadaş, kabirde yoldaş, kıyamet gününde şefaatçi eyle.
                        </p>
                        <p className="text-foreground/80">
                            Ey Rabbimiz! Bizi Kur'an'ın hidayetiyle hidayete erdir. Bizi Kur'an'ın keramiyle şereflendir. Kur'an'ın nuruyla bizi nurlandır.
                        </p>
                        <p className="text-foreground/80">
                            Hatalarımızı, kusurlarımızı, günahlarımızı Kur'an hürmetine affeyle. Okunan hatm-i şerifi dergah-ı izzetinde kabul eyle.
                        </p>
                        <p className="text-foreground/80">
                            Hasıl olan sevabı, Sevgili Peygamberimiz Hz. Muhammed Mustafa (s.a.v.) efendimizin aziz, latif, mübarek ruh-u şeriflerine hediye eyledik, vasıl eyle Ya Rabbi!
                        </p>
                        <p className="text-foreground/80">
                            Bütün peygamberlerin, sahabelerin, evliyanın ve şehitlerin ruhlarına; ayrıca bu hatmi okuyanların, dinleyenlerin, amin diyenlerin geçmişlerinin ruhlarına hediye eyledik, ulaştır Ya Rabbi!
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-center gap-4 pt-4">
                        <button className="btn-secondary flex items-center gap-2 px-8 rounded-full shadow-lg shadow-secondary/20" onClick={onClose}>
                            <Heart className="w-5 h-5 fill-current" />
                            <span>Amin</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
