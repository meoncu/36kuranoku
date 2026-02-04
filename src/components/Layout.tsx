import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { LogOut, BookOpen, User as UserIcon, ShieldCheck, Bell } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const isAdmin = user?.email === 'meoncu@gmail.com';
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (!isAdmin) return;

        const q = query(collection(db, 'users'), where('isApproved', '==', false));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [isAdmin]);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="sticky top-0 z-50 glass-card border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <BookOpen className="text-secondary w-6 h-6" />
                    <h1 className="text-xl font-bold tracking-tight text-white">Kuran Takip</h1>
                </Link>

                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <>
                            {/* Notification Bell */}
                            <Link to="/admin?tab=users" className="relative p-2 mr-1 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-colors">
                                <Bell className="w-5 h-5" />
                                {pendingCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                )}
                            </Link>

                            <Link to="/admin" className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors mr-2" title="Yönetici Paneli">
                                <ShieldCheck className="w-5 h-5" />
                            </Link>
                        </>
                    )}
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
