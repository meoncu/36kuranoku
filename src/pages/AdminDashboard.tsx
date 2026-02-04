import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, onSnapshot, orderBy, query, limit, collectionGroup, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Users, Activity, BookOpen, ShieldAlert, BadgeCheck, Search, LayoutGrid, List, CheckCircle, XCircle, Clock, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate, useSearchParams } from 'react-router-dom';

const ADMIN_EMAIL = 'meoncu@gmail.com';

export default function AdminDashboard() {
    const { user, loading } = useAuth();
    const [searchParams] = useSearchParams();

    // Initialize tab from URL or default to overview
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'trackers'>(
        (searchParams.get('tab') as 'overview' | 'users' | 'activity' | 'trackers') || 'overview'
    );

    const [users, setUsers] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [allTrackers, setAllTrackers] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalTrackers: 0, activeToday: 0 });
    const [filter, setFilter] = useState('');

    const [error, setError] = useState('');

    useEffect(() => {
        if (!user || user.email !== ADMIN_EMAIL) return;

        // Real-time Users Listener
        const unsubscribeUsers = onSnapshot(
            collection(db, 'users'),
            (snapshot) => {
                const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort: Pending first, then newest
                usersList.sort((a: any, b: any) => {
                    if (a.isApproved === b.isApproved) {
                        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
                    }
                    return a.isApproved ? 1 : -1;
                });

                setUsers(usersList);
                setError('');
            },
            (err) => {
                console.error("Users listener error:", err);
                setError('Kullanıcı listesi alınamadı. Yetkiniz yok veya bağlantı hatası.');
            }
        );

        // Real-time Activity Listener (Recent)
        const recentTrackersQuery = query(
            collectionGroup(db, 'juzler'),
            orderBy('updatedAt', 'desc'),
            limit(20)
        );

        const unsubscribeActivity = onSnapshot(
            recentTrackersQuery,
            (snapshot) => {
                const activityList = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return { id: doc.id, refPath: doc.ref.path, ...data };
                });
                setActivities(activityList);
            },
            (err) => {
                console.error("Activity listener error:", err);
            }
        );

        // All Trackers Listener
        const allTrackersQuery = query(
            collectionGroup(db, 'juzler'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeAllTrackers = onSnapshot(
            allTrackersQuery,
            (snapshot) => {
                const trackerList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    refPath: doc.ref.path,
                    ...doc.data()
                }));
                setAllTrackers(trackerList);
            },
            (err) => {
                console.error("All Trackers listener error:", err);
            }
        );

        return () => {
            unsubscribeUsers();
            unsubscribeActivity();
            unsubscribeAllTrackers();
        };
    }, [user]);

    // Update stats when data changes
    useEffect(() => {
        setStats({
            totalUsers: users.length,
            totalTrackers: allTrackers.length,
            activeToday: activities.filter((a: any) => {
                return a.updatedAt?.toDate().toDateString() === new Date().toDateString();
            }).length
        });
    }, [users, activities, allTrackers]);

    // Handle Tab Change manually to update URL if needed, but simplistic state is fine for now.
    // Ideally update URL too? Let's keep it simple. Only read on mount.

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        const action = currentStatus ? 'pasif' : 'aktif';
        if (!confirm(`Bu kullanıcıyı ${action} duruma getirmek istiyor musunuz?`)) return;

        try {
            await updateDoc(doc(db, 'users', userId), {
                isApproved: !currentStatus,
                approvedAt: !currentStatus ? serverTimestamp() : null
            });

            // Optimistic update
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isApproved: !currentStatus } : u));
        } catch (error) {
            console.error(`Error turning user ${action}:`, error);
            alert("İşlem başarısız oldu.");
        }
    };

    if (loading) return null;
    if (user?.email !== ADMIN_EMAIL) return <Navigate to="/" />;

    return (
        <div className="space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <ShieldAlert className="text-red-500" />
                        Yönetici Paneli
                    </h1>
                    <p className="text-white/50">Tüm kullanıcı hareketleri ve sistem durumu</p>

                    {users.some(u => !u.isApproved) && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-pulse cursor-pointer hover:bg-red-500/20 transition-colors"
                            onClick={() => setActiveTab('users')}>
                            <ShieldAlert className="text-red-500 w-5 h-5 shrink-0" />
                            <span className="text-red-500 font-bold text-sm">
                                {users.filter(u => !u.isApproved).length} kullanıcı onay bekliyor!
                            </span>
                            <span className="ml-auto text-xs bg-red-500 text-white px-3 py-1 rounded-lg font-bold">
                                İncele
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Genel
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        <Users className="w-4 h-4" />
                        Kullanıcılar
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'activity' ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        <Activity className="w-4 h-4" />
                        Hareketler
                    </button>
                    <button
                        onClick={() => setActiveTab('trackers')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'trackers' ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Takipler
                    </button>
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 grid place-items-center text-blue-500 mb-4">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-white/50 font-medium mb-1">Toplam Kullanıcı</h3>
                            <p className="text-4xl font-bold text-white">{stats.totalUsers}</p>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/20 grid place-items-center text-green-500 mb-4">
                                <Activity className="w-6 h-6" />
                            </div>
                            <h3 className="text-white/50 font-medium mb-1">Bugünkü Aktivite</h3>
                            <p className="text-4xl font-bold text-white">{stats.activeToday}</p>
                            <span className="text-xs text-white/30">Son 20 işlem içinde</span>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C59E57]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-[#C59E57]/20 grid place-items-center text-[#C59E57] mb-4">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h3 className="text-white/50 font-medium mb-1">Aktif Takipler</h3>
                            <p className="text-4xl font-bold text-white">~{stats.totalTrackers}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="glass-card rounded-3xl overflow-hidden border border-white/5">
                    {/* Permission Hint for Developer */}
                    {users.length <= 1 && !error && (
                        <div className="bg-yellow-500/10 p-4 border-b border-yellow-500/20 flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-200/80">
                                <p className="font-bold text-yellow-500 mb-1">Diğer kullanıcılar görünmüyor mu?</p>
                                <p>
                                    Listede sadece kendinizi görüyorsanız, Firebase Güvenlik Kuralları (Firestore Rules)
                                    yöneticiye "tüm kullanıcıları okuma" izni vermiyor olabilir.
                                </p>
                                <div className="mt-2 text-xs bg-black/20 p-2 rounded text-white/50 font-mono">
                                    allow read: if request.auth.uid == userId || request.auth.token.email == 'meoncu@gmail.com';
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-4">
                        <Search className="w-5 h-5 text-white/30" />
                        <input
                            type="text"
                            placeholder="Kullanıcı ara (Email veya İsim)..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-white w-full placeholder:text-white/30"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-white/70">
                            <thead className="bg-white/5 text-white font-bold uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="p-4">Kullanıcı</th>
                                    <th className="p-4">Kayıt Tarihi</th>
                                    <th className="p-4">Durum</th>
                                    <th className="p-4 text-right">Yönetim</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.filter(u =>
                                    (u.email?.toLowerCase() || '').includes(filter.toLowerCase()) ||
                                    (u.displayName?.toLowerCase() || '').includes(filter.toLowerCase())
                                ).map(u => (
                                    <tr key={u.id} className={`hover:bg-white/5 transition-colors ${!u.isApproved ? 'bg-red-500/5' : ''}`}>
                                        <td className="p-4 flex items-center gap-3">
                                            {u.photoURL ? (
                                                <img src={u.photoURL} className="w-8 h-8 rounded-full bg-white/10" alt="" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center">
                                                    <Users className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-white">{u.displayName || 'İsimsiz'}</div>
                                                <div className="font-mono text-xs opacity-50 mb-2">{u.email}</div>
                                                <div className="flex gap-2">
                                                    <span title="Namaz Vakitleri" className={`w-2 h-2 rounded-full ${u.showPrayerTimes !== false ? 'bg-blue-500' : 'bg-white/10'}`} />
                                                    <span title="Kaldığım Yer" className={`w-2 h-2 rounded-full ${u.showResumeReading !== false ? 'bg-[#C59E57]' : 'bg-white/10'}`} />
                                                    <span title="Yükleme Paneli" className={`w-2 h-2 rounded-full ${u.showInstallBanner !== false ? 'bg-primary' : 'bg-white/10'}`} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-xs">
                                                <Clock className="w-3 h-3 text-white/30" />
                                                {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('tr-TR') : '-'}
                                                <span className="text-white/30 text-[10px]">
                                                    ({u.createdAt?.toDate ? u.createdAt.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {u.isApproved ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-500 font-bold text-xs">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Aktif User
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 font-bold text-xs animate-pulse">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Onay Bekliyor
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {u.id !== user?.uid && (
                                                <button
                                                    onClick={() => handleToggleStatus(u.id, u.isApproved)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95 ${!u.isApproved
                                                        ? 'bg-[#C59E57] hover:bg-[#b08d4b] text-white ring-2 ring-[#C59E57]/20 ring-offset-2 ring-offset-black'
                                                        : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
                                                        }`}
                                                >
                                                    {!u.isApproved ? 'Onayla ve Aktif Et' : 'Pasife Al'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
                <div className="space-y-4">
                    {activities.map((activity, i) => {
                        const userId = activity.refPath.split('/')[1];
                        const userInfo = users.find(u => u.uid === userId);

                        return (
                            <motion.div
                                key={activity.id + i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#C59E57]/10 flex items-center justify-center text-[#C59E57] shrink-0">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white text-sm">
                                            {userInfo?.displayName || userInfo?.email || 'Bilinmeyen Kullanıcı'}
                                        </span>
                                        <span className="text-white/30 text-xs">•</span>
                                        <span className="text-white/40 text-xs font-mono">
                                            {activity.updatedAt?.toDate().toLocaleString('tr-TR')}
                                        </span>
                                    </div>
                                    <p className="text-white/70 text-sm truncate">
                                        <span className="text-[#C59E57] font-medium">{activity.title}</span> üzerinde işlem yaptı.
                                    </p>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* Trackers Tab */}
            {activeTab === 'trackers' && (
                <div className="space-y-6">
                    <div className="glass-card p-4 rounded-2xl flex items-center gap-4 bg-white/5 border border-white/10">
                        <Search className="w-5 h-5 text-white/30" />
                        <input
                            type="text"
                            placeholder="Takip veya kullanıcı ara..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-white w-full placeholder:text-white/30"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allTrackers
                            .filter(t => {
                                const userId = t.refPath.split('/')[1];
                                const userInfo = users.find(u => u.uid === userId);
                                const searchStr = (t.title + ' ' + (userInfo?.displayName || '') + ' ' + (userInfo?.email || '')).toLowerCase();
                                return searchStr.includes(filter.toLowerCase());
                            })
                            .map((tracker, i) => {
                                const userId = tracker.refPath.split('/')[1];
                                const userInfo = users.find(u => u.uid === userId);
                                const progress = Math.round((tracker.okunanSayfalar?.length || 0) / (tracker.toplamSayfa || 20) * 100);

                                return (
                                    <motion.div
                                        key={tracker.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="glass-card p-5 rounded-3xl border border-white/5 hover:border-primary/20 transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    {tracker.type === 'monthly_page' ? <Calendar className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold leading-tight">{tracker.title}</h4>
                                                    <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold">
                                                        {tracker.type === 'monthly_page' ? 'Aylık Takip' : tracker.type === 'surah' ? 'Sure' : 'Cüz'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-primary font-black text-lg">%{progress}</div>
                                                <div className="text-white/20 text-[9px] font-bold uppercase">İlerleme</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                            {userInfo?.photoURL ? (
                                                <img src={userInfo.photoURL} className="w-8 h-8 rounded-lg" alt="" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center text-white/30">
                                                    <User className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white/80 font-bold text-xs truncate">
                                                    {userInfo?.displayName || 'İsimsiz'}
                                                </div>
                                                <div className="text-white/30 text-[10px] truncate">{userInfo?.email}</div>
                                            </div>
                                            {tracker.isArchived && (
                                                <span className="bg-white/10 text-white/40 px-2 py-0.5 rounded text-[8px] font-bold uppercase">Arşiv</span>
                                            )}
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                                                <span>Okunan: {tracker.okunanSayfalar?.length || 0} Sayfa</span>
                                                <span>Toplam: {tracker.toplamSayfa || 20}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    className="h-full bg-primary"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                    </div>
                </div>
            )}

        </div>
    );
}
