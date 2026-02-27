export const HIJRI_MONTHS = [
    "Muharrem", "Safer", "Rebîülevvel", "Rebîülâhir",
    "Cemâziyelevvel", "Cemâziyelâhir", "Receb", "Şaban",
    "Ramazan", "Şevval", "Zilkade", "Zilhicce"
];

export function getHijriDate(date: Date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    });

    const parts = formatter.formatToParts(date);
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

export function formatHijriShort(date: Date) {
    const { day, monthName } = getHijriDate(date);
    return `${day} ${monthName}`;
}

export function calculatePlannedJuz(startDate: Date, startJuz: number, dailyCount: number = 1) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - start.getTime();
    if (diffTime < 0) return startJuz; // Haven't started yet

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const juzToRead = ((startJuz - 1 + (diffDays * dailyCount)) % 30) + 1;

    return juzToRead;
}
