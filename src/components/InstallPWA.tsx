import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [manualShow, setManualShow] = useState(false);
    const [installError, setInstallError] = useState(false);

    useEffect(() => {
        // 1. Detect iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIos(isIosDevice);

        // 2. Check if already installed / standalone
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        // 3. Capture Chrome/Android install prompt
        const handler = (e: any) => {
            console.log('beforeinstallprompt event fired');
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // 4. Persistence Check: If user dismissed once, maybe don't show?
        const isDismissed = localStorage.getItem('pwa_banner_dismissed') === 'true';

        if (!isStandalone && !isDismissed) {
            // Show for iOS immediately
            if (isIosDevice) {
                setShowInstallBanner(true);
            }

            // Wait 3 seconds to show fallback instructions if no prompt arrives
            const timer = setTimeout(() => {
                setManualShow(true);
            }, 3000);
            return () => clearTimeout(timer);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    setDeferredPrompt(null);
                    setShowInstallBanner(false);
                }
            } catch (err) {
                console.error('Installation error:', err);
                setInstallError(true);
            }
        } else {
            // If no automatic prompt, show an alert with manual instructions
            alert("Otomatik yükleme şu an başlatılamadı. Lütfen tarayıcı menüsünden (sağ üstteki üç nokta) 'Uygulamayı Yüklüyoruz' veya 'Ana Ekrana Ekle' seçeneğine tıklayın.");
            setInstallError(true);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa_banner_dismissed', 'true');
        setShowInstallBanner(false);
        setManualShow(false);
    };

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return null;

    const visible = showInstallBanner || manualShow;
    if (!visible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card mb-6 p-5 rounded-[32px] border-primary/20 bg-primary/5 relative overflow-hidden group shadow-xl"
            >
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-white/20 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-2 rounded-full z-20"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 relative z-10">
                    <div className="w-16 h-16 rounded-[24px] bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/30 shrink-0 group-hover:scale-105 transition-transform">
                        <Smartphone className="w-8 h-8" />
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                            <h3 className="text-white font-black text-lg">Uygulamayı Yükle</h3>
                            {installError && <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />}
                        </div>
                        <p className="text-white/60 text-xs sm:text-sm leading-relaxed max-w-[280px] sm:max-w-none mx-auto">
                            {isIos
                                ? "Safari'de 'Paylaş' -> 'Ana Ekrana Ekle' yolunu izleyerek uygulamayı hemen kurabilirsin."
                                : deferredPrompt
                                    ? "Hızlı erişim ve daha iyi bir deneyim için uygulamayı hemen ana ekranına ekle."
                                    : "Tarayıcı menüsündeki 'Yükle' veya 'Ana Ekrana Ekle' butonunu kullanarak yükleyebilirsin."}
                        </p>
                    </div>

                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                        {deferredPrompt ? (
                            <button
                                onClick={handleInstallClick}
                                className="w-full bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-[20px] font-black text-sm transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                <span>Şimdi Yükle</span>
                            </button>
                        ) : isIos ? (
                            <div className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 rounded-[20px] border border-white/10">
                                <Share className="w-5 h-5 text-primary" />
                                <span className="text-[12px] font-black text-white/40 uppercase tracking-widest">Paylaş</span>
                                <PlusSquare className="w-5 h-5 text-primary" />
                            </div>
                        ) : (
                            <div className="bg-white/5 px-6 py-4 rounded-[20px] border border-white/10 flex items-center justify-center gap-3">
                                <Info className="w-5 h-5 text-white/30" />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Android Menüden Yükle</span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
