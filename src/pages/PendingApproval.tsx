import { LogOut } from 'lucide-react';
import { useAuth } from './hooks/useAuth';

export default function PendingApproval() {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="glass-card max-w-md w-full p-8 rounded-[40px] text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C59E57] to-transparent opacity-50" />

                <div className="w-20 h-20 rounded-full bg-[#C59E57]/10 mx-auto mb-6 grid place-items-center">
                    <div className="w-12 h-12 rounded-full bg-[#C59E57] animate-pulse" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Onay Bekleniyor</h1>
                <p className="text-white/60 mb-8">
                    Hesabınız oluşturuldu ancak yönetici onayı gerekiyor. Onaylandığında sisteme erişebileceksiniz.
                </p>

                <button
                    onClick={logout}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all font-bold text-sm"
                >
                    <LogOut className="w-4 h-4" />
                    Çıkış Yap
                </button>
            </div>
        </div>
    );
}
