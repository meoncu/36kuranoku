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
                className="bg-card glass-card p-8 rounded-3xl w-full max-w-md text-center border border-[var(--border)] relative z-10"
            >
                <div className="w-20 h-20 bg-secondary/20 rounded-2xl grid place-items-center mx-auto mb-6 shadow-inner">
                    <BookOpen className="w-10 h-10 text-secondary" />
                </div>

                <h1 className="text-3xl font-bold text-foreground mb-2">Kur'an Takip</h1>
                <p className="text-foreground/60 mb-8 px-4 font-sans">
                    Cüz okuma sürecinizi dijitalleştirin, ilerlemenizi kolayca takip edin.
                </p>

                <button
                    onClick={login}
                    className="w-full flex items-center justify-center gap-3 btn-secondary py-4 px-6 rounded-2xl shadow-lg shadow-secondary/20 font-bold font-sans"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
                    Google ile Giriş Yap
                </button>

                <p className="mt-8 text-xs text-foreground/40 font-sans">
                    Giriş yaparak kullanım koşullarını kabul etmiş olursunuz.
                </p>
            </motion.div>
        </div>
    );
}
