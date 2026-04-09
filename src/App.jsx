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

    
  if (loading) {
    return <div className="min-h-screen bg-app-bg"></div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    
    <div className="app-layout">
      {/* Mise à jour du Toaster avec les couleurs Hex de la charte (app-card et bordure glassmorphism) */}
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          duration: 3000, 
          style: { background: '#1A2B1F', color: '#fff', border: '1px solid #ffffff1a' } 
        }} 
      />
      
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
            {view === 'dashboard' && ['vestiaire', 'mercato', 'carriere', 'explorer', 'arbitrage'].includes(activeMenu) && (
              <PlayerDashboard />
              
            )}
            
            {view === 'dashboard' && activeMenu === 'dashboard_orga' && (
              <Dashboard />
            )}
            
            {view === 'tournament' && currentTourney && (
              <TournamentManager />
            )}
            
            {view === 'match' && activeMatch && (
              <Scoreboard key={activeMatch.id} />
            )}
            
          </div>
        </div>
      </main>

      {/* Remplacement du style en ligne par les classes natives de Tailwind */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/50 z-[999]" 
        />
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