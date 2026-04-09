/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🌑 Les fonds (Ambiance Comsimple - Vert Forêt / Noir profond)
        app: {
          bg: '#0A100D',       // Fond global de la page
          panel: '#121E16',    // Fond des gros blocs et modales (glassmorphisme)
          card: '#1A2B1F',     // Fond des petites cartes
          input: '#050806',    // Fond des champs de texte
        },
        // 🌫️ Gris Sauge (pour s'intégrer aux fonds verts)
        muted: {
          DEFAULT: '#8E9F90',  // Texte secondaire normal
          light: '#D1D9D2',    // Texte secondaire clair
          dark: '#546B56',     // Texte secondaire sombre
          line: '#ffffff1a',   // Bordures (white/10 pour le glassmorphisme)
        },
        // 🟢 Accent Principal : Vert Lime (Validations, succès, éléments clés)
        primary: {
          DEFAULT: '#A3E635',  
          dark: '#84cc16',     
          light: '#bef264',
        },
        // 🟠 Accent Secondaire : Orange Vif (Équipe A, Boutons secondaires)
        secondary: {
          DEFAULT: '#F97316',  
          dark: '#ea580c',     
          light: '#fdba74',
        },
        // 🔵 Accent Action : Cyan Électrique (Équipe B, Liens, Onglets)
        action: {
          DEFAULT: '#06B6D4',  
          dark: '#0891b2',     
          light: '#67e8f9',
        },
        // 🔴 Alertes (Fautes, annulations, exclusions)
        danger: {
          DEFAULT: '#EF4444',  
          dark: '#dc2626',     
        },
        // 🟡 Avertissements
        warning: {
          DEFAULT: '#eab308',  
        }
      }
    },
  },
  plugins: [],
}