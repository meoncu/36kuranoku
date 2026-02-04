import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [manualShow, setManualShow] = useState(false);

    useEffect(() => {
        // 1. Detect iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIos(isIosDevice);

        // 2. Check if already installed / standalone
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        // 3. Capture Chrome/Android install prompt
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // 4. Persistence Check: If user dismissed once, maybe don't show?
        // But for "I can't see it" cases, we should show it if not standalone.
        const isDismissed = localStorage.getItem('pwa_banner_dismissed') === 'true';

        if (!isStandalone && !isDismissed) {
            // Show for iOS immediately (since there is no event)
            if (isIosDevice) {
                setShowInstallBanner(true);
            }
            // For others, we wait for beforeinstallprompt event.
            // But if it takes too long and we want to show instructions anyway:
            const timer = setTimeout(() => {
                setManualShow(true);
            }, 3000);
            return () => clearTimeout(timer);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowInstallBanner(false);
            }
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa_banner_dismissed', 'true');
        setShowInstallBanner(false);
        setManualShow(false);
    };

    // If it's already installed, don't show anything
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return null;

    // Show if we have a prompt OR if we are on iOS OR if we want to show manual instructions
    const visible = showInstallBanner || manualShow;
    if (!visible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card mb-6 p-4 rounded-3xl border-primary/20 bg-primary/10 relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-white/20 hover:text-white transition-colors p-1"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <Smartphone className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-white font-bold text-sm">Uygulamayı Yükle</h3>
                        <p className="text-white/60 text-[10px] sm:text-xs leading-tight mt-0.5">
                            {isIos
                                ? "Safari'de 'Paylaş' -> 'Ana Ekrana Ekle' yolunu izle."
                                : deferredPrompt
                                    ? "Hızlı erişim için ana ekranına bir uygulama olarak ekle."
                                    : "Tarayıcı ayarlarından 'Yükle' veya 'Ana Ekrana Ekle'yi seçin."}
                        </p>
                    </div>

                    {deferredPrompt ? (
                        <button
                            onClick={handleInstallClick}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            <span>Yükle</span>
                        </button>
                    ) : isIos ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                            <Share className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-bold text-white/40 uppercase">Paylaş</span>
                            <PlusSquare className="w-4 h-4 text-primary" />
                        </div>
                    ) : (
                        <div className="bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-2">
                            <Info className="w-4 h-4 text-white/30" />
                            <span className="text-[10px] font-bold text-white/40 uppercase">Mobil İçin</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
