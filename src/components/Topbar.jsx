import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function Topbar({ setIsSidebarOpen }) {
  const { session } = useAuth();
  const { view, setView, currentTourney, setConfirmData } = useAppContext();

  const handleLogout = () => {
    setConfirmData({
      isOpen: true,
      title: "Déconnexion",
      message: "Êtes-vous sûr de vouloir vous déconnecter ?",
      isDanger: true,
      onConfirm: async () => {
        await supabase.auth.signOut();
      }
    });
  };

  return (
    <header className="app-topbar">
      {/* Le bouton Burger classique pour le mobile */}
      <button className="hamburger-btn mobile-only" onClick={() => setIsSidebarOpen(true)}>
        ☰
      </button>
      
      {/* 👇 Tailwind: flex-1 permet de prendre tout l'espace disponible au centre 👇 */}
      <div className="flex-1">
        {view === 'tournament' && currentTourney && (
          <button 
            onClick={() => setView('dashboard')} 
            // Tailwind: texte gris, gras, sans fond, avec un bel effet au survol (hover)
            className="bg-transparent text-[var(--text-muted)] font-bold text-base cursor-pointer hover:text-white transition-colors duration-200"
          >
            ⬅ <span className="hidden sm:inline">Retour au menu</span> {/* "hidden sm:inline" cache le texte sur mobile et le montre sur tablette/PC */}
          </button>
        )}
      </div>
      
      {/* 👇 Tailwind: flex, centrage vertical (items-center) et espacement (gap-4 = 16px) 👇 */}
      <div className="flex items-center gap-4">
        
        {/* "hidden sm:block" empêche le nom d'écraser la barre sur un tout petit écran de téléphone */}
        <span className="text-[#ccc] text-sm font-bold hidden sm:block">
          {session?.user?.user_metadata?.first_name || session?.user?.user_metadata?.prenom} {session?.user?.user_metadata?.last_name || session?.user?.user_metadata?.nom}
          {!session?.user?.user_metadata?.first_name && !session?.user?.user_metadata?.prenom && session?.user?.email}
        </span>
        
        <button 
          onClick={handleLogout} 
          className="logout-btn text-gray-400 hover:text-red-500 transition-colors duration-200" 
          title="Se déconnecter"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>

      </div>
    </header>
  );
}