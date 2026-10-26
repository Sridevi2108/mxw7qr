/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#148937',
          hover: '#0f702c',
          light: '#f1faf3',
          border: 'rgba(20, 137, 55, 0.22)',
          shadow: 'rgba(20, 137, 55, 0.15)',
        },
        ink: {
          DEFAULT: '#2b2a2a',
          muted: '#5a5856',
          dark: '#1a1a1a',
          subtle: '#8a8885',
        },
        canvas: {
          DEFAULT: '#fcfcfc',
          warm: '#f8f6f2',
          card: '#ffffff',
          dark: '#191919',
        },
        surface: {
          DEFAULT: '#ffffff',
          warm: '#f8f6f2',
          tint: '#f3f2ee',
        },
        line: {
          DEFAULT: '#e6e4dd',
          subtle: '#eceae4',
          muted: '#dfded7',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
