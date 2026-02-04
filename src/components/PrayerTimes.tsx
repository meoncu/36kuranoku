import { useState, useEffect } from 'react';
import { Clock, Moon, Sun, Sunrise, Sunset, CloudSun as SunCloud } from 'lucide-react';
import { motion } from 'framer-motion';

interface PrayerTimesProps {
    city: string;
}

interface Timings {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
}

export default function PrayerTimes({ city }: PrayerTimesProps) {
    const [timings, setTimings] = useState<Timings | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const fetchPrayerTimes = async () => {
            try {
                setLoading(true);
                const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Turkey&method=13`);
                const data = await response.json();
                if (data.code === 200) {
                    setTimings(data.data.timings);
                }
            } catch (error) {
                console.error("Error fetching prayer times:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrayerTimes();
    }, [city]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (loading) return (
        <div className="glass-card p-6 rounded-3xl flex items-center justify-center h-[120px] animate-pulse">
            <p className="text-white/20 font-bold text-sm tracking-widest uppercase">Vakitler Yükleniyor...</p>
        </div>
    );

    if (!timings) return null;

    const times = [
        { name: 'İmsak', time: timings.Fajr, icon: Moon },
        { name: 'Güneş', time: timings.Sunrise, icon: Sunrise },
        { name: 'Öğle', time: timings.Dhuhr, icon: Sun },
        { name: 'İkindi', time: timings.Asr, icon: SunCloud },
        { name: 'Akşam', time: timings.Maghrib, icon: Sunset },
        { name: 'Yatsı', time: timings.Isha, icon: Moon },
    ];

    // Find next prayer
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const nextPrayer = times.find(t => {
        const [h, m] = t.time.split(':').map(Number);
        return (h * 60 + m) > now;
    }) || times[0];

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-[32px] overflow-hidden relative group"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">{city} Namaz Vakitleri</h3>
                        <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                            {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                {nextPrayer && (
                    <div className="text-right">
                        <span className="text-white/30 text-[10px] font-bold uppercase block">Sıradaki Vakit</span>
                        <span className="text-primary font-black text-sm">{nextPrayer.name} • {nextPrayer.time}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-6 gap-2 relative z-10">
                {times.map((t) => {
                    const isNext = t.name === nextPrayer.name;
                    return (
                        <div
                            key={t.name}
                            className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all ${isNext ? 'bg-primary/20 scale-105 border border-primary/20' : 'bg-white/5 hover:bg-white/10'}`}
                        >
                            <t.icon className={`w-4 h-4 ${isNext ? 'text-primary' : 'text-white/40'}`} />
                            <div className="text-center">
                                <span className={`text-[9px] font-bold block ${isNext ? 'text-primary' : 'text-white/30'}`}>{t.name}</span>
                                <span className={`text-[11px] font-black block ${isNext ? 'text-white' : 'text-white/60'}`}>{t.time}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
