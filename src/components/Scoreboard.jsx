import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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
  if (player.isDisqualified) excluReason = 'DISQUALIFIÉ';
  else if ((player.techFouls || 0) >= 2 || (player.antiFouls || 0) >= 2) excluReason = 'EXCLU';

  let isTargetable = false;
  if (canEdit) { // Seulement si l'utilisateur a les droits
    if (activeActionType === 'STARTERS') {
        isTargetable = true;
    } else if (activeActionType === 'SUB') {
        isTargetable = !(isExcluded && player.status === 'bench');
    } else if (pendingAssist) {
        isTargetable = (team === pendingAssist.team && player.id !== pendingAssist.scorerId && player.status === 'court');
    } else if (hasGlobalAction) {
        isTargetable = (player.status === 'court' && !isPendingScore);
    }
  }

  return (
    <div 
        className={`player-card ${isSubSelected ? 'is-sub-selected' : ''} ${isPendingScore ? 'pending' : ''} ${isTargetable ? 'is-targetable' : ''} ${(isExcluded && player.status === 'bench') ? 'fouled-out-bench' : ''}`} 
        onClick={() => isTargetable && onPlayerClick(activeActionType, team, player.id, null)}
        style={{ cursor: isTargetable ? 'pointer' : 'default' }}
    >
      {isExcluded && <div className="badge-exclu">{excluReason}</div>}
      <div className="player-header">
        <div className="sb-player-header-info"><span className="player-number">{player.number}</span><span>{player.name}</span></div>
        <span className="player-time">{`${Math.floor(player.timePlayed / 60).toString().padStart(2, '0')}:${(player.timePlayed % 60).toString().padStart(2, '0')}`}</span>
      </div>
      <div className="player-stats">
        <span className="pts">{player.points} pts</span>
        <div className="fouls-container" style={{ display: 'flex', gap: '3px' }}>
          {[0, 1, 2, 3, 4].map(idx => {
            const isFilled = idx < player.fouls;
            const foulLetter = isFilled ? (player.foulList?.[idx] || 'P') : '';
            const isDanger = isExcluded && idx === (player.fouls - 1);
            
            return (
              <div 
                key={idx} 
                className={`foul-box ${isFilled ? 'filled' : ''} ${isDanger ? 'danger' : ''}`}
                style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '10px', fontWeight: 'bold', 
                    color: isDanger ? 'white' : (isFilled ? '#1a1a1a' : 'transparent'),
                    backgroundColor: isDanger ? 'var(--danger)' : (isFilled ? 'white' : 'transparent'),
                    width: '16px', height: '16px', borderRadius: '3px',
                    border: isFilled ? 'none' : '1px solid #555'
                }}
              >
                {foulLetter}
              </div>
            );
          })}
        </div>
      </div>
      <div className="minor-stats">
        <span>AS: <span>{player.ast}</span></span>
        <span>REB: <span>{player.oreb + player.dreb}</span></span>
        <span>ST: <span>{player.stl}</span></span>
        <span>BL: <span>{player.blk}</span></span>
        <span>TO: <span>{player.tov}</span></span>
      </div>
      {isPendingScore && canEdit && (
        <div className="validation-overlay" onClick={e => e.stopPropagation()}>
          <button className="btn-validate" onClick={() => onConfirm('VALIDATED')}>V</button>
          <button className="btn-miss" onClick={() => onConfirm('MISSED')}>X</button>
        </div>
      )}
    </div>
  );
};

// --- COMPOSANT PRINCIPAL ---

