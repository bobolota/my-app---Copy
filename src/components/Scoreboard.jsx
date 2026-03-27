import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf'; // NOUVEAU
import html2canvas from 'html2canvas'; // NOUVEAU

// --- COMPOSANTS INTERNES ---

const BoxscoreTable = ({ title, players, color }) => {
  const formatPlayerTime = (sec) => {
    const safeSec = Number(sec) || 0;
    return `${Math.floor(safeSec / 60).toString().padStart(2, '0')}:${(safeSec % 60).toString().padStart(2, '0')}`;
  };

  if (!players) return null;

  return (
    <div className="boxscore-team">
      <h3 className="boxscore-title" style={{ color: color || 'white' }}>{title}</h3>
      <table className="boxscore-table">
        <thead>
          <tr>
            <th className="text-left">N°</th>
            <th className="text-left">JOUEUR</th>
            <th>MIN</th>
            <th>PTS</th>
            <th>TIRS</th>
            <th>3PT</th>
            <th>LF</th>
            <th>+/-</th>
            <th>AST</th>
            <th>OREB</th>
            <th>DREB</th>
            <th>REB</th>
            <th>STL</th>
            <th>BLK</th>
            <th>TOV</th>
            <th>FLS</th>
            <th>EFF</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => {
            const pts = p.points || 0;
            const fg2m = p.fg2m || 0; const fg2a = p.fg2a || 0;
            const fg3m = p.fg3m || 0; const fg3a = p.fg3a || 0;
            const ftm = p.ftm || 0;   const fta = p.fta || 0;
            const ast = p.ast || 0;
            const oreb = p.oreb || 0; const dreb = p.dreb || 0;
            const stl = p.stl || 0;   const blk = p.blk || 0; 
            const tov = p.tov || 0;   const fouls = p.fouls || 0;
            const pm = p.plusMinus || 0;

            const pmColor = pm > 0 ? 'var(--success)' : (pm < 0 ? 'var(--danger)' : 'var(--text-muted)');
            
            const isExcluded = fouls >= 5 || (p.techFouls || 0) >= 2 || (p.antiFouls || 0) >= 2 || p.isDisqualified;

            const fgm = fg2m + fg3m;
            const fga = fg2a + fg3a;
            const reb = oreb + dreb;
            const missedFG = fga - fgm;
            const missedFT = fta - ftm;
            
            const eff = (pts + reb + ast + stl + blk) - (missedFG + missedFT + tov);

            return (
              <tr key={p.id}>
                <td className="text-left">{p.number}</td>
                <td className="text-left">{p.name} {p.status === 'court' && <span style={{color: 'var(--accent-orange)'}}>*</span>}</td>
                <td>{formatPlayerTime(p.timePlayed)}</td>
                <td className="stat-highlight">{pts}</td>
                <td>{fgm}/{fga}</td>
                <td>{fg3m}/{fg3a}</td>
                <td>{ftm}/{fta}</td>
                <td style={{ color: pmColor, fontWeight: 'bold' }}>{pm > 0 ? `+${pm}` : pm}</td>
                <td>{ast}</td>
                <td>{oreb}</td>
                <td>{dreb}</td>
                <td className="stat-highlight">{reb}</td>
                <td>{stl}</td>
                <td>{blk}</td>
                <td>{tov}</td>
                <td className={isExcluded ? "fouls-alert" : ""}>{fouls}</td>
                <td className="stat-highlight" style={{ fontWeight: 'bold', color: eff >= 15 ? 'var(--success)' : (eff < 0 ? 'var(--danger)' : 'inherit') }}>{eff}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const PlayerCard = ({ team, player, onPlayerClick, pendingSubs, pendingAction, onConfirm, hasGlobalAction, pendingAssist, activeActionType, canEdit }) => {
  const isSubSelected = pendingSubs && pendingSubs.includes(player.id);
  const isPendingScore = pendingAction?.playerId === player.id;
  
  const isExcluded = player.fouls >= 5 || (player.techFouls || 0) >= 2 || (player.antiFouls || 0) >= 2 || player.isDisqualified;
  let excluReason = '5 FAUTES';
  if (player.isDisqualified) excluReason = 'DISQ';
  else if ((player.techFouls || 0) >= 2 || (player.antiFouls || 0) >= 2) excluReason = 'EXCLU';

  let isTargetable = false;
  if (canEdit) {
    if (activeActionType === 'STARTERS') isTargetable = true;
    else if (activeActionType === 'SUB') isTargetable = !(isExcluded && player.status === 'bench');
    else if (pendingAssist) isTargetable = (team === pendingAssist.team && player.id !== pendingAssist.scorerId && player.status === 'court');
    else if (hasGlobalAction) isTargetable = (player.status === 'court' && !isPendingScore);
  }

  // Astuce : On ne récupère que les stats qui sont supérieures à 0 pour gagner de la place !
  const minorStats = [
    { label: 'AS', val: player.ast },
    { label: 'RB', val: (player.oreb || 0) + (player.dreb || 0) },
    { label: 'ST', val: player.stl },
    { label: 'BL', val: player.blk },
    { label: 'TO', val: player.tov }
  ].filter(s => s.val > 0);

  return (
    <div 
        className={`pc-card ${isSubSelected ? 'pc-sub' : ''} ${isPendingScore ? 'pc-pending' : ''} ${isTargetable ? 'pc-target' : ''} ${(isExcluded && player.status === 'bench') ? 'pc-excluded' : ''}`} 
        onClick={() => isTargetable && onPlayerClick(activeActionType, team, player.id, null)}
    >
      {isExcluded && <div className="pc-badge-exclu">{excluReason}</div>}
      
      {/* LIGNE 1 : Numéro, Nom, Temps */}
      <div className="pc-row-1">
        <span className="pc-num">{player.number}</span>
        <span className="pc-name">{player.name}</span>
        <span className="pc-time">{`${Math.floor(player.timePlayed / 60).toString().padStart(2, '0')}:${(player.timePlayed % 60).toString().padStart(2, '0')}`}</span>
      </div>

      {/* LIGNE 2 : Points et Points de Fautes */}
      <div className="pc-row-2">
        <span className="pc-pts">{player.points} <span style={{fontSize: '0.65rem', color: '#888'}}>PTS</span></span>
        <div className="pc-fouls">
          {[0, 1, 2, 3, 4].map(idx => {
            const isFilled = idx < player.fouls;
            const isDanger = isExcluded && idx === (player.fouls - 1);
            return <div key={idx} className={`pc-foul-dot ${isFilled ? 'filled' : ''} ${isDanger ? 'danger' : ''}`}></div>;
          })}
        </div>
      </div>

      {/* LIGNE 3 : Stats mineures sur une seule ligne (uniquement celles > 0) */}
      <div className="pc-row-3">
        {minorStats.length === 0 ? (
          <span style={{color: '#444'}}>Aucune stat</span>
        ) : (
          minorStats.map((stat, i) => (
            <span key={i} className="pc-stat-item">{stat.label}: <span style={{color: 'white'}}>{stat.val}</span></span>
          ))
        )}
      </div>

      {/* VALIDATION SCORE OVERLAY */}
      {isPendingScore && canEdit && (
        <div className="pc-overlay" onClick={e => e.stopPropagation()}>
          <button className="pc-btn-v" onClick={() => onConfirm('VALIDATED')}>V</button>
          <button className="pc-btn-x" onClick={() => onConfirm('MISSED')}>X</button>
        </div>
      )}
    </div>
  );
};

// --- COMPOSANT PRINCIPAL ---

export default function Scoreboard({ matchId, teamA, teamB, savedStatsA, savedStatsB, isFinished, onExit, onMatchFinished, onLiveUpdate, userRole, tourney }) {
  
  const settings = tourney?.matchsettings || { periodCount: 4, periodDuration: 10, timeoutsHalf1: 2, timeoutsHalf2: 3 };

  // --- ARCHITECTURE MODERNE : Rôles contextuels ---
  // Soit l'utilisateur est le créateur absolu de l'app (ADMIN)
  // Soit le TournamentManager lui a donné l'autorisation stricte pour CE match (Créateur du tournoi ou OTM assigné)
  const isSpecificallyAssigned = localStorage.getItem(`canEdit_match_${matchId}`) === "true";
  const canEdit = userRole === 'ADMIN' || isSpecificallyAssigned;
  // ------------------------------------------------

  const saveKey = `basketMatchSave_${matchId}`;

  const getSafeSave = () => {
    try {
      const saved = localStorage.getItem(saveKey);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const isRightMatch = parsed.playersA?.length > 0 && teamA?.players?.some(p => p.id === parsed.playersA[0]?.id);
      return isRightMatch ? parsed : null;
    } catch (e) {
      return null;
    }
  };

  const initPlayers = (team) => {
    const playersList = team?.players || [];
    return playersList.map(p => ({
      ...p,
      status: 'bench',
      points: 0, fouls: 0, ast: 0, oreb: 0, dreb: 0, tov: 0, stl: 0, blk: 0, timePlayed: 0,
      ftm: 0, fta: 0, fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, plusMinus: 0
    }));
  };

  const safeSave = getSafeSave();
  const matchData = tourney?.schedule?.find(m => m.id === matchId) || tourney?.playoffs?.matches?.find(m => m.id === matchId);

  // NOUVEAU : Si des joueurs sont déjà sur le terrain dans le cloud, c'est que le 5 majeur a été validé !
  const cloudHasStarters = matchData?.savedStatsA?.some(p => p.status === 'court') || matchData?.startersValidated;

  const initialStartersValidated = isFinished || 
    (safeSave ? (!!safeSave.startersValidated || (safeSave.history && safeSave.history.length > 0)) : false) || 
    (matchData?.liveHistory?.length > 0) || 
    cloudHasStarters;

  const [startersValidated, setStartersValidated] = useState(initialStartersValidated);

  const [playersA, setPlayersA] = useState(() => savedStatsA || (safeSave ? safeSave.playersA : (matchData?.savedStatsA || initPlayers(teamA))));
  const [playersB, setPlayersB] = useState(() => savedStatsB || (safeSave ? safeSave.playersB : (matchData?.savedStatsB || initPlayers(teamB))));
  const [time, setTime] = useState(() => isFinished ? 0 : (safeSave ? safeSave.time : (matchData?.liveTime !== undefined ? matchData.liveTime : settings.periodDuration * 60)));
  const [period, setPeriod] = useState(() => isFinished ? 'FIN' : (safeSave ? safeSave.period : (matchData?.livePeriod || 'Q1')));
  const [possession, setPossession] = useState(() => isFinished ? null : (safeSave ? safeSave.possession : (matchData?.livePossession || null)));
  const [history, setHistory] = useState(() => safeSave ? safeSave.history : (matchData?.liveHistory || []));
  // -----------------------------------------------------------------------------------------
  
  const [isMatchOver, setIsMatchOver] = useState(isFinished || false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentView, setCurrentView] = useState(isFinished ? 'boxscore' : 'court');

  const [activeAction, setActiveAction] = useState(() => {
    if (!canEdit) return null; 
    return (!initialStartersValidated) ? { type: 'STARTERS' } : null;
  });
  const [pendingSubs, setPendingSubs] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingAssist, setPendingAssist] = useState(null);
  const [pendingFoul, setPendingFoul] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMin, setEditMin] = useState(0);
  const [editSec, setEditSec] = useState(0);

  // --- NOUVEAU : ÉTAT ET DÉTECTION HORS-LIGNE ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Synchronisation magique dès que le réseau revient
      if (canEdit && !isMatchOver) {
        supabase.channel(`match_live_${matchId}`).send({
          type: 'broadcast', event: 'sync',
          payload: { playersA, playersB, time, period, history, isRunning }
        });
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [canEdit, isMatchOver, matchId, playersA, playersB, time, period, history, isRunning]);
  // ----------------------------------------------

  const scoreA = playersA.reduce((sum, p) => sum + p.points, 0);
  const scoreB = playersB.reduce((sum, p) => sum + p.points, 0);

  const getTeamFouls = (team) => {
    return history.filter(act => {
      if (act.team !== team || act.type !== 'FOUL' || act.foulType === 'PO') return false;
      if (period.startsWith('OT')) return act.period === 'Q4' || act.period.startsWith('OT');
      return act.period === period;
    }).length;
  };

  const teamFoulsA = getTeamFouls('A');
  const teamFoulsB = getTeamFouls('B');

  const getTimeoutsLeft = (teamId) => {
    let maxTimeouts = 0;
    let periodsInCurrentHalf = [];

    if (settings.periodCount === 2) {
      // 🏀 CAS 2 MI-TEMPS
      if (period === 'Q1') { maxTimeouts = settings.timeoutsHalf1; periodsInCurrentHalf = ['Q1']; }
      else if (period === 'Q2') { maxTimeouts = settings.timeoutsHalf2; periodsInCurrentHalf = ['Q2']; }
      else if (period && period.startsWith('OT')) { maxTimeouts = 1; periodsInCurrentHalf = [period]; }
    } else {
      // 🏀 CAS 4 QUARTS-TEMPS (Défaut)
      if (period === 'Q1' || period === 'Q2') { maxTimeouts = settings.timeoutsHalf1; periodsInCurrentHalf = ['Q1', 'Q2']; } 
      else if (period === 'Q3' || period === 'Q4') { maxTimeouts = settings.timeoutsHalf2; periodsInCurrentHalf = ['Q3', 'Q4']; } 
      else if (period && period.startsWith('OT')) { maxTimeouts = 1; periodsInCurrentHalf = [period]; }
    }

    const timeoutsTakenThisHalf = history.filter(
      action => action.type === 'TIMEOUT' && action.team === teamId && periodsInCurrentHalf.includes(action.period)
    ).length;

    return Math.max(0, maxTimeouts - timeoutsTakenThisHalf);
  };

  const timeoutsA = getTimeoutsLeft('A');
  const timeoutsB = getTimeoutsLeft('B');

  const handleTeamAction = (type, team) => {
      if (!canEdit || isMatchOver) return; 
      if (type === 'TIMEOUT') {
          const left = team === 'A' ? timeoutsA : timeoutsB;
          if (left <= 0) { alert("Plus de temps mort disponible !"); return; }
          if (window.confirm(`Accorder un Temps Mort à l'équipe ${team === 'A' ? teamA?.name : teamB?.name} ?`)) {
              setHistory([{ team, playerId: null, type: 'TIMEOUT', time, period }, ...history]);
              setIsRunning(false);
          }
      }
  };

  const isForcedSub = pendingSubs.some(id => {
    const p = [...playersA, ...playersB].find(x => x.id === id);
    if (!p) return false;
    const isExcluded = p.fouls >= 5 || (p.techFouls || 0) >= 2 || (p.antiFouls || 0) >= 2 || p.isDisqualified;
    return isExcluded && p.status === 'court';
  });

  useEffect(() => {
    if (!isFinished && canEdit) { 
      const gameState = { playersA, playersB, time, period, history, isMatchOver, possession, startersValidated };
      localStorage.setItem(saveKey, JSON.stringify(gameState));
    }
  }, [playersA, playersB, time, period, history, isMatchOver, possession, startersValidated, isFinished, saveKey, canEdit]);

  // --- AUTO-SAUVEGARDE SILENCIEUSE (Étape 3) ---
  useEffect(() => {
    if (!canEdit || isMatchOver || history.length === 0) return;
    
    const timeoutId = setTimeout(async () => {
        const isPlayoff = tourney?.playoffs?.matches?.some(m => m.id === matchId);
        const matchArray = isPlayoff ? tourney?.playoffs?.matches : tourney?.schedule;
        if (!matchArray) return;
        
        const matchIndex = matchArray.findIndex(m => m.id === matchId);
        if (matchIndex > -1) {
            const updatedMatch = {
                ...matchArray[matchIndex],
                savedStatsA: playersA,
                savedStatsB: playersB,
                liveTime: time,
                livePeriod: period,
                liveHistory: history,
                livePossession: possession,
                startersValidated: startersValidated,
                scoreA: playersA.reduce((sum, p) => sum + p.points, 0),
                scoreB: playersB.reduce((sum, p) => sum + p.points, 0)
            };
            
            let payload = {};
            if (isPlayoff) {
                const newMatches = [...tourney.playoffs.matches];
                newMatches[matchIndex] = updatedMatch;
                payload = { playoffs: { ...tourney.playoffs, matches: newMatches } };
            } else {
                const newSchedule = [...tourney.schedule];
                newSchedule[matchIndex] = updatedMatch;
                payload = { schedule: newSchedule };
            }
            
            await supabase.from('tournaments').update(payload).eq('id', tourney?.id);
        }
    }, 1500); 

    // 🛠️ AJOUTE CETTE LIGNE ICI POUR NETTOYER LA MÉMOIRE EN QUITTANT :
    return () => clearTimeout(timeoutId);

  }, [history, startersValidated]); 
  // ---------------------------------------------

  // --- NOUVEAU : Sauvegarde totale avant de quitter la table de marque ---
  const handleExit = (e) => {
    if (e) e.stopPropagation();
    
    // 1. On quitte l'écran INSTANTANÉMENT pour l'utilisateur (pas de freeze !)
    if (onExit) onExit();
    
    // 2. On fait la sauvegarde silencieusement en arrière-plan
    if (canEdit && !isMatchOver) {
        try {
            const isPlayoff = tourney?.playoffs?.matches?.some(m => m.id === matchId);
            const matchArray = isPlayoff ? tourney.playoffs.matches : tourney.schedule;
            
            if (matchArray) {
                const matchIndex = matchArray.findIndex(m => m.id === matchId);
                if (matchIndex > -1) {
                    const updatedMatch = {
                        ...matchArray[matchIndex],
                        savedStatsA: playersA,
                        savedStatsB: playersB,
                        liveTime: time,
                        livePeriod: period,
                        liveHistory: history,
                        livePossession: possession,
                        scoreA: playersA.reduce((sum, p) => sum + p.points, 0),
                        scoreB: playersB.reduce((sum, p) => sum + p.points, 0)
                    };
                    
                    let payload = {};
                    if (isPlayoff) {
                        const newMatches = [...tourney.playoffs.matches];
                        newMatches[matchIndex] = updatedMatch;
                        payload = { playoffs: { ...tourney.playoffs, matches: newMatches } };
                    } else {
                        const newSchedule = [...tourney.schedule];
                        newSchedule[matchIndex] = updatedMatch;
                        payload = { schedule: newSchedule };
                    }
                    
                    // On envoie à Supabase sans utiliser "await" pour ne pas bloquer l'écran
                    supabase.from('tournaments').update(payload).eq('id', tourney?.id).then();
                }
            }
        } catch (err) {
            console.error("Erreur silencieuse lors de la sauvegarde :", err);
        }
    }
  };
  // -----------------------------------------------------------------------

  const handleFinishMatch = () => {
    if (!canEdit) return; 

    // NOUVEAU : Anti-crash de fin de match
    if (!isOnline) {
      alert("⚠️ Vous êtes HORS-LIGNE !\n\nLe match est bien sauvegardé dans la tablette, mais vous devez retrouver une connexion internet (pastille verte) avant de cliquer sur 'Terminer le match' pour l'envoyer dans le cloud.");
      return;
    }

    if (window.confirm("Terminer définitivement le match et sauvegarder les stats ?")) {
      setIsRunning(false); setIsMatchOver(true); setCurrentView('boxscore');
      if (onMatchFinished) onMatchFinished(scoreA, scoreB, playersA, playersB);
    }
  };

  const handleSaveTime = (e) => { e.stopPropagation(); setTime(parseInt(editMin || 0) * 60 + parseInt(editSec || 0)); setIsEditing(false); };
  const handleResetTime = (e) => { e.stopPropagation(); if(window.confirm("Réinitialiser le chrono à 10:00 ?")) { setTime(600); setIsRunning(false); } };

  const nextPeriod = () => {
    if (!canEdit) return; 
    let nextP;
    
    if (settings.periodCount === 2) {
      // 🏀 PASSAGE POUR 2 MI-TEMPS
      if (period === 'Q1') nextP = 'Q2';
      else if (period === 'Q2' || period.startsWith('OT')) {
        const otNumber = period === 'Q2' ? 1 : parseInt(period.replace('OT', '')) + 1;
        nextP = `OT${otNumber}`;
      }
    } else {
      // 🏀 PASSAGE POUR 4 QUARTS-TEMPS
      if (period === 'Q1') nextP = 'Q2';
      else if (period === 'Q2') nextP = 'Q3';
      else if (period === 'Q3') nextP = 'Q4';
      else if (period === 'Q4' || period.startsWith('OT')) {
        const otNumber = period === 'Q4' ? 1 : parseInt(period.replace('OT', '')) + 1;
        nextP = `OT${otNumber}`;
      }
    }

    if (window.confirm(`Passer à ${nextP} et remettre le chrono à ${settings.periodDuration}:00 ?`)) {
      setPeriod(nextP); setTime(settings.periodDuration * 60); setIsRunning(false);
    }
  };

  const deleteAction = (index) => {
    if (!canEdit || isMatchOver) return; 
    const actionToDelete = history[index];
    if (actionToDelete.type === 'SUB') { setHistory(prev => prev.filter((_, i) => i !== index)); return; }
    
    const { team, playerId, type, value } = actionToDelete;
    const isA = team === 'A';
    const set = isA ? setPlayersA : setPlayersB;

    set(prev => prev.map(p => {
      if (p.id === playerId) {
        let up = { ...p };
        
        if (type === 'SCORE') {
          up.points -= value;
          if (value === 1) { up.ftm -= 1; up.fta -= 1; }
          else if (value === 2) { up.fg2m -= 1; up.fg2a -= 1; }
          else { up.fg3m -= 1; up.fg3a -= 1; }
          
          const newScoreA = isA ? scoreA - value : scoreA;
          const newScoreB = !isA ? scoreB - value : scoreB;
          if (onLiveUpdate) onLiveUpdate(newScoreA, newScoreB);
        }
        
        if (type === 'MISS') {
          if (value === 1) up.fta -= 1; else if (value === 2) up.fg2a -= 1; else up.fg3a -= 1;
        }
        if (type === 'FOUL') {
            up.fouls -= 1;
            if (actionToDelete.foulType === 'T') up.techFouls = Math.max(0, (up.techFouls || 0) - 1);
            if (actionToDelete.foulType === 'U') up.antiFouls = Math.max(0, (up.antiFouls || 0) - 1);
            if (actionToDelete.foulType === 'D') up.isDisqualified = false;
        }
        if (type === 'OREB') up.oreb -= 1; if (type === 'DREB') up.dreb -= 1;
        if (type === 'STL') up.stl -= 1;   if (type === 'BLK') up.blk -= 1;
        if (type === 'TOV') up.tov -= 1;   if (type === 'AST') up.ast -= 1;
        return up;
      }
      return p;
    }));

    if (type === 'SCORE') {
      const otherSet = isA ? setPlayersB : setPlayersA;
      const updatePM = (list, val) => list.map(p => p.status === 'court' ? { ...p, plusMinus: p.plusMinus + val } : p);
      set(prev => updatePM(prev, -value));
      otherSet(prev => updatePM(prev, value));
    }
    setHistory(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    let interval = null;
    if (isRunning && time > 0) {
      const endTime = Date.now() + time * 1000;
      let lastRemaining = time;
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        if (remaining !== lastRemaining) {
          const delta = lastRemaining - remaining; 
          lastRemaining = remaining;
          setTime(remaining);
          setPlayersA(prev => prev.map(p => p.status === 'court' ? { ...p, timePlayed: p.timePlayed + delta } : p));
          setPlayersB(prev => prev.map(p => p.status === 'court' ? { ...p, timePlayed: p.timePlayed + delta } : p));
        }
        if (remaining <= 0) { setIsRunning(false); clearInterval(interval); }
      }, 200); 
    } else if (time === 0) { setIsRunning(false); }
    return () => clearInterval(interval);
  }, [isRunning]);

  const stateRef = useRef({ playersA, playersB, time, period, history, isRunning, startersValidated });
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    stateRef.current = { playersA, playersB, time, period, history, isRunning, startersValidated };
  }, [playersA, playersB, time, period, history, isRunning, startersValidated]);

  useEffect(() => {
    const channel = supabase.channel(`match_live_${matchId}`);
    
    channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
      if (canEdit) isRemoteUpdate.current = true; 
      setPlayersA(payload.playersA);
      setPlayersB(payload.playersB);
      setTime(payload.time);
      setPeriod(payload.period);
      setHistory(payload.history);
      setIsRunning(payload.isRunning);

      // --- NOUVEAU : Si la tablette principale a déjà validé, on ferme le panneau ici aussi ! ---
      if (payload.startersValidated || payload.history?.length > 0 || payload.playersA?.some(p => p.status === 'court')) {
          setStartersValidated(true);
          setActiveAction(prev => prev?.type === 'STARTERS' ? null : prev);
      }
    });

    if (canEdit) {
      channel.on('broadcast', { event: 'request_sync' }, () => {
        // --- NOUVEAU : On répond à l'appel même si le match est à 0-0 mais que le 5 majeur est prêt ---
        const hasStarted = stateRef.current.history.length > 0 || stateRef.current.playersA.some(p => p.points > 0) || stateRef.current.startersValidated;
        if (hasStarted) {
            channel.send({
              type: 'broadcast', event: 'sync',
              payload: stateRef.current
            });
        }
      });
    }

    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' && canEdit) {
            channel.send({ type: 'broadcast', event: 'request_sync' });
        }
    });

    return () => { supabase.removeChannel(channel); };
  }, [matchId, canEdit]);

  useEffect(() => {
    if (canEdit && isOnline) {
      if (isRemoteUpdate.current) {
         isRemoteUpdate.current = false;
         return;
      }
      supabase.channel(`match_live_${matchId}`).send({
        type: 'broadcast', event: 'sync',
        // NOUVEAU : On inclut l'état startersValidated dans l'envoi en direct
        payload: { playersA, playersB, time, period, history, isRunning, startersValidated }
      });
    }
  }, [canEdit, isOnline, matchId, playersA, playersB, time, period, history, isRunning, startersValidated]);

  const handleAction = (incomingType, team, pid, incomingValue) => {
    if (!canEdit || isMatchOver) return; 

    if (incomingType === 'STARTERS') {
        const isA = team === 'A';
        const set = isA ? setPlayersA : setPlayersB;
        const currentPlayers = isA ? playersA : playersB;
        const targetPlayer = currentPlayers.find(p => p.id === pid);
        const courtCount = currentPlayers.filter(p => p.status === 'court').length;
        
        if (targetPlayer?.status === 'bench' && courtCount >= 5) {
            alert("Il y a déjà 5 titulaires ! Enlevez-en un d'abord.");
            return;
        }
        set(prev => prev.map(p => p.id === pid ? { ...p, status: p.status === 'court' ? 'bench' : 'court' } : p));
        return;
    }
    
    if (pendingAssist) {
      if (team !== pendingAssist.team || pid === pendingAssist.scorerId) return;
      const set = team === 'A' ? setPlayersA : setPlayersB;
      set(prev => prev.map(p => p.id === pid ? { ...p, ast: p.ast + 1 } : p));
      setHistory([{ team, playerId: pid, type: 'AST', time, period }, ...history]);
      setPendingAssist(null);
      return;
    }

    if (incomingType === 'SUB' || activeAction?.type === 'SUB') {
      const teamPlayers = team === 'A' ? playersA : playersB;
      const clickedPlayer = teamPlayers.find(x => x.id === pid);
      if (pendingSubs.includes(pid)) {
        if (clickedPlayer && clickedPlayer.fouls >= 5 && clickedPlayer.status === 'court') {
           alert("Ce joueur a 5 fautes, il doit obligatoirement sortir."); return;
        }
        setPendingSubs(prev => prev.filter(id => id !== pid));
      } else {
        if (clickedPlayer && clickedPlayer.fouls >= 5 && clickedPlayer.status === 'bench') {
           alert("Ce joueur est exclu (5 fautes) et ne peut plus jouer."); return;
        }
        setPendingSubs(prev => [...prev, pid]);
      }
      return;
    }

    const finalActionType = activeAction?.type || incomingType;
    const finalActionValue = activeAction?.value || incomingValue;
    if (!finalActionType) return;
    
    const isA = team === 'A';
    const set = isA ? setPlayersA : setPlayersB;
    
    if (finalActionType === 'FOUL') {
        setPendingFoul({ team, playerId: pid });
        setActiveAction(null);
        return;
    }
    if (['PLUS1', 'PLUS2', 'PLUS3'].includes(finalActionType)) { 
        setPendingAction({ team, playerId: pid, value: finalActionValue }); 
        setActiveAction(null); 
        return; 
    }
    
    set(prev => prev.map(p => {
      if (p.id === pid) {
        if (finalActionType === 'OREB') return { ...p, oreb: p.oreb + 1 };
        if (finalActionType === 'DREB') return { ...p, dreb: p.dreb + 1 };
        if (finalActionType === 'STL') return { ...p, stl: p.stl + 1 };
        if (finalActionType === 'BLK') return { ...p, blk: p.blk + 1 };
        if (finalActionType === 'TOV') return { ...p, tov: p.tov + 1 };
      }
      return p;
    }));
    
    if (finalActionType !== 'SUB') {
      setHistory([{ team, playerId: pid, type: finalActionType, time, period }, ...history]);
    }
    setActiveAction(null);
  };
  
  const handleConfirmFoul = (foulType) => {
    if (!pendingFoul || !canEdit) return;
    const { team, playerId } = pendingFoul;
    const isA = team === 'A';
    const currentPlayers = isA ? playersA : playersB;
    const player = currentPlayers.find(p => p.id === playerId);
    if (!player) return;

    const newF = player.fouls + 1;
    const newT = (player.techFouls || 0) + (foulType === 'T' ? 1 : 0);
    const newU = (player.antiFouls || 0) + (foulType === 'U' ? 1 : 0);
    const newD = (player.isDisqualified || false) || (foulType === 'D');
    
    const isExcluded = newF >= 5 || newT >= 2 || newU >= 2 || newD;

    const set = isA ? setPlayersA : setPlayersB;
    set(prev => prev.map(p => {
      if (p.id === playerId) {
        const newFoulList = [...(p.foulList || []), foulType];
        return { ...p, fouls: newF, techFouls: newT, antiFouls: newU, isDisqualified: newD, foulList: newFoulList };
      }
      return p;
    }));

    if (isExcluded && player.status === 'court') {
        setIsRunning(false);
        setActiveAction({type:'SUB'});
        setPendingSubs([player.id]);
        const reason = newD ? "Faute Disqualifiante" : (newT >= 2 ? "2 Fautes Techniques" : (newU >= 2 ? "2 Fautes Antisportives" : "5ème Faute"));
        setTimeout(() => alert(`EXCLUSION (${reason}) pour ${player.name} ! Il doit quitter le terrain.`), 10);
    }
    
    setHistory([{ team, playerId, type: 'FOUL', foulType, time, period }, ...history]);
    setPendingFoul(null);
  };

  const handleConfirmSubs = () => {
    if (!canEdit || pendingSubs.length === 0) return;
    const isTeamA = playersA.some(p => pendingSubs.includes(p.id));
    const activeTeam = isTeamA ? 'A' : 'B';
    const playersList = isTeamA ? playersA : playersB;
    const pIn = playersList.filter(p => pendingSubs.includes(p.id) && p.status === 'bench');
    const pOut = playersList.filter(p => pendingSubs.includes(p.id) && p.status === 'court');

    const newCourtCount = playersList.filter(p => p.status === 'court').length - pOut.length + pIn.length;
    
    const availableBench = playersList.filter(p => 
        p.status === 'bench' && p.fouls < 5 && (p.techFouls || 0) < 2 && (p.antiFouls || 0) < 2 && !p.isDisqualified && !pendingSubs.includes(p.id)
    ).length;

    if (newCourtCount > 5) { alert(`Remplacement invalide : L'équipe se retrouverait avec ${newCourtCount} joueurs.`); return; }
    if (pOut.length > pIn.length) {
        if (availableBench > 0) { alert(`Remplacement incomplet : Il reste ${availableBench} remplaçant(s) valide(s).`); return; }
        const fouledOuts = pOut.filter(p => p.fouls >= 5 || (p.techFouls || 0) >= 2 || (p.antiFouls || 0) >= 2 || p.isDisqualified).length;
        const unreplacedOuts = pOut.length - pIn.length;
        if (unreplacedOuts > fouledOuts) { alert("Action interdite : Seuls les joueurs exclus peuvent ne pas être remplacés."); return; }
    }

    const updateStatus = (list) => list.map(p => {
        if (pendingSubs.includes(p.id)) return { ...p, status: p.status === 'court' ? 'bench' : 'court' };
        return p;
    });
    
    if (isTeamA) setPlayersA(updateStatus(playersA)); else setPlayersB(updateStatus(playersB));
    
    setHistory([{
      type: 'SUB', team: activeTeam, playerId: null,
      details: `Sort : ${pOut.map(p => '#' + p.number + ' ' + p.name).join(', ')} | Entre : ${pIn.length > 0 ? pIn.map(p => '#' + p.number + ' ' + p.name).join(', ') : 'Aucun'}`,
      time, period
    }, ...history]);
    
    setPendingSubs([]); setActiveAction(null);
  };

  const confirmScore = (status) => {
    if (!pendingAction || !canEdit) return;
    const { team, playerId, value } = pendingAction;
    const isA = team === 'A';
    if (status === 'VALIDATED') {
      const updateList = (list, scoringTeam) => list.map(p => {
        let up = { ...p };
        if (p.id === playerId) {
          up.points += value;
          if (value === 1) { up.ftm += 1; up.fta += 1; } else if (value === 2) { up.fg2m += 1; up.fg2a += 1; } else { up.fg3m += 1; up.fg3a += 1; }
        }
        if (p.status === 'court') { up.plusMinus += (scoringTeam === isA) ? value : -value; }
        return up;
      });
      setPlayersA(updateList(playersA, true)); setPlayersB(updateList(playersB, false));
      setHistory([{ team, playerId, value, type: 'SCORE', time, period }, ...history]);
      if (value > 1) { setTimeout(() => setPendingAssist({ team, scorerId: playerId }), 10); }
      
      const newScoreA = isA ? scoreA + value : scoreA;
      const newScoreB = !isA ? scoreB + value : scoreB;
      if (onLiveUpdate) onLiveUpdate(newScoreA, newScoreB);

    } else {
      const updateMiss = (list) => list.map(p => {
        if (p.id === playerId) {
          let up = { ...p };
          if (value === 1) up.fta += 1; else if (value === 2) up.fg2a += 1; else up.fg3a += 1; return up;
        } return p;
      });
      isA ? setPlayersA(updateMiss(playersA)) : setPlayersB(updateMiss(playersB));
      setHistory([{ team, playerId, value, type: 'MISS', time, period }, ...history]);
    }
    setPendingAction(null); setActiveAction(null);
  };

  // 👇 AJOUTE LA FONCTION PDF JUSTE ICI 👇
  const handleGeneratePDF = async () => {
    const element = document.getElementById('pdf-scoresheet-template');
    if (!element) return;

    // On rend le composant visible un très court instant pour le prendre en photo
    element.style.display = 'block';
    
    try {
      // On génère une image haute qualité (scale: 2) de la zone HTML
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      // On crée le document PDF format A4
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Feuille_Match_${teamA?.name}_vs_${teamB?.name}.pdf`);
      
    } catch (err) {
      console.error("Erreur lors de la génération du PDF :", err);
      alert("Une erreur est survenue lors de la création du PDF.");
    } finally {
      // On recache le composant pour ne pas polluer l'écran
      element.style.display = 'none';
    }
  };
  // 👆 -------------------------------- 👆

  return (
    <div className="scoreboard-container">
      <div className="tm-flex-between" style={{ marginBottom:'20px' }}>
        
        {/* NOUVEAU : AFFICHAGE DE L'ÉTAT DU RÉSEAU POUR L'OTM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn-undo" onClick={handleExit}>⬅ RETOUR</button>
          {canEdit && (
            <span style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              fontSize: '0.8rem', fontWeight: 'bold', 
              padding: '4px 8px', borderRadius: '20px', 
              background: isOnline ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
              color: isOnline ? '#2ecc71' : '#e74c3c',
              border: `1px solid ${isOnline ? '#2ecc71' : '#e74c3c'}`
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#2ecc71' : '#e74c3c', boxShadow: `0 0 5px ${isOnline ? '#2ecc71' : '#e74c3c'}` }}></div>
              {isOnline ? 'EN LIGNE' : 'HORS-LIGNE'}
            </span>
          )}
        </div>

        <div className="view-tabs" style={{ margin:0 }}>
            <button className={`btn-tab ${currentView === 'court' ? 'active' : ''}`} onClick={() => !isFinished && setCurrentView('court')}>TERRAIN</button>
            <button className={`btn-tab ${currentView === 'boxscore' ? 'active' : ''}`} onClick={() => setCurrentView('boxscore')}>STATS</button>
            {isMatchOver && <button onClick={handleGeneratePDF} className="sb-btn-print" style={{ background: 'white', color: 'black' }}>GÉNÉRER PDF 📄</button>}
            {(!isMatchOver && canEdit) && <button onClick={handleFinishMatch} className="sb-btn-finish">TERMINER LE MATCH 🏁</button>}
        </div>
      </div>
      
      <div className="header-stats" style={{ marginBottom: '40px' }}>
        <div className="score-board" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2>{teamA?.name}</h2>
            <p className="score-text team-score" style={{ marginBottom: '5px' }}>{scoreA}</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>FAUTES ÉQUIPE</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map(idx => (
                        <div key={idx} className={`foul-box ${idx <= teamFoulsA ? 'filled' : ''} ${idx === 5 && teamFoulsA >= 5 ? 'danger' : ''}`} style={{ width: '14px', height: '14px', borderRadius: '2px', border: '1px solid #555', backgroundColor: idx <= teamFoulsA ? (idx >= 5 ? 'var(--danger)' : 'var(--accent-orange)') : 'transparent' }} />
                      ))}
                    </div>
                    {teamFoulsA >= 5 && <span style={{ background: 'var(--danger)', color: 'white', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '1px' }}>BONUS</span>}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#ccc', fontWeight: 'bold' }}>TEMPS MORTS</span>
                <div style={{ display: 'flex', gap: '4px', marginRight: '5px' }}>
                    {Array.from({ length: timeoutsA }).map((_, i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-orange)' }} />)}
                </div>
                {canEdit && <button onClick={() => handleTeamAction('TIMEOUT', 'A')} style={{ background: '#333', border: '1px solid #555', color: 'white', fontSize: '0.6rem', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}>DEMANDER</button>}
            </div>
        </div>
        
        <div className="timer-section">
          <div className="time-display sb-time-display-wrapper">
            {isEditing ? (
              <div className="time-edit" onClick={e => e.stopPropagation()}>
                <input type="number" value={editMin} onChange={e => setEditMin(e.target.value)} className="sb-time-edit-input" />
                <span>:</span>
                <input type="number" value={editSec} onChange={e => setEditSec(e.target.value)} className="sb-time-edit-input" />
                <button onClick={handleSaveTime} className="sb-time-edit-btn">OK</button>
              </div>
            ) : (
              <span onClick={(e) => { if(!isMatchOver && canEdit) { e.stopPropagation(); setIsEditing(true); setEditMin(Math.floor(time/60)); setEditSec(time%60); }}}>
                {Math.floor(time/60)}:{time%60 < 10 ? '0'+time%60 : time%60}
              </span>
            )}
          </div>
          {(!isMatchOver && canEdit && activeAction?.type !== 'STARTERS') && (
            <div className="sb-timer-controls">
              <button onClick={() => setIsRunning(!isRunning)} className={`sb-btn-timer ${isRunning ? 'sb-btn-pause' : 'sb-btn-start'}`}>
                {isRunning ? 'PAUSE' : 'START'}
              </button>
              <button onClick={handleResetTime} className="sb-btn-timer sb-btn-reset">RESET</button>
            </div>
          )}
          <div className="sb-period-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
            <button onClick={(canEdit && !isMatchOver) ? nextPeriod : null} className={`sb-btn-period ${(!canEdit || isMatchOver) ? 'disabled' : 'clickable'}`}>
              PÉRIODE : {period}
            </button>
            <div 
                onClick={() => (!isMatchOver && canEdit) && setPossession(p => p === 'A' ? 'B' : 'A')}
                style={{ 
                    display: 'flex', alignItems: 'center', gap: '20px', background: '#1a1a1a', 
                    padding: '6px 20px', borderRadius: '20px', cursor: (!isMatchOver && canEdit) ? 'pointer' : 'default',
                    border: '1px solid #333', userSelect: 'none',
                    boxShadow: possession ? 'inset 0 0 10px rgba(0,0,0,0.5)' : 'none'
                }}
            >
                <span style={{ fontSize: '1.4rem', color: possession === 'A' ? 'var(--accent-orange)' : '#333', textShadow: possession === 'A' ? '0 0 8px var(--accent-orange)' : 'none', transition: 'all 0.2s' }}>◀</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#666', letterSpacing: '2px' }}>POSSESSION</span>
                <span style={{ fontSize: '1.4rem', color: possession === 'B' ? 'var(--accent-blue)' : '#333', textShadow: possession === 'B' ? '0 0 8px var(--accent-blue)' : 'none', transition: 'all 0.2s' }}>▶</span>
            </div>
          </div>
        </div>

        <div className="score-board" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2>{teamB?.name}</h2>
            <p className="score-text team-score blue" style={{ marginBottom: '5px' }}>{scoreB}</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>FAUTES ÉQUIPE</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map(idx => (
                        <div key={idx} className={`foul-box ${idx <= teamFoulsB ? 'filled' : ''} ${idx === 5 && teamFoulsB >= 5 ? 'danger' : ''}`} style={{ width: '14px', height: '14px', borderRadius: '2px', border: '1px solid #555', backgroundColor: idx <= teamFoulsB ? (idx >= 5 ? 'var(--danger)' : 'var(--accent-blue)') : 'transparent' }} />
                      ))}
                    </div>
                    {teamFoulsB >= 5 && <span style={{ background: 'var(--danger)', color: 'white', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '1px' }}>BONUS</span>}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#ccc', fontWeight: 'bold' }}>TEMPS MORTS</span>
                <div style={{ display: 'flex', gap: '4px', marginRight: '5px' }}>
                    {Array.from({ length: timeoutsB }).map((_, i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)' }} />)}
                </div>
                {canEdit && <button onClick={() => handleTeamAction('TIMEOUT', 'B')} style={{ background: '#333', border: '1px solid #555', color: 'white', fontSize: '0.6rem', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}>DEMANDER</button>}
            </div>
        </div>
      </div>

      {currentView === 'court' ? (
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', width: '100%' }}>
            
            {/* TEAM A (GAUCHE) */}
            <div className="bento-team" style={{ flex: 1, minWidth: 0, padding: '15px' }}>
                <h3 className="bento-zone-title" style={{ textAlign: 'center', color: 'var(--accent-orange)' }}>{teamA?.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', paddingBottom: '15px' }}>
                  {playersA.filter(p => p.status === 'court').map(p => (
                      <PlayerCard key={p.id} team="A" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
                <p className="sb-bench-title" style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '10px', color: '#888', margin: '0 0 10px 0', fontSize: '0.85rem', letterSpacing: '1px' }}>BANC</p>
                <div className="players-grid">
                  {playersA.filter(p => p.status === 'bench').map(p => (
                      <PlayerCard key={p.id} team="A" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
            </div>

            {/* BARRE D'ACTION (MILIEU) */}
            {canEdit && (
              <div className={`action-bar-container ${activeAction?.type === 'STARTERS' ? 'success-mode' : (pendingAssist ? 'success-mode' : (activeAction?.type === 'SUB' ? 'sub-mode' : (pendingFoul ? 'danger-mode' : 'active-mode')))}`} style={{ width: '180px', flexShrink: 0, position: 'sticky', top: '20px', padding: '15px' }}>
                {activeAction?.type === 'STARTERS' ? (
                    <div className="action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span className="sb-assist-msg" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--success)' }}>🏀 SÉLECTIONNEZ LES TITULAIRES</span>
                        <button className="action-btn" style={{background: 'var(--success)', color: 'white', border: 'none', padding: '12px 10px', fontSize: '0.85rem', fontWeight: 'bold'}} onClick={() => {
                            const courtA = playersA.filter(p=>p.status==='court').length;
                            const courtB = playersB.filter(p=>p.status==='court').length;
                            if (courtA !== 5 || courtB !== 5) {
                                alert(`Il faut exactement 5 joueurs par équipe ! (A: ${courtA}/5, B: ${courtB}/5)`);
                                return;
                            }
                            setActiveAction(null);
                            setStartersValidated(true); 
                        }}>
                            VALIDER LE 5 MAJEUR
                        </button>
                    </div>
                ) : pendingFoul ? (
                  <div className="action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span className="sb-assist-msg" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--danger)' }}>TYPE DE FAUTE ?</span>
                    <button className="action-btn sb-action-btn-default" style={{ padding: '10px', fontSize: '0.85rem' }} onClick={() => handleConfirmFoul('P')}>SIMPLE (P)</button>
                    <button className="action-btn sb-action-btn-default" style={{ padding: '10px', fontSize: '0.85rem' }} onClick={() => handleConfirmFoul('PO')}>OFFENSIVE (PO)</button>
                    <button className="action-btn sb-action-btn-foul" style={{ padding: '10px', fontSize: '0.85rem' }} onClick={() => handleConfirmFoul('T')}>TECHNIQUE (T)</button>
                    <button className="action-btn sb-action-btn-foul" style={{ padding: '10px', fontSize: '0.85rem' }} onClick={() => handleConfirmFoul('U')}>ANTISPORTIVE (U)</button>
                    <button className="action-btn sb-action-btn-foul" style={{background: 'var(--danger)', color: 'white', border: 'none', padding: '10px', fontSize: '0.85rem'}} onClick={() => handleConfirmFoul('D')}>DISQ (D)</button>
                    <button className="action-btn cancel-btn" style={{ padding: '10px', fontSize: '0.85rem', marginTop: '10px' }} onClick={() => setPendingFoul(null)}>ANNULER</button>
                  </div>
                ) : pendingAssist ? (
                  <div className="action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span className="sb-assist-msg" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--success)' }}>QUI A FAIT LA PASSE ?</span>
                    <button className="action-btn" style={{ background: '#444', color: 'white', border: 'none', padding: '10px', fontSize: '0.85rem' }} onClick={() => setPendingAssist(null)}>SANS PASSEUR</button>
                  </div>
                ) : activeAction?.type === 'SUB' ? (
                  <div className="action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span className="sb-sub-msg" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent-purple)' }}>MODE REMPLACEMENT</span>
                    <button className="action-btn" style={{background: 'var(--accent-purple)', color: 'white', padding: '12px 10px', fontSize: '0.85rem', border: 'none', fontWeight: 'bold'}} onClick={handleConfirmSubs}>VALIDER CHANGEMENTS</button>
                    {!isForcedSub && <button className="action-btn cancel-btn" style={{ padding: '10px', fontSize: '0.85rem' }} onClick={() => {setActiveAction(null); setPendingSubs([]);}}>ANNULER</button>}
                  </div>
                ) : (
                  <div className="action-buttons" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {['PLUS1', 'PLUS2', 'PLUS3'].map(type => (
                        <button key={type} className={`action-btn sb-action-btn-pts ${activeAction?.type === type ? 'selected' : ''}`} style={{ flex: 1, padding: '10px 0', fontSize: '1rem' }} onClick={() => setActiveAction({type, value: parseInt(type.replace('PLUS', ''))})}>+{type.replace('PLUS', '')}</button>
                      ))}
                    </div>
                    
                    <div style={{ width: '100%', height: '1px', background: '#333', margin: '5px 0' }}></div>

                    {/* LIGNE REBONDS : OREB | DREB */}
                    <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                        <button
                            className={`action-btn sb-action-btn-reb ${activeAction?.type === 'OREB' ? 'selected' : ''}`}
                            style={{ flex: 1, padding: '10px 0', fontSize: '0.8rem', fontWeight: 'bold' }}
                            onClick={() => setActiveAction({type: 'OREB', value: null})}>
                            OREB
                        </button>
                        <button
                            className={`action-btn sb-action-btn-reb ${activeAction?.type === 'DREB' ? 'selected' : ''}`}
                            style={{ flex: 1, padding: '10px 0', fontSize: '0.8rem', fontWeight: 'bold' }}
                            onClick={() => setActiveAction({type: 'DREB', value: null})}>
                            DREB
                        </button>
                    </div>

                    {/* LIGNE DÉFENSE : STL | BLK */}
                    <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                        <button
                            className={`action-btn sb-action-btn-def ${activeAction?.type === 'STL' ? 'selected' : ''}`}
                            style={{ flex: 1, padding: '10px 0', fontSize: '0.8rem', fontWeight: 'bold' }}
                            onClick={() => setActiveAction({type: 'STL', value: null})}>
                            STL
                        </button>
                        <button
                            className={`action-btn sb-action-btn-def ${activeAction?.type === 'BLK' ? 'selected' : ''}`}
                            style={{ flex: 1, padding: '10px 0', fontSize: '0.8rem', fontWeight: 'bold' }}
                            onClick={() => setActiveAction({type: 'BLK', value: null})}>
                            BLK
                        </button>
                    </div>

                    {/* LIGNE ERREURS/FAUTES : TOV | FOUL */}
                    <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                        <button
                            className={`action-btn sb-action-btn-tov ${activeAction?.type === 'TOV' ? 'selected' : ''}`}
                            style={{ flex: 1, padding: '10px 0', fontSize: '0.8rem', fontWeight: 'bold' }}
                            onClick={() => setActiveAction({type: 'TOV', value: null})}>
                            TOV
                        </button>
                        <button
                            className={`action-btn sb-action-btn-foul ${activeAction?.type === 'FOUL' ? 'selected' : ''}`}
                            style={{ flex: 1, padding: '10px 0', fontSize: '0.8rem', fontWeight: 'bold' }}
                            onClick={() => setActiveAction({type: 'FOUL', value: null})}>
                            FOUL
                        </button>
                    </div>

                    {/* BOUTON CHANGEMENT (Seul sur sa ligne) */}
                    <button
                        className={`action-btn sb-action-btn-sub ${activeAction?.type === 'SUB' ? 'selected' : ''}`}
                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', fontWeight: 'bold' }}
                        onClick={() => setActiveAction({type: 'SUB', value: null})}>
                        SUB
                    </button>

                    {activeAction && <button onClick={() => setActiveAction(null)} className="action-btn cancel-btn" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', marginTop: '10px' }}>ANNULER</button>}
                  </div>
                )}
              </div>
            )}

            {/* TEAM B (DROITE) */}
            <div className="bento-team" style={{ flex: 1, minWidth: 0, padding: '15px' }}>
                <h3 className="bento-zone-title" style={{ textAlign: 'center', color: 'var(--accent-blue)' }}>{teamB?.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', paddingBottom: '15px' }}>
                  {playersB.filter(p => p.status === 'court').map(p => (
                      <PlayerCard key={p.id} team="B" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
                <p className="sb-bench-title" style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '10px', color: '#888', margin: '0 0 10px 0', fontSize: '0.85rem', letterSpacing: '1px' }}>BANC</p>
                <div className="players-grid">
                  {playersB.filter(p => p.status === 'bench').map(p => (
                      <PlayerCard key={p.id} team="B" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
            </div>

        </div>
      ) : (
        <div className="boxscore-container">
          <BoxscoreTable title={teamA?.name} players={playersA} color="var(--accent-orange)" />
          <BoxscoreTable title={teamB?.name} players={playersB} color="var(--accent-blue)" />
        </div>
      )}

      {/* --- HISTORIQUE (Mode Play-by-Play Pro) --- */}
      <div className="sb-history-panel" style={{ marginTop: '50px' }}>
        <h3 className="sb-history-title">🗓️ Play-by-Play (Historique)</h3>
        <div className="sb-history-list">
          {history.length === 0 ? (
            <p style={{textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px'}}>Aucune action enregistrée</p>
          ) : (
            history.map((act, i) => {
              const teamPlayers = act.team === 'A' ? playersA : playersB;
              const playerInfo = teamPlayers.find(p => p.id === act.playerId);
              const actionColor = act.team === 'A' ? 'var(--accent-orange)' : 'var(--accent-blue)';
              
              return (
                <div key={i} className="sb-history-item" style={{ borderLeft: `3px solid ${actionColor}` }}>
                  <div className="sb-history-time">
                    <strong style={{color: 'white', marginRight: '4px'}}>{act.period}</strong> 
                    {Math.floor(act.time/60)}:{act.time%60 < 10 ? '0'+act.time%60 : act.time%60}
                  </div>
                  
                  <div className="sb-history-content">
                    {act.type === 'SUB' && <span style={{ color: '#aaa' }}>🔄 REMPLACEMENT <span style={{fontSize: '0.75rem', marginLeft: '6px', color: '#666'}}>{act.details}</span></span>}
                    
                    {act.type === 'SCORE' && (
                      <span style={{ color: actionColor }}>
                        {act.value === 1 ? '🎯 LF RÉUSSI (+1)' : act.value === 3 ? '🔥 3 PTS RÉUSSI (+3)' : '🏀 TIR RÉUSSI (+2)'} 
                        <strong style={{color: 'white', marginLeft: '6px'}}>#{playerInfo?.number} {playerInfo?.name}</strong>
                      </span>
                    )}
                    
                    {act.type === 'MISS' && (
                      <span style={{ color: '#777' }}>
                        {act.value === 1 ? '❌ LF MANQUÉ' : act.value === 3 ? '❌ 3 PTS MANQUÉ' : '❌ TIR MANQUÉ'} 
                        <strong style={{color: '#aaa', marginLeft: '6px'}}>#{playerInfo?.number} {playerInfo?.name}</strong>
                      </span>
                    )}
                    
                    {!['SUB', 'SCORE', 'MISS'].includes(act.type) && (
                      <span style={{ color: actionColor }}>
                        {act.type === 'TIMEOUT' ? '⏱️ TEMPS MORT' : 
                         act.type === 'FOUL' ? `⚠️ FAUTE ${act.foulType === 'PO' ? 'OFFENSIVE' : act.foulType === 'T' ? 'TECHNIQUE' : act.foulType === 'U' ? 'ANTISPORTIVE' : act.foulType === 'D' ? 'DISQUALIFIANTE' : 'PERSONNELLE'}` :
                         `${act.type === 'AST' ? '🤝 PASS D.' : act.type === 'OREB' ? '🛡️ REB OFF' : act.type === 'DREB' ? '🛡️ REB DEF' : act.type === 'STL' ? '🥷 INTERCEPTION' : act.type === 'BLK' ? '🧱 CONTRE' : act.type === 'TOV' ? '🗑️ BALLE PERDUE' : act.type}`}
                         
                         {act.type !== 'TIMEOUT' && <strong style={{color: 'white', marginLeft: '6px'}}>#{playerInfo?.number} {playerInfo?.name}</strong>}
                      </span>
                    )}
                  </div>
                  
                  {(!isMatchOver && canEdit) && (
                    <button onClick={() => { if(window.confirm("Supprimer cette action ?")) deleteAction(i) }} className="sb-btn-delete-action" title="Supprimer l'action">
                      ✕
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

{/* --- LE MODÈLE CACHÉ POUR L'EXPORT PDF --- */}
      <div id="pdf-scoresheet-template" style={{ display: 'none', position: 'absolute', top: 0, left: 0, width: '800px', background: 'white', color: 'black', padding: '40px', fontFamily: 'sans-serif', zIndex: -100 }}>
        
        {/* EN-TÊTE DU PDF */}
        <div style={{ textAlign: 'center', borderBottom: '3px solid black', paddingBottom: '20px', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', textTransform: 'uppercase' }}>Feuille de Marque Officielle</h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
            <span style={{ flex: 1, textAlign: 'right' }}>{teamA?.name}</span>
            <span style={{ padding: '0 20px', fontSize: '24px', background: '#eee', borderRadius: '8px' }}>{scoreA} - {scoreB}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{teamB?.name}</span>
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#555' }}>
            Match généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
          </div>
        </div>

        {/* FONCTION POUR DESSINER LE TABLEAU D'UNE ÉQUIPE */}
        {[ 
          { name: teamA?.name, players: playersA, score: scoreA }, 
          { name: teamB?.name, players: playersB, score: scoreB } 
        ].map((teamData, index) => (
          <div key={index} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'black', color: 'white', padding: '10px', fontWeight: 'bold' }}>
              <span>ÉQUIPE {index === 0 ? 'A' : 'B'} : {teamData.name}</span>
              <span>TOTAL : {teamData.score} PTS</span>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ border: '1px solid black', padding: '8px', width: '30px' }}>N°</th>
                  <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>NOM DU JOUEUR</th>
                  <th style={{ border: '1px solid black', padding: '8px', width: '40px' }}>PTS</th>
                  <th style={{ border: '1px solid black', padding: '8px', width: '80px' }}>FAUTES (1 à 5)</th>
                  <th style={{ border: '1px solid black', padding: '8px', width: '40px' }}>3PT</th>
                  <th style={{ border: '1px solid black', padding: '8px', width: '40px' }}>LF</th>
                </tr>
              </thead>
              <tbody>
                {teamData.players.map((p, i) => (
                  <tr key={i}>
                    <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{p.number}</td>
                    <td style={{ border: '1px solid black', padding: '8px', textTransform: 'uppercase' }}>{p.name}</td>
                    <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{p.points}</td>
                    <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>
                      {/* On affiche les lettres des fautes P, T, U... ou des cases vides */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '3px' }}>
                        {[0, 1, 2, 3, 4].map(fIdx => {
                          const foulLetter = (p.foulList && p.foulList[fIdx]) ? p.foulList[fIdx] : '';
                          return (
                            <div key={fIdx} style={{ width: '12px', height: '12px', border: '1px solid black', fontSize: '9px', lineHeight: '10px' }}>
                              {foulLetter}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>{p.fg3m}</td>
                    <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>{p.ftm}/{p.fta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* ZONE DE SIGNATURE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '20px', borderTop: '2px dashed #aaa' }}>
          <div style={{ textAlign: 'center', width: '30%' }}>
            <strong>Capitaine Équipe A</strong>
            <div style={{ borderBottom: '1px solid black', height: '50px', marginTop: '20px' }}></div>
          </div>
          <div style={{ textAlign: 'center', width: '30%' }}>
            <strong>Officiel de Table (OTM)</strong>
            <div style={{ borderBottom: '1px solid black', height: '50px', marginTop: '20px' }}></div>
          </div>
          <div style={{ textAlign: 'center', width: '30%' }}>
            <strong>Capitaine Équipe B</strong>
            <div style={{ borderBottom: '1px solid black', height: '50px', marginTop: '20px' }}></div>
          </div>
        </div>
        
      </div>

    </div>
  );
}