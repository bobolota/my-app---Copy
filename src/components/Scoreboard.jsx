import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import useMatchSync from '../hooks/useMatchSync';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { useAppContext } from '../context/AppContext';
import BoxscoreTable from './BoxscoreTable';
import PlayerCard from './PlayerCard';
import PlayByPlayHistory from './PlayByPlayHistory';
import PdfScoreSheet from './PdfScoreSheet';
import ScoreBanner from './ScoreBanner';
import ActionPanel from './ActionPanel';
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

  const handleDeleteActionClick = (index) => {
    setConfirmData({
      isOpen: true, 
      title: "Supprimer l'action", 
      message: "Voulez-vous vraiment supprimer cette action de l'historique ? Le score et les fautes seront recalculés.", 
      isDanger: true,
      onConfirm: () => { 
        deleteAction(index); 
        toast.success("Action supprimée avec succès"); 
      }
    });
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
    <div className="w-full h-full flex flex-col max-w-[1920px] mx-auto p-2 sm:p-4 md:p-6">
      {/* TOP BAR */}
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
      
      {/* BANDEAU DES SCORES ET CHRONO */}
      <ScoreBanner 
        teamA={teamA} teamB={teamB} scoreA={scoreA} scoreB={scoreB}
        teamFoulsA={teamFoulsA} teamFoulsB={teamFoulsB} timeoutsA={timeoutsA} timeoutsB={timeoutsB}
        canEdit={canEdit} isMatchOver={isMatchOver} handleTeamAction={handleTeamAction}
        isEditing={isEditing} setIsEditing={setIsEditing} editMin={editMin} setEditMin={setEditMin} editSec={editSec} setEditSec={setEditSec}
        time={time} isRunning={isRunning} setIsRunning={setIsRunning} handleSaveTime={handleSaveTime} handleResetTime={handleResetTime}
        nextPeriod={nextPeriod} period={period} possession={possession} setPossession={setPossession} activeAction={activeAction}
      />

      {currentView === 'court' ? (
        <div className="flex flex-col xl:flex-row gap-4 items-start w-full relative">
            
            {/* TERRAIN ÉQUIPE A */}
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

            {/* CONSOLE D'ACTIONS CENTRALE */}
            {canEdit && (
              <ActionPanel 
                activeAction={activeAction} setActiveAction={setActiveAction}
                pendingFoul={pendingFoul} setPendingFoul={setPendingFoul} handleConfirmFoul={handleConfirmFoul}
                pendingAssist={pendingAssist} setPendingAssist={setPendingAssist}
                isForcedSub={isForcedSub} handleConfirmSubs={handleConfirmSubs} setPendingSubs={setPendingSubs}
                playersA={playersA} playersB={playersB} setStartersValidated={setStartersValidated}
              />
            )}

            {/* TERRAIN ÉQUIPE B */}
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
      <PlayByPlayHistory 
          history={history} 
          playersA={playersA} 
          playersB={playersB} 
          isMatchOver={isMatchOver} 
          canEdit={canEdit} 
          onDeleteActionClick={handleDeleteActionClick} 
      />

      {/* --- LE MODÈLE CACHÉ POUR L'EXPORT PDF --- */}
      <PdfScoreSheet 
        teamA={teamA} 
        teamB={teamB} 
        playersA={playersA} 
        playersB={playersB} 
        scoreA={scoreA} 
        scoreB={scoreB} 
      />
    </div> 
  );
}