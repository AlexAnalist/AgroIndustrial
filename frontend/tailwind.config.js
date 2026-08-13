/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          light: '#f0f9ff',
          DEFAULT: '#0369a1',
          dark: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}
