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
    <header className="sticky top-0 z-40 w-full flex items-center justify-between h-16 px-4 sm:px-6 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all">
      
      {/* ZONE GAUCHE : Burger & Bouton Retour */}
      <div className="flex items-center gap-3 flex-1">
        
        {/* Bouton Burger Premium (Mobile uniquement) */}
        <button 
          className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all shadow-sm active:scale-95 cursor-pointer" 
          onClick={() => setIsSidebarOpen(true)}
          title="Ouvrir le menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Bouton Retour (Glassmorphism) */}
        {view === 'tournament' && currentTourney && (
          <button 
            onClick={() => setView('dashboard')} 
            className="group flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-semibold text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline tracking-wide">Retour au menu</span>
          </button>
        )}
      </div>
      
      {/* ZONE DROITE : Utilisateur & Déconnexion */}
      <div className="flex items-center gap-4 shrink-0">
        
        {/* Badge Utilisateur Moderne (Caché sur très petits écrans) */}
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 shadow-inner">
          <div className="relative flex items-center justify-center w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full opacity-75 bg-emerald-400 animate-ping"></span>
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
          <span className="text-blue-100 text-xs sm:text-sm font-semibold tracking-wide truncate max-w-[150px] lg:max-w-[250px]">
            {session?.user?.user_metadata?.first_name || session?.user?.user_metadata?.prenom} {session?.user?.user_metadata?.last_name || session?.user?.user_metadata?.nom}
            {!session?.user?.user_metadata?.first_name && !session?.user?.user_metadata?.prenom && session?.user?.email}
          </span>
        </div>
        
        {/* Bouton Déconnexion (Glow rouge au survol) */}
        <button 
          onClick={handleLogout} 
          className="group p-2 sm:p-2.5 rounded-xl bg-black/20 border border-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all shadow-sm active:scale-95 cursor-pointer" 
          title="Se déconnecter"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform duration-300">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>

      </div>
    </header>
  );
}