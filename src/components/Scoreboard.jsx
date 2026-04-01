import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import useMatchSync from '../hooks/useMatchSync';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { useAppContext } from '../context/AppContext';

// --- COMPOSANTS INTERNES ---

const BoxscoreTable = React.memo(({ title, players, color }) => {
  const formatPlayerTime = (sec) => {
    const safeSec = Number(sec) || 0;
    return `${Math.floor(safeSec / 60).toString().padStart(2, '0')}:${(safeSec % 60).toString().padStart(2, '0')}`;
  };

  if (!players) return null;

  return (
    <div className="boxscore-team">
      <h3 className="boxscore-title" style={{ color: color || 'white' }}>{title}</h3>
      <div className="overflow-x-auto">
        <table className="boxscore-table w-full text-sm">
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
              const fgm = fg2m + fg3m; const fga = fg2a + fg3a;
              const reb = oreb + dreb;
              const missedFG = fga - fgm; const missedFT = fta - ftm;
              const eff = (pts + reb + ast + stl + blk) - (missedFG + missedFT + tov);

              return (
                <tr key={p.id}>
                  <td className="text-left">{p.number}</td>
                  <td className="text-left">{p.name} {p.status === 'court' && <span className="text-[var(--accent-orange)]">*</span>}</td>
                  <td className="text-center">{formatPlayerTime(p.timePlayed)}</td>
                  <td className="text-center font-bold">{pts}</td>
                  <td className="text-center">{fgm}/{fga}</td>
                  <td className="text-center">{fg3m}/{fg3a}</td>
                  <td className="text-center">{ftm}/{fta}</td>
                  <td className="text-center font-bold" style={{ color: pmColor }}>{pm > 0 ? `+${pm}` : pm}</td>
                  <td className="text-center">{ast}</td>
                  <td className="text-center">{oreb}</td>
                  <td className="text-center">{dreb}</td>
                  <td className="text-center font-bold text-gray-300">{reb}</td>
                  <td className="text-center">{stl}</td>
                  <td className="text-center">{blk}</td>
                  <td className="text-center">{tov}</td>
                  <td className={`text-center ${isExcluded ? "text-[var(--danger)] font-bold" : ""}`}>{fouls}</td>
                  <td className={`text-center font-bold ${eff >= 15 ? 'text-[var(--success)]' : (eff < 0 ? 'text-[var(--danger)]' : 'text-white')}`}>{eff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const playerCardAreEqual = (prevProps, nextProps) => {
  return (
    prevProps.player === nextProps.player &&
    prevProps.team === nextProps.team &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.hasGlobalAction === nextProps.hasGlobalAction &&
    prevProps.activeActionType === nextProps.activeActionType &&
    prevProps.pendingAssist === nextProps.pendingAssist &&
    prevProps.pendingAction === nextProps.pendingAction &&
    prevProps.pendingSubs === nextProps.pendingSubs
  );
};

const PlayerCard = React.memo(({ team, player, onPlayerClick, pendingSubs, pendingAction, onConfirm, hasGlobalAction, pendingAssist, activeActionType, canEdit }) => {
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

  const minorStats = [
    { label: 'AS', val: player.ast },
    { label: 'RB', val: (player.oreb || 0) + (player.dreb || 0) },
    { label: 'ST', val: player.stl },
    { label: 'BL', val: player.blk },
    { label: 'TO', val: player.tov }
  ].filter(s => s.val > 0);

  // Génération dynamique des classes Tailwind pour le PlayerCard
  const statusClasses = player.status === 'bench' 
    ? 'opacity-60 scale-95 grayscale-[40%] border-[#222] shadow-none' 
    : `opacity-100 scale-100 grayscale-0 border ${team === 'A' ? 'border-[var(--accent-orange)] shadow-[0_4px_12px_rgba(255,107,0,0.15)]' : 'border-[var(--accent-blue)] shadow-[0_4px_12px_rgba(0,212,255,0.15)]'}`;

  return (
    <div 
        className={`relative bg-[#222] rounded-lg p-2 flex flex-col justify-between overflow-hidden transition-all duration-300 ease-in-out select-none ${isSubSelected ? 'ring-2 ring-[var(--accent-purple)] bg-[rgba(157,78,221,0.15)]' : ''} ${isPendingScore ? 'ring-2 ring-white bg-[rgba(255,255,255,0.1)]' : ''} ${isTargetable ? 'cursor-pointer hover:-translate-y-1' : ''} ${(isExcluded && player.status === 'bench') ? 'opacity-30 grayscale pointer-events-none' : ''} ${statusClasses}`} 
        onClick={() => isTargetable && onPlayerClick(activeActionType, team, player.id, null)}
    >
      {isExcluded && <div className="absolute top-0 right-0 bg-[var(--danger)] text-white text-[0.6rem] font-bold px-1 py-0.5 rounded-bl-md z-10">{excluReason}</div>}
      
      {/* LIGNE 1 : Numéro, Nom, Temps */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-black text-[#555] bg-black px-1.5 py-0.5 rounded">{player.number}</span>
        <span className="text-sm font-bold text-white truncate max-w-[80px]" title={player.name}>{player.name}</span>
        <span className="text-[0.65rem] font-bold text-[#888]">{`${Math.floor(player.timePlayed / 60).toString().padStart(2, '0')}:${(player.timePlayed % 60).toString().padStart(2, '0')}`}</span>
      </div>

      {/* LIGNE 2 : Points et Points de Fautes */}
      <div className="flex justify-between items-center bg-[#1a1a1a] rounded px-2 py-1 mb-1">
        <span className="text-xl font-black text-white">{player.points} <span className="text-[0.65rem] text-[#888] font-bold">PTS</span></span>
        <div className="flex gap-[2px]">
          {[0, 1, 2, 3, 4].map(idx => {
            const isFilled = idx < player.fouls;
            const isDanger = isExcluded && idx === (player.fouls - 1);
            return <div key={idx} className={`w-2 h-2 rounded-full border border-[#555] ${isFilled ? (isDanger ? 'bg-[var(--danger)] border-[var(--danger)] shadow-[0_0_5px_var(--danger)]' : 'bg-[var(--accent-orange)] border-[var(--accent-orange)]') : 'bg-transparent'}`}></div>;
          })}
        </div>
      </div>

      {/* LIGNE 3 : Stats mineures */}
      <div className="flex justify-center gap-2 flex-wrap text-[0.65rem] font-bold text-[#aaa] mt-1">
        {minorStats.length === 0 ? (
          <span className="text-[#444]">Aucune stat</span>
        ) : (
          minorStats.map((stat, i) => (
            <span key={i}>{stat.label}: <span className="text-white">{stat.val}</span></span>
          ))
        )}
      </div>

      {/* VALIDATION SCORE OVERLAY */}
      {isPendingScore && canEdit && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-2 z-20 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
          <button className="w-10 h-10 rounded-full border-2 border-[var(--success)] bg-transparent text-[var(--success)] font-bold text-lg hover:bg-[var(--success)] hover:text-white transition-colors cursor-pointer" onClick={() => onConfirm('VALIDATED')}>V</button>
          <button className="w-10 h-10 rounded-full border-2 border-[var(--danger)] bg-transparent text-[var(--danger)] font-bold text-lg hover:bg-[var(--danger)] hover:text-white transition-colors cursor-pointer" onClick={() => onConfirm('MISSED')}>X</button>
        </div>
      )}
    </div>
  );
}, playerCardAreEqual); 

// --- COMPOSANT PRINCIPAL ---

export default function Scoreboard() {
  const { 
    activeMatch, setActiveMatch, setView, 
    finishMatch: onMatchFinished, syncLiveScore: onLiveUpdate, 
    userRole, currentTourney: tourney, 
    setConfirmData, setPromptData 
  } = useAppContext();

  const matchId = activeMatch?.id;
  const teamA = activeMatch?.teamA;
  const teamB = activeMatch?.teamB;
  const savedStatsA = activeMatch?.savedStatsA;
  const savedStatsB = activeMatch?.savedStatsB;
  const isFinished = activeMatch?.status === 'finished';

  const onExit = () => { 
    setView('tournament'); 
    setActiveMatch(null); 
  };

  const settings = tourney?.matchsettings || { periodCount: 4, periodDuration: 10, timeoutsHalf1: 2, timeoutsHalf2: 3 };
  const isSpecificallyAssigned = localStorage.getItem(`canEdit_match_${matchId}`) === "true";
  const canEdit = userRole === 'ADMIN' || isSpecificallyAssigned;
  const saveKey = `basketMatchSave_${matchId}`;

  const getSafeSave = () => {
    try {
      const saved = localStorage.getItem(saveKey);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const isRightMatch = parsed.playersA?.length > 0 && teamA?.players?.some(p => p.id === parsed.playersA[0]?.id);
      return isRightMatch ? parsed : null;
    } catch (e) { return null; }
  };

  const initPlayers = (team) => {
    const playersList = team?.players || [];
    return playersList.map(p => ({
      ...p, status: 'bench', points: 0, fouls: 0, ast: 0, oreb: 0, dreb: 0, tov: 0, stl: 0, blk: 0, timePlayed: 0,
      ftm: 0, fta: 0, fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, plusMinus: 0
    }));
  };

  const safeSave = getSafeSave();
  const matchData = tourney?.schedule?.find(m => m.id === matchId) || tourney?.playoffs?.matches?.find(m => m.id === matchId);
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
      if (period === 'Q1') { maxTimeouts = settings.timeoutsHalf1; periodsInCurrentHalf = ['Q1']; }
      else if (period === 'Q2') { maxTimeouts = settings.timeoutsHalf2; periodsInCurrentHalf = ['Q2']; }
      else if (period && period.startsWith('OT')) { maxTimeouts = 1; periodsInCurrentHalf = [period]; }
    } else {
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
          if (left <= 0) { toast.error("Plus de temps mort disponible !"); return; }

        setConfirmData({
          isOpen: true,
          title: "Temps Mort ⏱️",
          message: `Accorder un Temps Mort à l'équipe ${team === 'A' ? teamA?.name : teamB?.name} ?`,
          isDanger: false,
          onConfirm: () => {
            setHistory([{ team, playerId: null, type: 'TIMEOUT', time, period }, ...history]);
            setIsRunning(false);
            toast.success(`Temps mort accordé à ${team === 'A' ? teamA?.name : teamB?.name}`);
          }
        });
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

  useEffect(() => {
    if (!canEdit || isMatchOver || history.length === 0) return;
    if (!startersValidated && history.length === 0) return;
    
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

    return () => clearTimeout(timeoutId);
  }, [history, startersValidated]); 

  const handleExit = (e) => {
    if (e) e.stopPropagation();
    if (onExit) onExit();
    
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
                    
                    supabase.from('tournaments').update(payload).eq('id', tourney?.id).then();
                }
            }
        } catch (err) { console.error("Erreur silencieuse lors de la sauvegarde :", err); }
    }
  };

  const stateRef = useRef({ playersA, playersB, time, period, history, isRunning, startersValidated });
  useEffect(() => {
    stateRef.current = { playersA, playersB, time, period, history, isRunning, startersValidated };
  }, [playersA, playersB, time, period, history, isRunning, startersValidated]);

  const { isOnline } = useMatchSync(
    matchId, canEdit,
    { playersA, playersB, time, period, history, isRunning, startersValidated },
    { setPlayersA, setPlayersB, setTime, setPeriod, setHistory, setIsRunning, setStartersValidated, setActiveAction },
    stateRef
  );

  const handleFinishMatch = () => {
    if (!canEdit) return; 
    if (!isOnline) {
      toast.error("⚠️ Vous êtes HORS-LIGNE !\n\nLe match est bien sauvegardé dans la tablette, mais vous devez retrouver une connexion internet avant de cliquer sur 'Terminer le match' pour l'envoyer dans le cloud.");
      return;
    }
    setConfirmData({
      isOpen: true,
      title: "Terminer le match 🏁",
      message: "Voulez-vous terminer définitivement le match et sauvegarder les statistiques ? (Cette action est irréversible)",
      isDanger: true,
      onConfirm: () => {
        setIsRunning(false); setIsMatchOver(true); setCurrentView('boxscore');
        if (onMatchFinished) onMatchFinished(scoreA, scoreB, playersA, playersB);
        toast.success("Match terminé et statistiques sauvegardées !");
      }
    });
  };

  const handleSaveTime = (e) => { e.stopPropagation(); setTime(parseInt(editMin || 0) * 60 + parseInt(editSec || 0)); setIsEditing(false); };
  const handleResetTime = (e) => { e.stopPropagation(); if(window.confirm("Réinitialiser le chrono à 10:00 ?")) { setTime(600); setIsRunning(false); } };

  const nextPeriod = () => {
    if (!canEdit) return; 
    let nextP;
    if (settings.periodCount === 2) {
      if (period === 'Q1') nextP = 'Q2';
      else if (period === 'Q2' || period.startsWith('OT')) {
        const otNumber = period === 'Q2' ? 1 : parseInt(period.replace('OT', '')) + 1;
        nextP = `OT${otNumber}`;
      }
    } else {
      if (period === 'Q1') nextP = 'Q2';
      else if (period === 'Q2') nextP = 'Q3';
      else if (period === 'Q3') nextP = 'Q4';
      else if (period === 'Q4' || period.startsWith('OT')) {
        const otNumber = period === 'Q4' ? 1 : parseInt(period.replace('OT', '')) + 1;
        nextP = `OT${otNumber}`;
      }
    }

    setConfirmData({
      isOpen: true,
      title: "Période suivante 🏀",
      message: `Passer à ${nextP} et remettre le chrono à ${settings.periodDuration}:00 ?`,
      isDanger: false,
      onConfirm: () => {
        setPeriod(nextP); setTime(settings.periodDuration * 60); setIsRunning(false);
        toast.success(`C'est parti pour ${nextP} !`);
      }
    });
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
  }, [isRunning, time]);

  const handleAction = (incomingType, team, pid, incomingValue) => {
    if (!canEdit || isMatchOver) return; 

    if (incomingType === 'STARTERS') {
        const isA = team === 'A';
        const set = isA ? setPlayersA : setPlayersB;
        set(prev => {
            const courtCount = prev.filter(p => p.status === 'court').length;
            const targetPlayer = prev.find(p => p.id === pid);
            if (targetPlayer?.status === 'bench' && courtCount >= 5) {
                setTimeout(() => toast.error("5 joueurs maximum sur le terrain !"), 10);
                return prev;
            }
            return prev.map(p => p.id === pid ? { ...p, status: p.status === 'court' ? 'bench' : 'court' } : p);
        });
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
           toast.error("Ce joueur a 5 fautes, il doit obligatoirement sortir."); return;
        }
        setPendingSubs(prev => prev.filter(id => id !== pid));
      } else {
        if (clickedPlayer && clickedPlayer.fouls >= 5 && clickedPlayer.status === 'bench') {
           toast.error("Ce joueur est exclu (5 fautes) et ne peut plus jouer."); return;
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
        setTimeout(() => toast.error(`EXCLUSION (${reason}) pour ${player.name} ! Il doit quitter le terrain.`), 10);
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

    if (newCourtCount > 5) { toast.error(`Remplacement invalide : L'équipe se retrouverait avec ${newCourtCount} joueurs.`); return; }
    if (pOut.length > pIn.length) {
        if (availableBench > 0) { toast.error(`Remplacement incomplet : Il reste ${availableBench} remplaçant(s) valide(s).`); return; }
        const fouledOuts = pOut.filter(p => p.fouls >= 5 || (p.techFouls || 0) >= 2 || (p.antiFouls || 0) >= 2 || p.isDisqualified).length;
        const unreplacedOuts = pOut.length - pIn.length;
        if (unreplacedOuts > fouledOuts) { toast.error("Action interdite : Seuls les joueurs exclus peuvent ne pas être remplacés."); return; }
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

  const handleGeneratePDF = async () => {
    const element = document.getElementById('pdf-scoresheet-template');
    if (!element) return;
    element.style.display = 'block';
    
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Feuille_Match_${teamA?.name}_vs_${teamB?.name}.pdf`);
    } catch (err) {
      console.error("Erreur lors de la génération du PDF :", err);
      toast.error("Une erreur est survenue lors de la création du PDF.");
    } finally {
      element.style.display = 'none';
    }
  };

  // 👇 DÉBUT DU RENDU RESPONSIVE TAILWIND 👇
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
        
        <div className="flex items-center gap-4">
          <button className="bg-transparent text-[#888] font-bold border border-[#444] px-4 py-2 rounded-md hover:bg-[#333] hover:text-white transition-colors cursor-pointer" onClick={handleExit}>⬅ RETOUR</button>
          {canEdit && (
            <span className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${isOnline ? 'bg-[rgba(46,204,113,0.1)] text-[#2ecc71] border-[#2ecc71]' : 'bg-[rgba(231,76,60,0.1)] text-[#e74c3c] border-[#e74c3c]'}`}>
              <div className={`w-2 h-2 rounded-full shadow-[0_0_5px] ${isOnline ? 'bg-[#2ecc71] shadow-[#2ecc71]' : 'bg-[#e74c3c] shadow-[#e74c3c]'}`}></div>
              {isOnline ? 'EN LIGNE' : 'HORS-LIGNE'}
            </span>
          )}
        </div>

        <div className="flex gap-2">
            <button className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${currentView === 'court' ? 'bg-[var(--accent-orange)] text-white' : 'bg-[#222] text-gray-400 hover:text-white hover:bg-[#333]'}`} onClick={() => !isFinished && setCurrentView('court')}>TERRAIN</button>
            <button className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${currentView === 'boxscore' ? 'bg-[var(--accent-orange)] text-white' : 'bg-[#222] text-gray-400 hover:text-white hover:bg-[#333]'}`} onClick={() => setCurrentView('boxscore')}>STATS</button>
            {isMatchOver && <button onClick={handleGeneratePDF} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors cursor-pointer">GÉNÉRER PDF 📄</button>}
            {(!isMatchOver && canEdit) && <button onClick={handleFinishMatch} className="bg-[var(--success)] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600 transition-colors cursor-pointer">TERMINER LE MATCH 🏁</button>}
        </div>
      </div>
      
      {/* HEADER SCORE (Le Panneau Central d'Affichage) */}
      <div className="flex justify-center items-stretch gap-2 md:gap-8 mb-10 bg-[#111] p-4 rounded-xl border border-[#333] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        {/* SCORE ÉQUIPE A */}
        <div className="flex flex-col items-center flex-1">
            <h2 className="text-sm md:text-xl font-black text-white m-0 truncate w-full text-center tracking-wider">{teamA?.name}</h2>
            <p className="text-5xl md:text-7xl font-black text-[var(--accent-orange)] my-2 drop-shadow-[0_0_15px_rgba(255,107,0,0.4)]">{scoreA}</p>
            <div className="flex flex-col items-center gap-1">
                <span className="text-[0.65rem] text-[#888] font-bold tracking-widest">FAUTES ÉQUIPE</span>
                <div className="flex items-center gap-2 h-4">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(idx => (
                        <div key={idx} className={`w-3.5 h-3.5 rounded-sm border border-[#555] ${idx <= teamFoulsA ? (idx >= 5 ? 'bg-[var(--danger)] border-[var(--danger)]' : 'bg-[var(--accent-orange)] border-[var(--accent-orange)]') : 'bg-transparent'}`} />
                      ))}
                    </div>
                    {teamFoulsA >= 5 && <span className="bg-[var(--danger)] text-white px-1.5 py-0.5 rounded font-bold text-[0.6rem] tracking-widest">BONUS</span>}
                </div>
            </div>
            <div className="flex items-center gap-2 mt-3 bg-white/5 px-3 py-1.5 rounded-lg">
                <span className="text-[0.65rem] text-[#ccc] font-bold">TM</span>
                <div className="flex gap-1 mr-1">
                    {Array.from({ length: timeoutsA }).map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-[var(--accent-orange)] shadow-[0_0_5px_var(--accent-orange)]" />)}
                </div>
                {canEdit && <button onClick={() => handleTeamAction('TIMEOUT', 'A')} className="bg-[#333] border border-[#555] text-white text-[0.6rem] px-2 py-1 rounded cursor-pointer hover:bg-[#444]">DEMANDER</button>}
            </div>
        </div>
        
        {/* LE CHRONOMÈTRE */}
        <div className="flex flex-col items-center justify-center px-4 md:px-8 border-x border-[#333] bg-[#0a0a0a]">
          <div className="text-4xl md:text-6xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {isEditing ? (
              <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                <input type="number" value={editMin} onChange={e => setEditMin(e.target.value)} className="w-12 md:w-16 bg-transparent text-center border-b-2 border-white text-4xl md:text-6xl text-white outline-none" />
                <span>:</span>
                <input type="number" value={editSec} onChange={e => setEditSec(e.target.value)} className="w-12 md:w-16 bg-transparent text-center border-b-2 border-white text-4xl md:text-6xl text-white outline-none" />
                <button onClick={handleSaveTime} className="ml-2 bg-[var(--success)] text-white text-sm font-bold px-3 py-1 rounded cursor-pointer">OK</button>
              </div>
            ) : (
              <span className="cursor-pointer hover:text-gray-300 transition-colors" onClick={(e) => { if(!isMatchOver && canEdit) { e.stopPropagation(); setIsEditing(true); setEditMin(Math.floor(time/60)); setEditSec(time%60); }}}>
                {Math.floor(time/60)}:{time%60 < 10 ? '0'+time%60 : time%60}
              </span>
            )}
          </div>
          {(!isMatchOver && canEdit && activeAction?.type !== 'STARTERS') && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => setIsRunning(!isRunning)} className={`px-4 py-2 rounded-lg font-black tracking-wider text-sm shadow-lg transition-all ${isRunning ? 'bg-[var(--danger)] text-white hover:bg-red-600' : 'bg-[var(--success)] text-white hover:bg-green-600'}`}>
                {isRunning ? 'PAUSE' : 'START'}
              </button>
              <button onClick={handleResetTime} className="bg-[#333] text-white px-3 py-2 rounded-lg font-bold text-xs hover:bg-[#444] transition-colors">RESET</button>
            </div>
          )}
          <div className="flex flex-col items-center gap-3 mt-4">
            <button onClick={(canEdit && !isMatchOver) ? nextPeriod : null} className={`text-[#aaa] font-bold text-xs bg-white/5 border border-[#333] px-3 py-1.5 rounded-full tracking-widest ${(!canEdit || isMatchOver) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10 hover:text-white transition-colors'}`}>
              PÉRIODE : {period}
            </button>
            <div 
                onClick={() => (!isMatchOver && canEdit) && setPossession(p => p === 'A' ? 'B' : 'A')}
                className={`flex items-center gap-5 bg-[#1a1a1a] px-5 py-1.5 rounded-full border border-[#333] select-none ${(!isMatchOver && canEdit) ? 'cursor-pointer' : 'cursor-default'} ${possession ? 'shadow-inner' : ''}`}
            >
                <span className={`text-2xl transition-all duration-200 ${possession === 'A' ? 'text-[var(--accent-orange)] drop-shadow-[0_0_8px_var(--accent-orange)]' : 'text-[#333]'}`}>◀</span>
                <span className="text-[0.65rem] font-bold text-[#666] tracking-widest">POSSESSION</span>
                <span className={`text-2xl transition-all duration-200 ${possession === 'B' ? 'text-[var(--accent-blue)] drop-shadow-[0_0_8px_var(--accent-blue)]' : 'text-[#333]'}`}>▶</span>
            </div>
          </div>
        </div>

        {/* SCORE ÉQUIPE B */}
        <div className="flex flex-col items-center flex-1">
            <h2 className="text-sm md:text-xl font-black text-white m-0 truncate w-full text-center tracking-wider">{teamB?.name}</h2>
            <p className="text-5xl md:text-7xl font-black text-[var(--accent-blue)] my-2 drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]">{scoreB}</p>
            <div className="flex flex-col items-center gap-1">
                <span className="text-[0.65rem] text-[#888] font-bold tracking-widest">FAUTES ÉQUIPE</span>
                <div className="flex items-center gap-2 h-4">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(idx => (
                        <div key={idx} className={`w-3.5 h-3.5 rounded-sm border border-[#555] ${idx <= teamFoulsB ? (idx >= 5 ? 'bg-[var(--danger)] border-[var(--danger)]' : 'bg-[var(--accent-blue)] border-[var(--accent-blue)]') : 'bg-transparent'}`} />
                      ))}
                    </div>
                    {teamFoulsB >= 5 && <span className="bg-[var(--danger)] text-white px-1.5 py-0.5 rounded font-bold text-[0.6rem] tracking-widest">BONUS</span>}
                </div>
            </div>
            <div className="flex items-center gap-2 mt-3 bg-white/5 px-3 py-1.5 rounded-lg">
                <span className="text-[0.65rem] text-[#ccc] font-bold">TM</span>
                <div className="flex gap-1 mr-1">
                    {Array.from({ length: timeoutsB }).map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-[var(--accent-blue)] shadow-[0_0_5px_var(--accent-blue)]" />)}
                </div>
                {canEdit && <button onClick={() => handleTeamAction('TIMEOUT', 'B')} className="bg-[#333] border border-[#555] text-white text-[0.6rem] px-2 py-1 rounded cursor-pointer hover:bg-[#444]">DEMANDER</button>}
            </div>
        </div>
      </div>

      {currentView === 'court' ? (
        <div className="flex flex-col xl:flex-row gap-4 items-start w-full relative">
            
            {/* TEAM A (GAUCHE) */}
            <div className="flex-1 w-full bg-[#111] border border-[#222] rounded-xl p-4 shadow-lg">
                <h3 className="text-center font-black tracking-widest text-[var(--accent-orange)] mb-4">{teamA?.name}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-4">
                  {playersA.filter(p => p.status === 'court').map(p => (
                      <PlayerCard key={p.id} team="A" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
                <p className="text-center border-t border-[#333] pt-2 text-[#888] mb-2 text-sm tracking-widest font-bold">BANC</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {playersA.filter(p => p.status === 'bench').map(p => (
                      <PlayerCard key={p.id} team="A" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
            </div>

            {/* BARRE D'ACTION (MILIEU) */}
            {canEdit && (
              <div className={`w-full xl:w-[180px] shrink-0 sticky top-5 p-4 rounded-xl border-2 transition-colors ${activeAction?.type === 'STARTERS' ? 'border-[var(--success)] bg-[rgba(52,199,89,0.1)]' : (pendingAssist ? 'border-[var(--success)] bg-[rgba(52,199,89,0.1)]' : (activeAction?.type === 'SUB' ? 'border-[var(--accent-purple)] bg-[rgba(157,78,221,0.1)]' : (pendingFoul ? 'border-[var(--danger)] bg-[rgba(255,59,48,0.1)]' : 'border-[#444] bg-[#1a1a1a]')))}`}>
                {activeAction?.type === 'STARTERS' ? (
                    <div className="flex flex-col gap-3">
                        <span className="text-center text-xs font-bold text-[var(--success)] tracking-widest">🏀 SÉLECTION TITULAIRES</span>
                        <button className="bg-[var(--success)] text-white border-none py-3 px-2 rounded-lg text-sm font-black cursor-pointer hover:bg-green-600 transition-colors shadow-lg" onClick={() => {
                            const courtA = playersA.filter(p=>p.status==='court').length;
                            const courtB = playersB.filter(p=>p.status==='court').length;
                            if (courtA !== 5 || courtB !== 5) {
                                toast.error(`Il n'y a pas 5 joueurs par équipe ! (A: ${courtA}/5, B: ${courtB}/5)`);
                                return;
                            }
                            setActiveAction(null);
                            setStartersValidated(true); 
                        }}>
                            VALIDER LE 5 MAJEUR
                        </button>
                    </div>
                ) : pendingFoul ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-center text-xs font-bold text-[var(--danger)] tracking-widest mb-2">TYPE DE FAUTE ?</span>
                    <button className="bg-[#333] text-white border border-[#555] py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-[#444]" onClick={() => handleConfirmFoul('P')}>SIMPLE (P)</button>
                    <button className="bg-[#333] text-white border border-[#555] py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-[#444]" onClick={() => handleConfirmFoul('PO')}>OFFENSIVE (PO)</button>
                    <button className="bg-transparent text-[var(--danger)] border-2 border-[var(--danger)] py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-[var(--danger)] hover:text-white transition-colors" onClick={() => handleConfirmFoul('T')}>TECHNIQUE (T)</button>
                    <button className="bg-transparent text-[var(--danger)] border-2 border-[var(--danger)] py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-[var(--danger)] hover:text-white transition-colors" onClick={() => handleConfirmFoul('U')}>ANTISPORTIVE (U)</button>
                    <button className="bg-[var(--danger)] text-white border-none py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-red-700" onClick={() => handleConfirmFoul('D')}>DISQ (D)</button>
                    <button className="bg-transparent text-[#888] underline border-none py-2.5 rounded font-bold text-xs cursor-pointer hover:text-white mt-2" onClick={() => setPendingFoul(null)}>ANNULER</button>
                  </div>
                ) : pendingAssist ? (
                  <div className="flex flex-col gap-3">
                    <span className="text-center text-xs font-bold text-[var(--success)] tracking-widest">QUI A FAIT LA PASSE ?</span>
                    <button className="bg-[#444] text-white border-none py-3 rounded font-bold text-sm cursor-pointer hover:bg-[#555]" onClick={() => setPendingAssist(null)}>SANS PASSEUR</button>
                  </div>
                ) : activeAction?.type === 'SUB' ? (
                  <div className="flex flex-col gap-3">
                    <span className="text-center text-xs font-bold text-[var(--accent-purple)] tracking-widest">MODE REMPLACEMENT</span>
                    <button className="bg-[var(--accent-purple)] text-white py-3 rounded-lg font-black text-sm border-none cursor-pointer shadow-lg hover:bg-purple-600 transition-colors" onClick={handleConfirmSubs}>VALIDER CHANGEMENTS</button>
                    {!isForcedSub && <button className="bg-transparent text-[#888] underline border-none py-2 rounded font-bold text-xs cursor-pointer hover:text-white" onClick={() => {setActiveAction(null); setPendingSubs([]);}}>ANNULER</button>}
                  </div>
                ) : (
                  <div className="flex flex-col w-full gap-2">
                    <div className="flex gap-1.5">
                      {['PLUS1', 'PLUS2', 'PLUS3'].map(type => (
                        <button key={type} className={`flex-1 py-2.5 rounded font-black text-base cursor-pointer transition-all border-2 ${activeAction?.type === type ? 'bg-white text-black border-white scale-105' : 'bg-transparent text-white border-[#555] hover:border-white'}`} onClick={() => setActiveAction({type, value: parseInt(type.replace('PLUS', ''))})}>+{type.replace('PLUS', '')}</button>
                      ))}
                    </div>
                    
                    <div className="w-full h-px bg-[#333] my-1"></div>

                    {/* LIGNE REBONDS : OREB | DREB */}
                    <div className="flex gap-1.5 w-full">
                        <button
                            className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'OREB' ? 'bg-[var(--success)] text-white border-[var(--success)]' : 'bg-transparent text-[var(--success)] border-[var(--success)] hover:bg-[var(--success)] hover:text-white'}`}
                            onClick={() => setActiveAction({type: 'OREB', value: null})}>
                            OREB
                        </button>
                        <button
                            className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'DREB' ? 'bg-[var(--success)] text-white border-[var(--success)]' : 'bg-transparent text-[var(--success)] border-[var(--success)] hover:bg-[var(--success)] hover:text-white'}`}
                            onClick={() => setActiveAction({type: 'DREB', value: null})}>
                            DREB
                        </button>
                    </div>

                    {/* LIGNE DÉFENSE : STL | BLK */}
                    <div className="flex gap-1.5 w-full">
                        <button
                            className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'STL' ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]' : 'bg-transparent text-[var(--accent-blue)] border-[var(--accent-blue)] hover:bg-[var(--accent-blue)] hover:text-white'}`}
                            onClick={() => setActiveAction({type: 'STL', value: null})}>
                            STL
                        </button>
                        <button
                            className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'BLK' ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]' : 'bg-transparent text-[var(--accent-blue)] border-[var(--accent-blue)] hover:bg-[var(--accent-blue)] hover:text-white'}`}
                            onClick={() => setActiveAction({type: 'BLK', value: null})}>
                            BLK
                        </button>
                    </div>

                    {/* LIGNE ERREURS/FAUTES : TOV | FOUL */}
                    <div className="flex gap-1.5 w-full">
                        <button
                            className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'TOV' ? 'bg-[#888] text-white border-[#888]' : 'bg-transparent text-[#ccc] border-[#666] hover:bg-[#666] hover:text-white'}`}
                            onClick={() => setActiveAction({type: 'TOV', value: null})}>
                            TOV
                        </button>
                        <button
                            className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'FOUL' ? 'bg-[var(--danger)] text-white border-[var(--danger)]' : 'bg-transparent text-[var(--danger)] border-[var(--danger)] hover:bg-[var(--danger)] hover:text-white'}`}
                            onClick={() => setActiveAction({type: 'FOUL', value: null})}>
                            FOUL
                        </button>
                    </div>

                    {/* BOUTON CHANGEMENT */}
                    <button
                        className={`w-full mt-1 py-2.5 rounded font-black tracking-widest text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'SUB' ? 'bg-[var(--accent-purple)] text-white border-[var(--accent-purple)]' : 'bg-transparent text-[var(--accent-purple)] border-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white'}`}
                        onClick={() => setActiveAction({type: 'SUB', value: null})}>
                        SUB
                    </button>

                    {activeAction && <button onClick={() => setActiveAction(null)} className="w-full mt-2 py-2 rounded font-bold text-xs bg-transparent text-[#888] underline border-none cursor-pointer hover:text-white">ANNULER</button>}
                  </div>
                )}
              </div>
            )}

            {/* TEAM B (DROITE) */}
            <div className="flex-1 w-full bg-[#111] border border-[#222] rounded-xl p-4 shadow-lg">
                <h3 className="text-center font-black tracking-widest text-[var(--accent-blue)] mb-4">{teamB?.name}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-4">
                  {playersB.filter(p => p.status === 'court').map(p => (
                      <PlayerCard key={p.id} team="B" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
                <p className="text-center border-t border-[#333] pt-2 text-[#888] mb-2 text-sm tracking-widest font-bold">BANC</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {playersB.filter(p => p.status === 'bench').map(p => (
                      <PlayerCard key={p.id} team="B" player={p} onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} pendingSubs={pendingSubs} pendingAction={pendingAction} onConfirm={confirmScore} hasGlobalAction={!!activeAction || !!pendingAssist} pendingAssist={pendingAssist} activeActionType={activeAction?.type} canEdit={canEdit} />
                  ))}
                </div>
            </div>

        </div>
      ) : (
        <div className="flex flex-col gap-8 bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <BoxscoreTable title={teamA?.name} players={playersA} color="var(--accent-orange)" />
          <BoxscoreTable title={teamB?.name} players={playersB} color="var(--accent-blue)" />
        </div>
      )}

      {/* --- HISTORIQUE (Mode Play-by-Play Pro) --- */}
      <div className="mt-12 bg-[#111] border border-[#222] p-5 rounded-xl shadow-lg">
        <h3 className="text-white border-b border-[#333] pb-3 mb-5 text-lg font-bold">🗓️ Play-by-Play (Historique)</h3>
        <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2">
          {history.length === 0 ? (
            <p className="text-center text-[#666] italic py-5">Aucune action enregistrée</p>
          ) : (
            history.map((act, i) => {
              const teamPlayers = act.team === 'A' ? playersA : playersB;
              const playerInfo = teamPlayers.find(p => p.id === act.playerId);
              const actionColor = act.team === 'A' ? 'var(--accent-orange)' : 'var(--accent-blue)';
              
              return (
                <div key={i} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-md border-l-4" style={{ borderLeftColor: actionColor }}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-center font-mono text-xs">
                      <strong className="text-white block">{act.period}</strong> 
                      <span className="text-[#888]">{Math.floor(act.time/60)}:{act.time%60 < 10 ? '0'+act.time%60 : act.time%60}</span>
                    </div>
                    
                    <div className="text-sm font-bold tracking-wide">
                      {act.type === 'SUB' && <span className="text-[#aaa]">🔄 REMPLACEMENT <span className="text-xs font-normal text-[#666] ml-2 block sm:inline">{act.details}</span></span>}
                      
                      {act.type === 'SCORE' && (
                        <span style={{ color: actionColor }}>
                          {act.value === 1 ? '🎯 LF RÉUSSI (+1)' : act.value === 3 ? '🔥 3 PTS RÉUSSI (+3)' : '🏀 TIR RÉUSSI (+2)'} 
                          <strong className="text-white ml-2">#{playerInfo?.number} {playerInfo?.name}</strong>
                        </span>
                      )}
                      
                      {act.type === 'MISS' && (
                        <span className="text-[#777]">
                          {act.value === 1 ? '❌ LF MANQUÉ' : act.value === 3 ? '❌ 3 PTS MANQUÉ' : '❌ TIR MANQUÉ'} 
                          <strong className="text-[#aaa] ml-2">#{playerInfo?.number} {playerInfo?.name}</strong>
                        </span>
                      )}
                      
                      {!['SUB', 'SCORE', 'MISS'].includes(act.type) && (
                        <span style={{ color: actionColor }}>
                          {act.type === 'TIMEOUT' ? '⏱️ TEMPS MORT' : 
                           act.type === 'FOUL' ? `⚠️ FAUTE ${act.foulType === 'PO' ? 'OFFENSIVE' : act.foulType === 'T' ? 'TECHNIQUE' : act.foulType === 'U' ? 'ANTISPORTIVE' : act.foulType === 'D' ? 'DISQUALIFIANTE' : 'PERSONNELLE'}` :
                           `${act.type === 'AST' ? '🤝 PASS D.' : act.type === 'OREB' ? '🛡️ REB OFF' : act.type === 'DREB' ? '🛡️ REB DEF' : act.type === 'STL' ? '🥷 INTERCEPTION' : act.type === 'BLK' ? '🧱 CONTRE' : act.type === 'TOV' ? '🗑️ BALLE PERDUE' : act.type}`}
                           
                           {act.type !== 'TIMEOUT' && <strong className="text-white ml-2">#{playerInfo?.number} {playerInfo?.name}</strong>}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {(!isMatchOver && canEdit) && (
                    <button onClick={() => { 
                      setConfirmData({
                        isOpen: true, title: "Supprimer l'action", message: "Voulez-vous vraiment supprimer cette action de l'historique ? Le score et les fautes seront recalculés.", isDanger: true,
                        onConfirm: () => { deleteAction(i); toast.success("Action supprimée avec succès"); }
                      });
                    }} className="text-[#555] bg-transparent border-none text-xl cursor-pointer hover:text-[var(--danger)] p-2 transition-colors" title="Supprimer l'action">
                      ✕
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --- LE MODÈLE CACHÉ POUR L'EXPORT PDF (Garde ses styles inline exprès !) --- */}
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