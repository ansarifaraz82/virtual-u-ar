/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Instrument Serif', 'serif'],
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'zoom-in': 'zoom-in 0.7s cubic-bezier(0.25, 1, 0.5, 1) forwards',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards',
      },
    },
  },
  plugins: [],
}