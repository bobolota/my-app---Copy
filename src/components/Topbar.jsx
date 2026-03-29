// DEBUT DE LA MODIFICATION - src/components/Topbar.jsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function Topbar({ setIsSidebarOpen }) {
  // On aspire les données d'authentification et du nuage central
  const { session } = useAuth();
  const { view, setView, currentTourney, setConfirmData } = useAppContext();

  // La fonction de déconnexion habite maintenant ici !
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
      {/* Le bouton Burger classique, on le garde UNIQUEMENT pour le mobile */}
      <button className="hamburger-btn mobile-only" onClick={() => setIsSidebarOpen(true)}>
        ☰
      </button>
      
      <div style={{ flex: 1 }}>
        {view === 'tournament' && currentTourney && (
          <button onClick={() => setView('dashboard')} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
            ⬅ Retour au menu
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ color: '#ccc', fontSize: '0.9rem', fontWeight: 'bold' }}>
    {session?.user?.user_metadata?.first_name || session?.user?.user_metadata?.prenom} {session?.user?.user_metadata?.last_name || session?.user?.user_metadata?.nom}
    {/* 💡 Si le prénom/nom n'existe pas, on affiche l'email par défaut */}
    {!session?.user?.user_metadata?.first_name && !session?.user?.user_metadata?.prenom && session?.user?.email}
  </span>
        <button onClick={handleLogout} className="logout-btn" title="Se déconnecter">
    {/* Jolie icône SVG de "sortie" */}
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
// FIN DE LA MODIFICATION