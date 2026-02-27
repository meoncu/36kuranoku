export interface Juz {
    id: string;
    juzNo: number;
    toplamSayfa: number;
    baslangicTarihi: any; // Timestamp
    hedefBitisTarihi: any; // Timestamp
    okunanSayfalar: number[];
    durum: 'devam-ediyor' | 'tamamlandi';
    createdAt: any;
    updatedAt?: any; // New field for sorting by recently read
    assignedBy?: string; // Who assigned this task (e.g. "Ahmet", "Hat m Grubu")
    notes?: string; // User notes
    title?: string; // Custom title for the tracker (e.g. "Ramazan Hatmi")
    type?: 'juz' | 'surah' | 'monthly_page' | 'custom' | 'hijri_plan'; // Tracker type
    surahId?: number; // If type is surah
    startPage?: number; // Starting page of the range
    endPage?: number; // Ending page of the range
    isArchived?: boolean; // Archived status
    // For Monthly Page Tracking
    assignedPage?: number; // The base assigned page (1-20)
    startMonth?: string; // YYYY-MM starting period
    monthlyProgress?: Record<string, number[]>; // Key: "YYYY-MM", Value: Array of completed Juz numbers (1-30)
    isSingleMonth?: boolean; // Manual Single Month Tracker

    // For Hijri Planning
    hijriPlanConfig?: {
        startHijriDate: string; // e.g. "1445-08-10"
        startJuz: number; // 1-30
        dailyJuzCount: number; // default 1
    };

    // Grouping Fields
    isGrouped?: boolean;
    groupName?: string | null;

    // Completion Fields
    completedAt?: any; // Timestamp
    isDuaRead?: boolean;
}

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    createdAt: any;
    city?: string; // For prayer times
    showPrayerTimes?: boolean;
    showResumeReading?: boolean;
    showInstallBanner?: boolean;
    theme?: 'light' | 'dark';
}