export default function Scoreboard({ matchId, teamA, teamB, savedStatsA, savedStatsB, isFinished, onExit, onMatchFinished, onLiveUpdate, userRole, tourney }) {
  
  // NOUVEAU : On lit le règlement du tournoi (ou on met les règles FIBA par défaut)
  const settings = tourney?.matchsettings || { periodCount: 4, periodDuration: 10, timeoutsHalf1: 2, timeoutsHalf2: 3 };
  
  // --- NOUVEAU VIGILE ---
  const canEdit = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'OTM';
  // ----------------------

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
      ftm: 0, fta: 0, fg2m: 0, fga: 0, fg3m: 0, fg3a: 0, plusMinus: 0
    }));
  };

  const safeSave = getSafeSave();

  const [playersA, setPlayersA] = useState(() => savedStatsA || (safeSave ? safeSave.playersA : initPlayers(teamA)));
  const [playersB, setPlayersB] = useState(() => savedStatsB || (safeSave ? safeSave.playersB : initPlayers(teamB)));
  const [time, setTime] = useState(() => isFinished ? 0 : (safeSave ? safeSave.time : settings.periodDuration * 60));
  const [period, setPeriod] = useState(() => isFinished ? 'FIN' : (safeSave ? safeSave.period : 'Q1'));
  const [possession, setPossession] = useState(() => isFinished ? null : (safeSave ? safeSave.possession : null));
  const [history, setHistory] = useState(() => safeSave ? safeSave.history : []);
  
  const [isMatchOver, setIsMatchOver] = useState(isFinished || false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentView, setCurrentView] = useState(isFinished ? 'boxscore' : 'court');

  const [activeAction, setActiveAction] = useState(() => {
    const loadedHistory = safeSave ? safeSave.history : [];
    // Si pas connecté ou pas autorisé, on ne force pas le panneau STARTERS
    if (!canEdit) return null; 
    return (loadedHistory.length === 0 && !isFinished) ? { type: 'STARTERS' } : null;
  });
  const [pendingSubs, setPendingSubs] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingAssist, setPendingAssist] = useState(null);
  const [pendingFoul, setPendingFoul] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMin, setEditMin] = useState(0);
  const [editSec, setEditSec] = useState(0);

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
    // 1. Déterminer dans quelle partie du match on se trouve
    let maxTimeouts = 0;
    let periodsInCurrentHalf = [];

    if (period === 'Q1' || period === 'Q2') {
      maxTimeouts = settings.timeoutsHalf1; // Ex: 2 temps morts
      periodsInCurrentHalf = ['Q1', 'Q2'];
    } 
    else if (period === 'Q3' || period === 'Q4') {
      maxTimeouts = settings.timeoutsHalf2; // Ex: 3 temps morts
      periodsInCurrentHalf = ['Q3', 'Q4'];
    } 
    else if (period && period.startsWith('OT')) {
      maxTimeouts = 1; // Règle FIBA : 1 TM par prolongation (non cumulable)
      periodsInCurrentHalf = [period]; 
    }

    // 2. Compter combien de TM ont déjà été pris par cette équipe dans CETTE mi-temps
    const timeoutsTakenThisHalf = history.filter(
      action => action.type === 'TIMEOUT' && action.team === teamId && periodsInCurrentHalf.includes(action.period)
    ).length;

    // 3. Retourner ce qu'il reste (sans jamais descendre en dessous de zéro)
    return Math.max(0, maxTimeouts - timeoutsTakenThisHalf);
  };

  const timeoutsA = getTimeoutsLeft('A');
  const timeoutsB = getTimeoutsLeft('B');

  const handleTeamAction = (type, team) => {
      if (!canEdit || isMatchOver) return; // Sécurité
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

  // Sauvegarde locale (Le Cloud est appelé par App.jsx)
  useEffect(() => {
    if (!isFinished && canEdit) { // Un spectateur n'écrase pas le cache
      const gameState = { playersA, playersB, time, period, history, isMatchOver, possession };
      localStorage.setItem(saveKey, JSON.stringify(gameState));
    }
  }, [playersA, playersB, time, period, history, isMatchOver, possession, isFinished, saveKey, canEdit]);

  const handleFinishMatch = () => {
    if (!canEdit) return; // Sécurité
    if (window.confirm("Terminer définitivement le match et sauvegarder les stats ?")) {
      setIsRunning(false); setIsMatchOver(true); setCurrentView('boxscore');
      if (onMatchFinished) onMatchFinished(scoreA, scoreB, playersA, playersB);
    }
  };

  const handleSaveTime = (e) => { e.stopPropagation(); setTime(parseInt(editMin || 0) * 60 + parseInt(editSec || 0)); setIsEditing(false); };
  const handleResetTime = (e) => { e.stopPropagation(); if(window.confirm("Réinitialiser le chrono à 10:00 ?")) { setTime(600); setIsRunning(false); } };

  const nextPeriod = () => {
    if (!canEdit) return; // Sécurité
    let nextP;
    if (period === 'Q1') nextP = 'Q2';
    else if (period === 'Q2') nextP = 'Q3';
    else if (period === 'Q3') nextP = 'Q4';
    else if (period === 'Q4' || period.startsWith('OT')) {
      const otNumber = period === 'Q4' ? 1 : parseInt(period.replace('OT', '')) + 1;
      nextP = `OT${otNumber}`;
    }
    if (window.confirm(`Passer à ${nextP} et remettre le chrono à 10:00 ?`)) {
      setPeriod(nextP); setTime(settings.periodDuration * 60); setIsRunning(false);
    }
  };

  const deleteAction = (index) => {
    if (!canEdit || isMatchOver) return; // Sécurité
    const actionToDelete = history[index];
    if (actionToDelete.type === 'SUB') { setHistory(prev => prev.filter((_, i) => i !== index)); return; }
    
    const { team, playerId, type, value } = actionToDelete;
    const isA = team === 'A';
    const set = isA ? setPlayersA : setPlayersB;

    set(prev => prev.map(p => {
      if (p.id === playerId) {
        let up = { ...p };
        
        // CORRECTION ICI : Le bloc SCORE est bien refermé
        if (type === 'SCORE') {
          up.points -= value;
          if (value === 1) { up.ftm -= 1; up.fta -= 1; }
          else if (value === 2) { up.fg2m -= 1; up.fg2a -= 1; }
          else { up.fg3m -= 1; up.fg3a -= 1; }
          
          // --- NOUVEAU : ON CORRIGE LE SCORE EN DIRECT ---
          const newScoreA = isA ? scoreA - value : scoreA;
          const newScoreB = !isA ? scoreB - value : scoreB;
          if (onLiveUpdate) onLiveUpdate(newScoreA, newScoreB);
          // -----------------------------------------------
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

  // ==========================================================
  // 📡 MAGIE DU DIRECT : SYNCHRONISATION OTM -> SPECTATEURS
  // ==========================================================
  
  // 1. Connexion au canal du match
  useEffect(() => {
    const channel = supabase.channel(`match_live_${matchId}`);

    if (!canEdit) {
      // LE SPECTATEUR ÉCOUTE : À chaque fois que l'OTM fait un truc, on met à jour l'écran
      channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
        setPlayersA(payload.playersA);
        setPlayersB(payload.playersB);
        setTime(payload.time);
        setPeriod(payload.period);
        setHistory(payload.history);
        setIsRunning(payload.isRunning);
      }).subscribe();
    } else {
      // L'OTM OUVRE LE CANAL
      channel.subscribe();
    }

    return () => { supabase.removeChannel(channel); };
  }, [canEdit, matchId]);

  // 2. Diffusion en continu
  useEffect(() => {
    if (canEdit) {
      // L'OTM PARLE : Dès qu'une donnée change sur son écran (un point, une faute, ou le chrono qui perd 1 seconde), 
      // il l'envoie instantanément dans le canal, sans écrire dans la base de données !
      supabase.channel(`match_live_${matchId}`).send({
        type: 'broadcast',
        event: 'sync',
        payload: { playersA, playersB, time, period, history, isRunning }
      });
    }
  }, [canEdit, matchId, playersA, playersB, time, period, history, isRunning]);
  // ==========================================================

  const handleAction = (incomingType, team, pid, incomingValue) => {
    if (!canEdit || isMatchOver) return; // Sécurité maximale

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
      
      // --- NOUVEAU : ON PRÉVIENT LE CLOUD QUE LE SCORE A CHANGÉ ! ---
      const newScoreA = isA ? scoreA + value : scoreA;
      const newScoreB = !isA ? scoreB + value : scoreB;
      if (onLiveUpdate) onLiveUpdate(newScoreA, newScoreB);
      // --------------------------------------------------------------

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

  return (
    <div className="scoreboard-container">
      <div className="tm-flex-between" style={{ marginBottom:'20px' }}>
        <button className="btn-undo" onClick={onExit}>⬅ RETOUR</button>
        <div className="view-tabs" style={{ margin:0 }}>
            <button className={`btn-tab ${currentView === 'court' ? 'active' : ''}`} onClick={() => !isFinished && setCurrentView('court')}>TERRAIN</button>
            <button className={`btn-tab ${currentView === 'boxscore' ? 'active' : ''}`} onClick={() => setCurrentView('boxscore')}>STATS</button>
            {isMatchOver && <button onClick={() => window.print()} className="sb-btn-print">IMPRIMER PDF 📄</button>}
            {(!isMatchOver && canEdit) && <button onClick={handleFinishMatch} className="sb-btn-finish">TERMINER LE MATCH 🏁</button>}
        </div>
      </div>
      
      <div className="header-stats">
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
        <>
          {canEdit && (
            <div className={`action-bar-container ${activeAction?.type === 'STARTERS' ? 'success-mode' : (pendingAssist ? 'success-mode' : (activeAction?.type === 'SUB' ? 'sub-mode' : (pendingFoul ? 'danger-mode' : 'active-mode')))}`}>
              {activeAction?.type === 'STARTERS' ? (
                  <div className="action-buttons">
                      <span className="sb-assist-msg">🏀 SÉLECTIONNEZ LES TITULAIRES </span>
                      <button className="action-btn" style={{background: 'var(--success)', color: 'white', border: 'none', fontWeight: 'bold', padding: '10px 20px'}} onClick={() => {
                          const courtA = playersA.filter(p=>p.status==='court').length;
                          const courtB = playersB.filter(p=>p.status==='court').length;
                          if (courtA !== 5 || courtB !== 5) {
                              alert(`Il faut exactement 5 joueurs par équipe ! (A: ${courtA}/5, B: ${courtB}/5)`);
                              return;
                          }
                          setActiveAction(null);
                      }}>
                          VALIDER LE 5 MAJEUR
                      </button>
                  </div>
              ) : pendingFoul ? (
                <div className="action-buttons">
                  <span className="sb-assist-msg">TYPE DE FAUTE ?</span>
                  <button className="action-btn sb-action-btn-default" onClick={() => handleConfirmFoul('P')}>SIMPLE (P)</button>
                  <button className="action-btn sb-action-btn-default" onClick={() => handleConfirmFoul('PO')}>OFFENSIVE (PO)</button>
                  <button className="action-btn sb-action-btn-foul" onClick={() => handleConfirmFoul('T')}>TECHNIQUE (T)</button>
                  <button className="action-btn sb-action-btn-foul" onClick={() => handleConfirmFoul('U')}>ANTISPORTIVE (U)</button>
                  <button className="action-btn sb-action-btn-foul" style={{background: 'var(--danger)', color: 'white', border: 'none'}} onClick={() => handleConfirmFoul('D')}>DISQ (D)</button>
                  <button className="action-btn cancel-btn" onClick={() => setPendingFoul(null)}>ANNULER</button>
                </div>
              ) : pendingAssist ? (
                <div className="action-buttons">
                  <span className="sb-assist-msg">QUI A FAIT LA PASSE ?</span>
                  <button className="btn-miss" onClick={() => setPendingAssist(null)}>SANS PASSEUR</button>
                </div>
              ) : activeAction?.type === 'SUB' ? (
                <div className="action-buttons">
                  <span className="sb-sub-msg">MODE REMPLACEMENT</span>
                  <button className="btn-sub-validate" onClick={handleConfirmSubs}>VALIDER LES CHANGEMENTS</button>
                  {!isForcedSub && <button className="action-btn cancel-btn" onClick={() => {setActiveAction(null); setPendingSubs([]);}}>ANNULER</button>}
                </div>
              ) : (
                <div className="action-buttons">
                  {['PLUS1', 'PLUS2', 'PLUS3'].map(type => (
                    <button key={type} className={`action-btn sb-action-btn-pts ${activeAction?.type === type ? 'selected' : ''}`} onClick={() => setActiveAction({type, value: parseInt(type.replace('PLUS', ''))})}>+{type.replace('PLUS', '')}</button>
                  ))}
                  <div className="sb-divider"></div>
                  {['OREB', 'DREB', 'STL', 'BLK', 'TOV', 'FOUL', 'SUB'].map(type => {
                    let btnClass = 'sb-action-btn-default';
                    if (type === 'FOUL') btnClass = 'sb-action-btn-foul';
                    if (type.includes('REB')) btnClass = 'sb-action-btn-reb';
                    if (type === 'SUB') btnClass = 'sb-action-btn-sub';
                    if (type === 'STL' || type === 'BLK') btnClass = 'sb-action-btn-def';
                    if (type === 'TOV') btnClass = 'sb-action-btn-tov';
                    return (
                      <button key={type} className={`action-btn ${btnClass} ${activeAction?.type === type ? 'selected' : ''}`} onClick={() => setActiveAction({type, value: null})}>{type}</button>
                    );
                  })}
                  {activeAction && <button onClick={() => setActiveAction(null)} className="sb-btn-cancel-action">ANNULER X</button>}
                </div>
              )}
            </div>
          )}

          <div className="bento-teams-container">
            <div className="bento-team">
                <h3 className="bento-zone-title">{teamA?.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', paddingBottom: '15px' }}>
                  {playersA.filter(p => p.status === 'court').map(p => (
                      <PlayerCard key={p.id} team="A" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
                <p className="sb-bench-title">BANC</p>
                <div className="players-grid">
                  {playersA.filter(p => p.status === 'bench').map(p => (
                      <PlayerCard key={p.id} team="A" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
            </div>
            
            <div className="bento-team">
                <h3 className="bento-zone-title">{teamB?.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', paddingBottom: '15px' }}>
                  {playersB.filter(p => p.status === 'court').map(p => (
                      <PlayerCard key={p.id} team="B" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
                <p className="sb-bench-title">BANC</p>
                <div className="players-grid">
                  {playersB.filter(p => p.status === 'bench').map(p => (
                      <PlayerCard key={p.id} team="B" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
            </div>
          </div>
        </>
      ) : (
        <div className="boxscore-container">
          <BoxscoreTable title={teamA?.name} players={playersA} color="var(--accent-orange)" />
          <BoxscoreTable title={teamB?.name} players={playersB} color="var(--accent-blue)" />
        </div>
      )}

      {/* --- HISTORIQUE --- */}
      <div className="sb-history-panel">
        <h3 className="sb-history-title">HISTORIQUE DES ACTIONS</h3>
        <div className="sb-history-list">
          {history.length === 0 ? (
            <p className="sb-history-empty">Aucune action enregistrée</p>
          ) : (
            history.map((act, i) => {
              const teamPlayers = act.team === 'A' ? playersA : playersB;
              const playerInfo = teamPlayers.find(p => p.id === act.playerId);
              const actionColor = act.team === 'A' ? 'var(--accent-orange)' : 'var(--accent-blue)';
              
              return (
                <div key={i} className="sb-history-item" style={{ borderLeft: `4px solid ${actionColor}` }}>
                  <span className="sb-history-time"><strong>{act.period}</strong> {Math.floor(act.time/60)}:{act.time%60 < 10 ? '0'+act.time%60 : act.time%60}</span>
                  <span className="sb-history-content">
                    {act.type === 'SUB' && <span style={{ color: actionColor }}>🔄 REMPLACEMENT {act.details}</span>}
                    {act.type === 'SCORE' && (
                      <span style={{ color: actionColor }}>
                        {act.value === 1 ? '✅ LANCER FRANC RÉUSSI (+1pt)' : act.value === 3 ? '✅ 3 POINTS RÉUSSI (+3pts)' : '✅ TIR RÉUSSI (+2pts)'} — #{playerInfo?.number} {playerInfo?.name}
                      </span>
                    )}
                    {act.type === 'MISS' && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {act.value === 1 ? '❌ LANCER FRANC MANQUÉ' : act.value === 3 ? '❌ 3 POINTS MANQUÉ' : '❌ TIR MANQUÉ (2pts)'} — #{playerInfo?.number} {playerInfo?.name}
                      </span>
                    )}
                    {!['SUB', 'SCORE', 'MISS'].includes(act.type) && (
                      <span style={{ color: actionColor }}>
                        {act.type === 'TIMEOUT' ? '⏱️ TEMPS MORT DEMANDÉ' : 
                         act.type === 'FOUL' ? `⚠️ FAUTE ${act.foulType === 'PO' ? 'OFFENSIVE' : act.foulType === 'T' ? 'TECHNIQUE' : act.foulType === 'U' ? 'ANTISPORTIVE' : act.foulType === 'D' ? 'DISQUALIFIANTE' : 'PERSONNELLE'} — #${playerInfo?.number} ${playerInfo?.name}` :
                         `${act.type === 'AST' ? 'ASSIST' : act.type} — #${playerInfo?.number} ${playerInfo?.name}`}
                      </span>
                    )}
                  </span>
                  {(!isMatchOver && canEdit) && (
                    <button onClick={() => { if(window.confirm("Supprimer cette action ?")) deleteAction(i) }} className="sb-btn-delete-action">SUPPRIMER X</button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}