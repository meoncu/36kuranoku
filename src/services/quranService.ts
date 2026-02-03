import axios from 'axios';

const API_BASE = 'https://api.quran.com/api/v4';

export interface QuranWord {
    id: number;
    text_uthmani: string;
    text_uthmani_tajweed: string; // New field from v4 API
    line_number: number;
    char_type_name: 'word' | 'end' | 'pause' | 'sajdah';
    page_number: number;
    position: number;
    verse_key?: string;
}

export interface PageData {
    pageNumber: number;
    lines: { [key: number]: (QuranWord & { tagged_text: string })[] };
}

export const quranService = {
    async getPage(pageNumber: number): Promise<PageData> {
        // v4 API allows fetching everything in one go with word-level tajweed
        const response = await axios.get(`${API_BASE}/verses/by_page/${pageNumber}`, {
            params: {
                words: true,
                word_fields: 'line_number,text_uthmani,text_uthmani_tajweed,verse_key,id,position,char_type_name',
                mushaf: 1
            }
        });

        const lines: { [key: number]: (QuranWord & { tagged_text: string })[] } = {};

        response.data.verses.forEach((v: any) => {
            v.words.forEach((w: any) => {
                const ln = w.line_number;
                if (!lines[ln]) lines[ln] = [];

                lines[ln].push({
                    ...w,
                    tagged_text: w.text_uthmani_tajweed || w.text_uthmani
                });
            });
        });

        return {
            pageNumber,
            lines
        };
    },

    async getVerseTranslation(verseKey: string): Promise<string> {
        try {
            // Using translation ID 77 (Diyanet Vakfı) - reliable Turkish translation
            const response = await axios.get(`${API_BASE}/verses/by_key/${verseKey}`, {
                params: {
                    translations: 77,
                    // Removing fields restriction to ensure we get what we need
                }
            });
            const translations = response.data.verse.translations;
            if (translations && translations.length > 0) {
                return translations[0].text.replace(/<[^>]*>?/gm, ''); // remove HTML tags if any
            }
            return 'Meâl bulunamadı.';
        } catch (error) {
            console.error("Error fetching translation:", error);
            return 'Meâl yüklenirken hata oluştu.';
        }
    },

    async getVerse(verseKey: string): Promise<string> {
        try {
            const response = await axios.get(`${API_BASE}/verses/by_key/${verseKey}`, {
                params: {
                    fields: 'text_uthmani',
                    translations: '' // no translations needed
                }
            });
            return response.data.verse.text_uthmani;
        } catch (error) {
            console.error("Error fetching verse:", error);
            return '';
        }
    },

    async getVerseRecitation(verseKey: string): Promise<{ url: string; segments?: any[] } | null> {
        try {
            // Recitation 7 is Mishary Rashid Alafasy
            // We request segments/timestamps if available
            const response = await axios.get(`${API_BASE}/recitations/7/by_ayah/${verseKey}`, {
                params: {
                    segments: true
                }
            });
            const audioFiles = response.data.audio_files;
            if (audioFiles && audioFiles.length > 0) {
                const file = audioFiles[0];
                const url = file.url.startsWith('http')
                    ? file.url
                    : `https://verses.quran.com/${file.url}`;

                // Some endpoints return 'verse_timings', others 'segments'. 
                // v4 usually puts segments or verse_timings in the object.
                // We will check for 'verse_timings' which usually contain segments: []
                const segments = file.verse_timings?.segments || file.segments || [];

                return { url, segments };
            }
            return null;
        } catch (error) {
            console.error("Error fetching recitation:", error);
            return null;
        }
    },

    async getVerseWordByWord(verseKey: string): Promise<any[]> {
        try {
            const response = await axios.get(`${API_BASE}/verses/by_key/${verseKey}`, {
                params: {
                    language: 'tr',
                    words: true,
                    word_fields: 'text_uthmani,translation',
                    word_translation_language: 'tr'
                }
            });
            return response.data.verse.words || [];
        } catch (error) {
            console.error("Error fetching word by word:", error);
            return [];
        }
    }
};
