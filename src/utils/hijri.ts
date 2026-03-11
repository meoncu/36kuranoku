export const HIJRI_MONTHS = [
    "Muharrem", "Safer", "Rebîülevvel", "Rebîülâhir",
    "Cemâziyelevvel", "Cemâziyelâhir", "Receb", "Şaban",
    "Ramazan", "Şevval", "Zilkade", "Zilhicce"
];

export function getHijriDate(date: Date = new Date(), offset: number = 0) {
    const adjustedDate = new Date(date);
    if (offset !== 0) {
        adjustedDate.setDate(adjustedDate.getDate() + offset);
    }

    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    });

    const parts = formatter.formatToParts(adjustedDate);
    const day = parts.find(p => p.type === 'day')?.value || "";
    const month = parts.find(p => p.type === 'month')?.value || "";
    const year = parts.find(p => p.type === 'year')?.value || "";

    const monthIndex = parseInt(month) - 1;
    const monthName = HIJRI_MONTHS[monthIndex] || month;

    return {
        day: parseInt(day),
        monthName,
        year: parseInt(year),
        full: `${day} ${monthName} ${year}`
    };
}

export function formatHijriShort(date: Date, offset: number = 0) {
    const { day, monthName } = getHijriDate(date, offset);
    return `${day} ${monthName}`;
}

export function calculatePlannedJuz(startDate: Date, startJuz: number, dailyCount: number = 1, offset: number = 0) {
    const today = new Date();
    if (offset !== 0) {
        today.setDate(today.getDate() + offset);
    }
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - start.getTime();
    if (diffTime < 0) return startJuz; // Haven't started yet

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const juzToRead = ((startJuz - 1 + (diffDays * dailyCount)) % 30) + 1;

    return juzToRead;
}

export function hijriToGregorian(hYear: number, hMonth: number, hDay: number, offset: number = 0): Date {
    // Better approximation: G ≈ H * 0.970229 + 621.5643
    // This gives a very close Gregorian year.
    let date = new Date(Math.floor(hYear * 0.970229 + 621.5643), hMonth - 1, hDay);
    date.setHours(12, 0, 0, 0);

    // Iterative search for the exact match
    // Since our approximation is close, 100 iterations are plenty
    for (let i = 0; i < 100; i++) {
        const h = getHijriDate(date, offset);
        const mIndex = HIJRI_MONTHS.indexOf(h.monthName) + 1;

        if (h.year === hYear && mIndex === hMonth && h.day === hDay) {
            return date;
        }

        // Calculate difference in days
        // Hijri year is approx 354.36 days, month approx 29.53 days
        const diff = (hYear - h.year) * 354.36 + (hMonth - mIndex) * 29.53 + (hDay - h.day);

        // Adjust the date by the difference
        const dayAdjustment = Math.sign(diff) * Math.max(1, Math.abs(Math.round(diff)));
        date.setDate(date.getDate() + dayAdjustment);
    }
    return date;
}
