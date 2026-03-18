/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // <--- ADD THIS LINE
  theme: {
    extend: {
      colors: {
        primary: '#1e3a8a',
        secondary: '#dbeafe',
        darkBg: '#1f2937', // Dark gray for dark mode
      }
    },
  },
  plugins: [],
}