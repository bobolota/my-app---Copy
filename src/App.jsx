import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import TournamentManager from './components/TournamentManager'; 
import Scoreboard from './components/Scoreboard';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import PlayerDashboard from './components/PlayerDashboard';
import { Toaster } from 'react-hot-toast';
import ConfirmModal from './components/ConfirmModal';
import PromptModal from './components/PromptModal';
import { useAuth } from './context/AuthContext';
import { useAppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

// DEBUT DE LA MODIFICATION - App.jsx

export default function App() {
  // 1. On aspire toutes les données depuis nos DEUX nuages ! ☁️☁️
  const { session, loading } = useAuth();
  const {
    userRole, userSubscription,
    tournaments, setTournaments,
    activeTourneyId, setActiveTourneyId,
    currentTourney,
    view, setView,
    activeMenu, setActiveMenu,
    activeMatch, setActiveMatch, launchMatch, finishMatch, syncLiveScore,
    confirmData, closeConfirm,
    promptData, closePrompt

  } = useAppContext();

  // 2. On garde uniquement les états locaux de l'interface (menus, modales, match en cours)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    
  if (loading) { // 👈 On utilise la variable du nuage !
    
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--accent-orange)', fontSize: '1.5rem', background: '#111' }}>
        Chargement de l'application... 🏀
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    
    <div className="app-layout">
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff' } }} />
      
      <Sidebar 
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />


      <main className="app-main">

        <Topbar setIsSidebarOpen={setIsSidebarOpen} />

        <div className="app-content">
          <div className="app-container">
            
            {/* NOUVEAU : On passe l'onglet actif (currentTab) au PlayerDashboard ! */}
            {view === 'dashboard' && ['vestiaire', 'mercato', 'carriere', 'explorer'].includes(activeMenu) && (
              <PlayerDashboard />
            )}
            
            {view === 'dashboard' && activeMenu === 'dashboard_orga' && (
              <Dashboard />
            )}
            
            {view === 'tournament' && currentTourney && (
              <TournamentManager />
            )}
            
            {view === 'match' && activeMatch && (
              <Scoreboard 
                key={activeMatch.id} // 🛠️ LA CLÉ UNIQUE ICI
                matchId={activeMatch.id}
                teamA={activeMatch.teamA}                
                teamB={activeMatch.teamB} 
                savedStatsA={activeMatch.savedStatsA}
                savedStatsB={activeMatch.savedStatsB}
                isFinished={activeMatch.status === 'finished'}
                onExit={() => { 
                  setView('tournament'); 
                  setActiveMatch(null); // 🛠️ On nettoie ici aussi !
                }}
                onMatchFinished={finishMatch} 
                userRole={userRole}
                onLiveUpdate={syncLiveScore}
                tourney={currentTourney} /* 🛠️ LA LIGNE MAGIQUE À AJOUTER EST ICI */
              />
            )}
          </div>
        </div>
      </main>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />
      )}

      {/* --- MODALES GLOBALES DU DASHBOARD --- */}
      <ConfirmModal 
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        onConfirm={() => {
          if (confirmData.onConfirm) confirmData.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
        isDanger={confirmData.isDanger}
      />

      <PromptModal 
        isOpen={promptData.isOpen}
        title={promptData.title}
        message={promptData.message}
        placeholder={promptData.placeholder}
        onConfirm={(value) => {
          if (promptData.onConfirm) promptData.onConfirm(value);
          closePrompt();
        }}
        onCancel={closePrompt}
      />
    </div> // (Ou </>) - C'est la fin de ton composant App
  );
}