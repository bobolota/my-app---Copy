import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import TournamentManager from './components/TournamentManager'; 
import Scoreboard from './components/Scoreboard';

export default function App() {
  const [view, setView] = useState(() => {
    return localStorage.getItem('basket_view_v3') || 'dashboard';
  });
  
  const [tournaments, setTournaments] = useState(() => {
    try {
      const saved = localStorage.getItem('basket_tournaments_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [activeTourneyId, setActiveTourneyId] = useState(() => {
    const savedId = localStorage.getItem('basket_active_id_v3');
    // Sécurité : Si on a des tournois mais pas d'ID actif, on prend le premier
    if (!savedId && tournaments.length > 0) return tournaments[0].id;
    return savedId || null;
  });

  const [activeMatch, setActiveMatch] = useState(() => {
    try {
      const savedMatch = localStorage.getItem('basket_active_match_v3');
      return savedMatch ? JSON.parse(savedMatch) : null;
    } catch (e) { return null; }
  });

  useEffect(() => {
    localStorage.setItem('basket_view_v3', view);
  }, [view]);

  useEffect(() => {
    if (activeMatch) {
      localStorage.setItem('basket_active_match_v3', JSON.stringify(activeMatch));
    } else {
      localStorage.removeItem('basket_active_match_v3');
    }
  }, [activeMatch]);

  useEffect(() => {
    localStorage.setItem('basket_tournaments_v3', JSON.stringify(tournaments));
  }, [tournaments]);

  useEffect(() => {
    localStorage.setItem('basket_active_id_v3', activeTourneyId || "");
  }, [activeTourneyId]);

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

  const finishMatch = (scoreA, scoreB, playersA, playersB) => {
    if (activeMatch) {
      setTournaments(prev => prev.map(t => {
        if (t.id === activeMatch.tourneyId) {
          const isPoolMatch = t.schedule.some(m => m.id === activeMatch.id);
          if (isPoolMatch) {
            const newSchedule = t.schedule.map(m => 
              m.id === activeMatch.id ? { 
                ...m, status: 'finished', scoreA, scoreB,
                savedStatsA: playersA, savedStatsB: playersB 
              } : m
            );
            return { ...t, schedule: newSchedule };
          } 
          
          if (t.playoffs) {
            const newPlayoffMatches = t.playoffs.matches.map(m => 
              m.id === activeMatch.id ? { 
                ...m, status: 'finished', scoreA, scoreB,
                savedStatsA: playersA, savedStatsB: playersB 
              } : m
            );
            return { ...t, playoffs: { ...t.playoffs, matches: newPlayoffMatches } };
          }
        }
        return t;
      }));
      
      localStorage.removeItem(`basketMatchSave_${activeMatch.id}`);
    }
    setActiveMatch(null);
    setView('tournament');
  };

  return (
    <div className="app-container">
      {view !== 'match' && (
        <nav className="view-tabs" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button className={`btn-tab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>🏠 MES TOURNOIS</button>
          {currentTourney && (
            <button className={`btn-tab ${view === 'tournament' ? 'active' : ''}`} onClick={() => setView('tournament')}>🏆 {currentTourney.name}</button>
          )}
        </nav>
      )}

      {view === 'dashboard' && (
        <Dashboard tournaments={tournaments} setTournaments={setTournaments} setActiveTourneyId={setActiveTourneyId} setView={setView} />
      )}

      {view === 'tournament' && currentTourney && (
        <TournamentManager tourney={currentTourney} setTournaments={setTournaments} onLaunchMatch={launchMatch} />
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
        />
      )}
    </div>
  );
}