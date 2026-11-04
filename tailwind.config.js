/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        accent: "#FF3C00",
        accentSec: "#FFD60A"
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        outfit: ['"Outfit"', 'sans-serif'],
      },
      screens: {
        '3xl': '1920px',
      }
    },
  },
  plugins: [],
}
