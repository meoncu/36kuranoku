import { useState, useEffect } from 'react';

export const useMushafSettings = () => {
    const [fontSize, setFontSize] = useState(() => {
        const saved = localStorage.getItem('mushaf-font-size');
        return saved ? Number(saved) : 32;
    });

    const [fontFamily, setFontFamily] = useState(() => {
        return localStorage.getItem('mushaf-font-family') || "'Diyanet Hamdullah', serif";
    });

    useEffect(() => {
        document.documentElement.style.setProperty('--mushaf-font', fontFamily);
        document.documentElement.style.setProperty('--mushaf-size', `${fontSize}px`);
        localStorage.setItem('mushaf-font-family', fontFamily);
        localStorage.setItem('mushaf-font-size', fontSize.toString());
    }, [fontFamily, fontSize]);

    return {
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily
    };
};
