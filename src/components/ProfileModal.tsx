import { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { X, User, MapPin, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileModalProps {
    user: any;
    profile: any;
    onClose: () => void;
}

const TURKISH_CITIES = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
    "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
    "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
    "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
    "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
    "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
    "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
    "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
].sort((a, b) => a.localeCompare(b, 'tr'));

export default function ProfileModal({ user, profile, onClose }: ProfileModalProps) {
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [city, setCity] = useState(profile?.city || 'Ankara');
    const [showPrayerTimes, setShowPrayerTimes] = useState(profile?.showPrayerTimes ?? true);
    const [showResumeReading, setShowResumeReading] = useState(profile?.showResumeReading ?? true);
    const [loading, setLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                displayName,
                city,
                showPrayerTimes,
                showResumeReading,
                updatedAt: new Date()
            });
            onClose();
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Güncellenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-card w-full max-w-sm p-8 rounded-[40px] relative z-10 shadow-2xl border-white/10"
            >
                <button onClick={onClose} className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden group">
                        {profile?.photoURL ? (
                            <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10" />
                        )}
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white">Profil Ayarları</h2>
                        <p className="text-white/40 text-sm mt-1">Bilgilerini buradan güncelleyebilirsin</p>
                    </div>

                    <form onSubmit={handleSave} className="w-full space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Kullanıcı Adı</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Adınız Soyadınız"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Şehir (Namaz Vakitleri İçin)</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                <select
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-medium appearance-none"
                                >
                                    {TURKISH_CITIES.map(c => (
                                        <option key={c} value={c} className="bg-[#1a1a1a] text-white">{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2 border-t border-white/5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Görünüm Tercihleri</label>

                            <div
                                onClick={() => setShowPrayerTimes(!showPrayerTimes)}
                                className="flex items-center justify-between cursor-pointer group"
                            >
                                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Namaz Vakitlerini Göster</span>
                                <div className={`w-10 h-5 rounded-full transition-all relative ${showPrayerTimes ? 'bg-primary' : 'bg-white/10'}`}>
                                    <motion.div
                                        animate={{ x: showPrayerTimes ? 22 : 2 }}
                                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm"
                                    />
                                </div>
                            </div>

                            <div
                                onClick={() => setShowResumeReading(!showResumeReading)}
                                className="flex items-center justify-between cursor-pointer group"
                            >
                                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Kaldığım Yeri Göster</span>
                                <div className={`w-10 h-5 rounded-full transition-all relative ${showResumeReading ? 'bg-primary' : 'bg-white/10'}`}>
                                    <motion.div
                                        animate={{ x: showResumeReading ? 22 : 2 }}
                                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-4 font-bold text-sm transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Kaydet ve Kapat</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
