/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 'sans' remplace la police par défaut de tout le site (Texte en Arial)
        sans: ['Arial', 'Helvetica', 'sans-serif'],
        // 'heading' crée notre police pour les titres (Poppins)
        heading: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}