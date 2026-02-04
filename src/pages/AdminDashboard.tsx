import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query, limit, collectionGroup, where } from 'firebase/firestore';
import { Users, Activity, BookOpen, ShieldAlert, BadgeCheck, Search, LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';

const ADMIN_EMAIL = 'meoncu@gmail.com';

export default function AdminDashboard() {
    const { user, loading } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalTrackers: 0, activeToday: 0 });
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity'>('overview');
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (!user || user.email !== ADMIN_EMAIL) return;

        const fetchData = async () => {
            try {
                // Fetch Users
                const usersRef = collection(db, 'users');
                const usersSnap = await getDocs(usersRef);
                const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(usersList);

                // Fetch Recent Activity (Trackers updated recently)
                // Note: collectionGroup requires an index usually, but for small data might work or error explicitly
                const recentTrackersQuery = query(
                    collectionGroup(db, 'juzler'),
                    orderBy('updatedAt', 'desc'),
                    limit(20)
                );
                const activitySnap = await getDocs(recentTrackersQuery);
                const activityList = activitySnap.docs.map(doc => {
                    const data = doc.data();
                    // We try to find the owner from our user list if possible, or use data if stored
                    // Standard Firestore doesn't join. We can map locally.
                    return { id: doc.id, refPath: doc.ref.path, ...data };
                });
                setActivities(activityList);

                setStats({
                    totalUsers: usersList.length,
                    totalTrackers: activitySnap.size, // This is just recent, not total. Total needs separate count or aggregation query.
                    // Accurate total count requires aggregation queries which are paid/complex. 
                    // We'll just show 'Recent Active' count for now.
                    activeToday: activityList.filter((a: any) => {
                        return a.updatedAt?.toDate().toDateString() === new Date().toDateString();
                    }).length
                });

            } catch (error) {
                console.error("Admin data fetch error:", error);
            }
        };

        fetchData();
    }, [user]);

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
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Son Giriş</th>
                                    <th className="p-4">Kayıt ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.filter(u =>
                                    (u.email?.toLowerCase() || '').includes(filter.toLowerCase()) ||
                                    (u.displayName?.toLowerCase() || '').includes(filter.toLowerCase())
                                ).map(u => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 flex items-center gap-3">
                                            {u.photoURL ? (
                                                <img src={u.photoURL} className="w-8 h-8 rounded-full bg-white/10" alt="" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center">
                                                    <Users className="w-4 h-4" />
                                                </div>
                                            )}
                                            <span className="font-bold text-white">{u.displayName || 'İsimsiz'}</span>
                                        </td>
                                        <td className="p-4 font-mono text-xs">{u.email}</td>
                                        <td className="p-4">{u.lastLogin?.toDate().toLocaleString('tr-TR')}</td>
                                        <td className="p-4 font-mono text-xs text-white/30 truncate max-w-[100px]">{u.uid}</td>
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
                        // Find user info if available
                        const pathParts = activity.refPath.split('/');
                        const userId = pathParts[1]; // users/{uid}/juzler
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
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/50 uppercase tracking-wider">
                                            {activity.type === 'monthly_page' ? 'Aylık Takip' : activity.type === 'surah' ? 'Sure' : 'Cüz'}
                                        </span>
                                        {activity.assignedBy && (
                                            <span className="text-[10px] text-white/30 flex items-center gap-1">
                                                <BadgeCheck className="w-3 h-3" />
                                                {activity.assignedBy}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

        </div>
    );
}
