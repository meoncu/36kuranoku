/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#1a5f7a',
                    foreground: '#ffffff',
                },
                secondary: {
                    DEFAULT: '#c9a66b',
                    foreground: '#ffffff',
                },
                background: '#0f172a',
                foreground: '#f8fafc',
                card: {
                    DEFAULT: 'rgba(30, 41, 59, 0.7)',
                    foreground: '#f8fafc',
                }
            },
            borderRadius: {
                lg: "0.5rem",
                md: "calc(0.5rem - 2px)",
                sm: "calc(0.5rem - 4px)",
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}
