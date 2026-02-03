import { useAuth } from '../hooks/useAuth';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
    const { login } = useAuth();

    return (
        <div className="min-h-screen grid place-items-center p-4 bg-background relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[100px] rounded-full" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 rounded-3xl w-full max-w-md text-center border border-white/10"
            >
                <div className="w-20 h-20 bg-primary/20 rounded-2xl grid place-items-center mx-auto mb-6 shadow-inner">
                    <BookOpen className="w-10 h-10 text-secondary" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">Kur'an Takip</h1>
                <p className="text-white/60 mb-8 px-4">
                    Cüz okuma sürecinizi dijitalleştirin, ilerlemenizi kolayca takip edin.
                </p>

                <button
                    onClick={login}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 px-6 rounded-2xl hover:bg-white/90 transition-all active:scale-[0.98] shadow-lg"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    Google ile Giriş Yap
                </button>

                <p className="mt-8 text-xs text-white/40">
                    Giriş yaparak kullanım koşullarını kabul etmiş olursunuz.
                </p>
            </motion.div>
        </div>
    );
}
