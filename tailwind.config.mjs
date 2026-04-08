/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#edfcff',
          100: '#d6f6ff',
          200: '#b5f0ff',
          300: '#83e7ff',
          400: '#48d4ff',
          500: '#1eb5ff',
          600: '#0697ff',
          700: '#0088a9',
          800: '#085f7a',
          900: '#0d4f65',
          950: '#0a3344',
        },
        surface: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e2',
          300: '#b1b9c9',
          400: '#8793ab',
          500: '#687691',
          600: '#535f78',
          700: '#444d62',
          800: '#3b4253',
          900: '#1a1d27',
          950: '#12141b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
