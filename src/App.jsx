import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import TournamentManager from './components/TournamentManager'; 
import Scoreboard from './components/Scoreboard';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import PlayerDashboard from './components/PlayerDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userSubscription, setUserSubscription] = useState('FREE');
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [activeMenu, setActiveMenu] = useState(() => localStorage.getItem('basket_active_menu_v3') || 'vestiaire');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [view, setView] = useState(() => localStorage.getItem('basket_view_v3') || 'dashboard');
  const [tournaments, setTournaments] = useState([]);
  const [activeTourneyId, setActiveTourneyId] = useState(() => localStorage.getItem('basket_active_id_v3') || null);
  const [activeMatch, setActiveMatch] = useState(() => {
    try {
      const savedMatch = localStorage.getItem('basket_active_match_v3');
      return savedMatch ? JSON.parse(savedMatch) : null;
    } catch (e) { return null; }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
        fetchTournaments();
      } else {
        setLoadingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
        fetchTournaments();
      } else {
          setUserRole(null);
          setTournaments([]); 
          setLoadingAuth(false);
      }
    });

    const channel = supabase
      .channel('tournaments_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, (payload) => {
          if (payload.new) {
            setTournaments(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
          }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      // 🛠️ CORRECTION : On ne sélectionne plus que l'abonnement, "role" n'existe plus !
      const { data, error } = await supabase.from('profiles').select('subscription_tier').eq('id', userId).single();
      
      if (!error && data) {
        // Si tu as besoin de garder userRole pour ne pas casser le Scoreboard, 
        // on triche en disant que les PRO sont les nouveaux ADMIN.
        setUserRole(data.subscription_tier === 'PRO' ? 'ADMIN' : 'PLAYER'); 
        setUserSubscription(data.subscription_tier || 'FREE');
        
        const savedMenu = localStorage.getItem('basket_active_menu_v3');
        
        if (!savedMenu) {
          if (data.subscription_tier === 'PRO') setActiveMenu('dashboard_orga');
          else setActiveMenu('vestiaire');
        } 
        else if (savedMenu === 'dashboard_orga' && data.subscription_tier !== 'PRO') {
          setActiveMenu('vestiaire');
        }
      }
    } catch (error) {
      console.error("Erreur récupération profil :", error);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    if(window.confirm("Es-tu sûr de vouloir te déconnecter ?")) {
      await supabase.auth.signOut();
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setTournaments(data);
    } catch (error) {
      console.error("Erreur de chargement des tournois:", error);
    }
  };

  useEffect(() => { localStorage.setItem('basket_view_v3', view); }, [view]);
  useEffect(() => {
    if (activeMatch) localStorage.setItem('basket_active_match_v3', JSON.stringify(activeMatch));
    else localStorage.removeItem('basket_active_match_v3');
  }, [activeMatch]);
  useEffect(() => { localStorage.setItem('basket_active_id_v3', activeTourneyId || ""); }, [activeTourneyId]);

  useEffect(() => { localStorage.setItem('basket_active_menu_v3', activeMenu); }, [activeMenu]);

  const currentTourney = tournaments.find(t => t.id === activeTourneyId);

  const launchMatch = (matchId) => {
    if (!currentTourney) return;
    let match = currentTourney.schedule.find(m => m.id === matchId);
    if (!match && currentTourney.playoffs) {
      match = currentTourney.playoffs.matches.find(m => m.id === matchId);
    }
    if (match) {
      setActiveMatch({ ...match, tourneyId: activeTourneyId });
      setView('match');
    }
  };

  const finishMatch = async (scoreA, scoreB, playersA, playersB) => {
    if (!activeMatch) return;

    const currentTourney = tournaments.find(t => t.id === activeMatch.tourneyId);
    if (!currentTourney) return;

    // 1. On détermine si c'est un match de poule
    const isPoolMatch = currentTourney.schedule && currentTourney.schedule.some(m => m.id === activeMatch.id);

    // 2. On prépare les copies propres
    let newSchedule = currentTourney.schedule ? [...currentTourney.schedule] : [];
    let newPlayoffs = currentTourney.playoffs ? JSON.parse(JSON.stringify(currentTourney.playoffs)) : null;

    // 3. On injecte les stats dans le bon match
    if (isPoolMatch) {
      newSchedule = newSchedule.map(m => 
        m.id === activeMatch.id ? { ...m, status: 'finished', scoreA, scoreB, savedStatsA: playersA, savedStatsB: playersB } : m
      );
    } else if (newPlayoffs && newPlayoffs.matches) {
      newPlayoffs.matches = newPlayoffs.matches.map(m => 
        m.id === activeMatch.id ? { ...m, status: 'finished', scoreA, scoreB, savedStatsA: playersA, savedStatsB: playersB } : m
      );
    }

    const updatedTourney = { ...currentTourney, schedule: newSchedule, playoffs: newPlayoffs };

    // 4. ON SAUVEGARDE SUR SUPABASE EN PREMIER
    const { error } = await supabase.from('tournaments').update({
      schedule: newSchedule,
      playoffs: newPlayoffs
    }).eq('id', updatedTourney.id);

    if (error) {
      console.error("Erreur de sauvegarde Supabase :", error);
      alert("Erreur réseau lors de la sauvegarde du match !");
      return;
    }

    // 5. On met à jour l'écran et on nettoie le cache
    setTournaments(prev => prev.map(t => t.id === updatedTourney.id ? updatedTourney : t));
    localStorage.removeItem(`basketMatchSave_${activeMatch.id}`);
    setActiveMatch(null);
    setView('tournament');
  };

  const syncLiveScore = async (newScoreA, newScoreB) => {
    if (!activeMatch) return;
    const tourneyToUpdate = tournaments.find(t => t.id === activeMatch.tourneyId);
    if (!tourneyToUpdate) return;
    
    const isPoolMatch = tourneyToUpdate.schedule && tourneyToUpdate.schedule.some(m => m.id === activeMatch.id);
    
    if (isPoolMatch) {
      const newSchedule = tourneyToUpdate.schedule.map(m => 
        m.id === activeMatch.id ? { ...m, scoreA: newScoreA, scoreB: newScoreB } : m
      );
      await supabase.from('tournaments').update({ schedule: newSchedule }).eq('id', tourneyToUpdate.id);
    } else if (tourneyToUpdate.playoffs && tourneyToUpdate.playoffs.matches) {
      // Magie pour que les playoffs se mettent aussi à jour en direct !
      const newPlayoffMatches = tourneyToUpdate.playoffs.matches.map(m => 
        m.id === activeMatch.id ? { ...m, scoreA: newScoreA, scoreB: newScoreB } : m
      );
      await supabase.from('tournaments').update({ 
        playoffs: { ...tourneyToUpdate.playoffs, matches: newPlayoffMatches } 
      }).eq('id', tourneyToUpdate.id);
    }
  };

  const handleMenuClick = (menuId) => {
    setActiveMenu(menuId);
    setView('dashboard'); 
    setActiveTourneyId(null);
    setIsSidebarOpen(false); 
  };

  if (loadingAuth) {
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
      
      <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          {/* On aligne le gap sur celui du menu (15px) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* On force le ballon à prendre la même largeur (25px) que les icônes du menu */}
            <span style={{ minWidth: '25px', textAlign: 'center', fontSize: '1.4rem' }}>🏀</span>
            
            {!isSidebarCollapsed && (
              <span style={{ color: 'var(--accent-orange)', fontWeight: 900, letterSpacing: '2px', fontSize: '1.9rem' }}>
                SWISH
              </span>
            )}
          </div>
          
          <button 
            className="sidebar-toggle-btn desktop-only" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Déplier le menu" : "Rétracter le menu"}
          >
            {isSidebarCollapsed ? '❯' : '❮'}
          </button>

          <button 
            className="sidebar-toggle-btn mobile-only" 
            onClick={() => setIsSidebarOpen(false)}
          >
            ✕
          </button>
        </div>
        
        <div className="sidebar-menu">
          <div className="menu-category">ESPACE JOUEUR</div>
          
          <button className={`menu-item ${(activeMenu === 'vestiaire' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('vestiaire')}>
            <span className="menu-icon">👟</span> <span className="sidebar-text">Mon Vestiaire</span>
          </button>
          <button className={`menu-item ${(activeMenu === 'mercato' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('mercato')}>
            <span className="menu-icon">🤝</span> <span className="sidebar-text">Le Mercato</span>
          </button>
          <button className={`menu-item ${(activeMenu === 'carriere' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('carriere')}>
            <span className="menu-icon">📊</span> <span className="sidebar-text">Ma Carrière</span>
          </button>

          <div className="menu-category">ÉVÉNEMENTS</div>
          <button className={`menu-item ${(activeMenu === 'explorer' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('explorer')}>
            <span className="menu-icon">🌍</span> <span className="sidebar-text">Explorer les tournois</span>
          </button>

          {/* 🛠️ CORRECTION : On affiche le menu uniquement pour les abonnés PRO */}
          {userSubscription === 'PRO' && (
            <>
              <div className="menu-category">ADMINISTRATION</div>
              <button className={`menu-item ${(activeMenu === 'dashboard_orga' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('dashboard_orga')}>
                <span className="menu-icon">🛰️</span> <span className="sidebar-text">Centre de Contrôle</span>
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="app-main">
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
            <span style={{ color: '#ccc', fontSize: '0.8rem' }}>{session.user.email}</span>
            <button onClick={handleLogout} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Déconnexion
            </button>
          </div>
        </header>

        <div className="app-content">
          <div className="app-container">
            
            {/* NOUVEAU : On passe l'onglet actif (currentTab) au PlayerDashboard ! */}
            {view === 'dashboard' && ['vestiaire', 'mercato', 'carriere', 'explorer'].includes(activeMenu) && (
              <PlayerDashboard 
                 session={session} 
                 currentTab={activeMenu} 
                 setActiveTourneyId={setActiveTourneyId} 
                 setView={setView} 
              />
            )}
            
            {view === 'dashboard' && activeMenu === 'dashboard_orga' && (
              <Dashboard tournaments={tournaments} setTournaments={setTournaments} setActiveTourneyId={setActiveTourneyId} setView={setView} userRole={userRole} userSubscription={userSubscription} session={session} />
            )}
            
            {view === 'tournament' && currentTourney && (
              <TournamentManager tourney={currentTourney} setTournaments={setTournaments} onLaunchMatch={launchMatch} userRole={userRole} session={session} />
            )}
            
            {view === 'match' && activeMatch && (
              <Scoreboard 
                matchId={activeMatch.id}
                teamA={activeMatch.teamA} 
                teamB={activeMatch.teamB} 
                savedStatsA={activeMatch.savedStatsA}
                savedStatsB={activeMatch.savedStatsB}
                isFinished={activeMatch.status === 'finished'}
                
                /* 👇 LA CORRECTION EST ICI 👇 */
                onExit={() => { 
                  setView('tournament'); 
                  setActiveMatch(null); /* 🧹 On vide la mémoire pour forcer le rechargement au prochain clic ! */
                }} 
                /* 👆 ---------------------- 👆 */

                onMatchFinished={finishMatch} 
                userRole={userRole}
                onLiveUpdate={syncLiveScore}
                tourney={currentTourney} 
              />
            )}
          </div>
        </div>
      </main>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />
      )}

    </div>
  );
}