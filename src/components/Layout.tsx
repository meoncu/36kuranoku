import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, BookOpen, User as UserIcon } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="sticky top-0 z-50 glass-card border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen className="text-secondary w-6 h-6" />
                    <h1 className="text-xl font-bold tracking-tight text-white">Kuran Takip</h1>
                </div>

                <div className="flex items-center gap-3">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-white/20" />
                    ) : (
                        <UserIcon className="w-8 h-8 p-1 rounded-full border border-white/20" />
                    )}
                    <button onClick={logout} className="p-2 hover:bg-white/5 rounded-full text-white/70 hover:text-white transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto p-4 pb-24">
                    <Outlet />
                </div>
            </main>

            <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/5 p-3 sm:hidden">
                {/* Mobile navigation or quick stats can go here */}
                <div className="text-center text-xs text-white/50">
                    Hoş geldin, {user?.displayName}
                </div>
            </nav>
        </div>
    );
}
