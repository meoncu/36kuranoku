import { X, Heart, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface HatimDuaModalProps {
    onClose: () => void;
}

export default function HatimDuaModal({ onClose }: HatimDuaModalProps) {
    return (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card w-full max-w-lg p-6 sm:p-8 rounded-[40px] relative flow-root max-h-[85vh] overflow-y-auto custom-scrollbar border border-[#C59E57]/30"
            >
                {/* Header */}
                <div className="text-center mb-8 sticky top-0 bg-[#0a0a09]/80 backdrop-blur-xl py-4 z-10 -mx-6 -mt-6 px-6 border-b border-white/5">
                    <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold text-[#C59E57] mb-1">Hatim Duası</h2>
                    <p className="text-white/50 text-xs uppercase tracking-widest">Kuran-ı Kerim Hatim Duası</p>
                </div>

                {/* Content */}
                <div className="space-y-8 font-serif leading-relaxed">

                    {/* Arabic Section */}
                    <div className="text-center dir-rtl">
                        <p className="font-mushaf text-2xl sm:text-3xl text-white/90 leading-[2.5]">
                            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                            <br />
                            صَدَقَ ٱللَّهُ ٱلْعَظِيمُ وَبَلَّغَ رَسُولُهُ ٱلْكَرِيمُ
                            <br />
                            وَنَحْنُ عَلَىٰ ذَٰلِكَ مِنَ ٱلشَّاهِدِينَ
                        </p>
                    </div>

                    {/* Turkish Section */}
                    <div className="bg-white/5 rounded-3xl p-6 text-center space-y-4">
                        <p className="text-lg font-bold text-[#C59E57]">
                            "Ey Rabbimiz!"
                        </p>
                        <p className="text-white/80">
                            Okuduğumuz Kur'an-ı Kerim'i yüce katında kabul eyle. Onu bize dünyada arkadaş, kabirde yoldaş, kıyamet gününde şefaatçi eyle.
                        </p>
                        <p className="text-white/80">
                            Ey Rabbimiz! Bizi Kur'an'ın hidayetiyle hidayete erdir. Bizi Kur'an'ın keramiyle şereflendir. Kur'an'ın nuruyla bizi nurlandır.
                        </p>
                        <p className="text-white/80">
                            Hatalarımızı, kusurlarımızı, günahlarımızı Kur'an hürmetine affeyle. Okunan hatm-i şerifi dergah-ı izzetinde kabul eyle.
                        </p>
                        <p className="text-white/80">
                            Hasıl olan sevabı, Sevgili Peygamberimiz Hz. Muhammed Mustafa (s.a.v.) efendimizin aziz, latif, mübarek ruh-u şeriflerine hediye eyledik, vasıl eyle Ya Rabbi!
                        </p>
                        <p className="text-white/80">
                            Bütün peygamberlerin, sahabelerin, evliyanın ve şehitlerin ruhlarına; ayrıca bu hatmi okuyanların, dinleyenlerin, amin diyenlerin geçmişlerinin ruhlarına hediye eyledik, ulaştır Ya Rabbi!
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-center gap-4 pt-4">
                        <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#C59E57] text-white font-bold shadow-lg shadow-[#C59E57]/20 hover:bg-[#b08d4b] transition-all transform hover:scale-105 active:scale-95" onClick={onClose}>
                            <Heart className="w-5 h-5 fill-current" />
                            <span>Amin</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
