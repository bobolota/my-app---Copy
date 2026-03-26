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
  const [loadingAuth, setLoadingAuth] = useState(true);

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
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (!error && data) {
        setUserRole(data.role);
        
        // On vérifie si l'utilisateur avait déjà un menu d'ouvert
        const savedMenu = localStorage.getItem('basket_active_menu_v3');
        
        if (!savedMenu) {
          // 1ère connexion : on envoie les orgas vers le dashboard, et les autres au vestiaire
          if (data.role === 'ADMIN' || data.role === 'ORGANIZER') setActiveMenu('dashboard_orga');
          else setActiveMenu('vestiaire');
        } 
        else if (savedMenu === 'dashboard_orga' && data.role !== 'ADMIN' && data.role !== 'ORGANIZER') {
          // Sécurité : si un joueur normal a "dashboard_orga" en mémoire, on le renvoie au vestiaire
          setActiveMenu('vestiaire');
        }
        // Si c'est un orga et qu'il était sur "explorer", on ne touche à rien !
      }
    } catch (error) {
      console.error("Erreur récupération rôle :", error);
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
      
      <aside className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">SWISH 🏀</div>
        
        <div className="sidebar-menu">
          <div className="menu-category">ESPACE JOUEUR</div>
          
          {/* NOUVEAU : On a activé les 3 boutons ! */}
          <button className={`menu-item ${(activeMenu === 'vestiaire' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('vestiaire')}>
            👟 Mon Vestiaire
          </button>
          <button className={`menu-item ${(activeMenu === 'mercato' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('mercato')}>
            🤝 Le Mercato
          </button>
          <button className={`menu-item ${(activeMenu === 'carriere' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('carriere')}>
            📊 Ma Carrière
          </button>

          <div className="menu-category">ÉVÉNEMENTS</div>
          <button className={`menu-item ${(activeMenu === 'explorer' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('explorer')}>
            🌍 Explorer les tournois
          </button>

          {(userRole === 'ADMIN' || userRole === 'ORGANIZER') && (
            <>
              <div className="menu-category">ADMINISTRATION</div>
              <button className={`menu-item ${(activeMenu === 'dashboard_orga' && view === 'dashboard') ? 'active' : ''}`} onClick={() => handleMenuClick('dashboard_orga')}>
                🛰️ Centre de Contrôle
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
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
              <Dashboard tournaments={tournaments} setTournaments={setTournaments} setActiveTourneyId={setActiveTourneyId} setView={setView} userRole={userRole} session={session} />
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
                onExit={() => setView('tournament')} 
                onMatchFinished={finishMatch} 
                userRole={userRole}
                onLiveUpdate={syncLiveScore}
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