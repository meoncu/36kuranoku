export interface TajweedSegment {
    text: string;
    type: string;
}

/**
 * Parses a tajweed-annotated string into segments.
 * Correctly handles nested tags and stop signs (secavends).
 */
export const parseTajweedString = (html: string): TajweedSegment[] => {
    if (!html) return [];

    // Check for stop signs (secavends) in the text and wrap them if they aren't
    const stopSigns = ['ۖ', 'ۗ', 'ۚ', 'ۛ', 'ۙ', 'ۘ', 'ۜ', 'ؗ'];
    let processedHtml = html;

    // If the API didn't tag stop signs, we should highlight them (usually red in Turkey Mushaf)
    stopSigns.forEach(sign => {
        if (processedHtml.includes(sign) && !processedHtml.includes(`class="stop"`)) {
            processedHtml = processedHtml.split(sign).join(`<span class="stop-sign">${sign}</span>`);
        }
    });

    try {
        const segments: TajweedSegment[] = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<html><body><div id="root">${processedHtml}</div></body></html>`, 'text/html');
        const root = doc.getElementById('root');

        if (!root) return [{ text: html, type: 'default' }];

        const traverse = (node: Node, parentClass: string = 'default') => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text) {
                    segments.push({ text, type: parentClass });
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                const currentClass = element.getAttribute('class') || parentClass;
                element.childNodes.forEach(child => traverse(child, currentClass));
            }
        };

        root.childNodes.forEach(child => traverse(child));
        return segments;
    } catch (error) {
        return [{ text: html.replace(/<[^>]+>/g, ''), type: 'default' }];
    }
};

export const getTajweedClassName = (type: string): string => {
    const t = type.toLowerCase();

    // Red for stop signs above text (structural, usually kept)
    if (t === 'stop-sign') return 'text-inherit opacity-80 text-[0.6em] align-super px-0.5';

    return 'text-inherit';
};
