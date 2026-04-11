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
    setConfirmData, setPromptData, update 
    
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

  // 1. Récupération des paramètres (avec 5 fautes perso et 4 fautes d'équipe par défaut)
  const settings = tourney?.matchsettings || { 
    periodCount: 4, 
    periodDuration: 10, 
    timeoutsHalf1: 2, 
    timeoutsHalf2: 3,
    maxFouls: 5,        // <-- NOUVEAU
    bonusFouls: 4,
    courtSize: 5       // <-- NOUVEAU
  };

  const maxFouls = settings.maxFouls || 5;
  const bonusFouls = settings.bonusFouls || 4;
  const courtSize = settings.courtSize || 5;
  const pointsSystem = settings.pointsSystem || 'standard'; // 👈 LA LIGNE MAGIQUE EST ICI !
  const isSpecificallyAssigned = localStorage.getItem(`canEdit_match_${matchId}`) === "true";
  const canEdit = userRole === 'ADMIN' || isSpecificallyAssigned;
  const saveKey = `basketMatchSave_${matchId}`;

  const getSafeSave = () => {
    try {
      const saved = localStorage.getItem(saveKey);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // MODIFICATION : La clé contient déjà le matchId, on lui fait confiance !
      // Ça évite que le 1v1 n'écrase la sauvegarde pendant le chargement de la page.
      return parsed.playersA ? parsed : null;
    } catch (e) { return null; }
  };

  // 🧠 SYNCHRONISATION INTELLIGENTE : Fusionne la sauvegarde avec les VRAIES équipes actuelles
  const syncPlayers = (baseTeam, savedList) => {
    const freshTeam = tourney?.teams?.find(t => t.id === baseTeam?.id) || baseTeam;
    const freshPlayers = freshTeam?.players || [];
    const initialStatus = courtSize === 1 ? 'court' : 'bench';

    // On se base STRICTEMENT sur la vraie liste des joueurs. 
    // Si un joueur a été supprimé de l'équipe, il sera naturellement ignoré ici !
    return freshPlayers.map(freshP => {
      // Cherche si ce joueur existait déjà dans la sauvegarde du match
      const existingStat = (savedList || []).find(sp => sp.id === freshP.id);
      
      if (existingStat) {
        // Le joueur était là : on garde ses stats, mais on met à jour son nom/numéro (au cas où modifiés)
        return { ...existingStat, name: freshP.name, number: freshP.number };
      } else {
        // Nouveau joueur ajouté après la création du match : on l'initialise à zéro
        return {
          ...freshP, 
          status: initialStatus, 
          points: 0, fouls: 0, ast: 0, oreb: 0, dreb: 0, tov: 0, stl: 0, blk: 0, timePlayed: 0,
          ftm: 0, fta: 0, fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, plusMinus: 0
        };
      }
    });
  };

  const safeSave = getSafeSave();
  const matchData = tourney?.schedule?.find(m => m.id === matchId) || tourney?.playoffs?.matches?.find(m => m.id === matchId);
  const cloudHasStarters = matchData?.savedStatsA?.some(p => p.status === 'court') || matchData?.startersValidated;

  const initialStartersValidated = isFinished || 
    (safeSave ? (!!safeSave.startersValidated || (safeSave.history && safeSave.history.length > 0)) : false) || 
    (matchData?.liveHistory?.length > 0) || 
    cloudHasStarters ||
    courtSize === 1;

  const [startersValidated, setStartersValidated] = useState(initialStartersValidated);
  
  // 🔥 L'état s'initialise désormais avec la fusion intelligente
  const [playersA, setPlayersA] = useState(() => syncPlayers(teamA, savedStatsA || (safeSave ? safeSave.playersA : matchData?.savedStatsA)));
  const [playersB, setPlayersB] = useState(() => syncPlayers(teamB, savedStatsB || (safeSave ? safeSave.playersB : matchData?.savedStatsB)));
  
  const [time, setTime] = useState(() => isFinished ? 0 : (safeSave ? safeSave.time : (matchData?.liveTime !== undefined ? matchData.liveTime : settings.periodDuration * 60)));
  const [period, setPeriod] = useState(() => isFinished ? 'FIN' : (safeSave ? safeSave.period : (matchData?.livePeriod || 'Q1')));
  const [possession, setPossession] = useState(() => isFinished ? null : (safeSave ? safeSave.possession : (matchData?.livePossession || null)));
  const [history, setHistory] = useState(() => safeSave ? safeSave.history : (matchData?.liveHistory || []));

  // 🔄 GESTION DU CHARGEMENT ASYNCHRONE (Rafraîchissement F5)
  useEffect(() => {
    // On relance la fusion intelligente si l'appli met du temps à charger les données
    if (teamA?.players && playersA.length === 0) {
      const savedDataA = getSafeSave()?.playersA || matchData?.savedStatsA;
      setPlayersA(syncPlayers(teamA, savedDataA));
    }
    if (teamB?.players && playersB.length === 0) {
      const savedDataB = getSafeSave()?.playersB || matchData?.savedStatsB;
      setPlayersB(syncPlayers(teamB, savedDataB));
    }
    
    const savedData = getSafeSave();
    if (savedData && savedData.history && history.length === 0) setHistory(savedData.history);
  }, [teamA, teamB, matchId]);
  
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

  // 1. On calcule les points marqués via la table de marque
  const statScoreA = playersA.reduce((sum, p) => sum + p.points, 0);
  const statScoreB = playersB.reduce((sum, p) => sum + p.points, 0);

  // 2. Si le match est terminé, on priorise le score officiel (saisie manuelle ✏️). 
  // Sinon (match en cours), on affiche le calcul en direct.
  const scoreA = isFinished ? (matchData?.scoreA ?? statScoreA) : statScoreA;
  const scoreB = isFinished ? (matchData?.scoreB ?? statScoreB) : statScoreB;

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

  
  useEffect(() => {
    // 👇 LE BOUCLIER : On refuse de sauvegarder si les joueurs sont vides (évite d'écraser la sauvegarde au rafraîchissement)
    if (!playersA || playersA.length === 0 || !playersB || playersB.length === 0) return;

    if (!isFinished && canEdit) { 
      const gameState = { playersA, playersB, time, period, history, isMatchOver, possession, startersValidated };
      localStorage.setItem(saveKey, JSON.stringify(gameState));
    }
  }, [playersA, playersB, time, period, history, isMatchOver, possession, startersValidated, isFinished, saveKey, canEdit]);

  // 🛡️ NOUVEAU : On utilise une réf pour ne pas spammer la base de données au chargement de la page
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!canEdit || isMatchOver) return;
    
    // On ignore juste la toute première lecture automatique
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (!startersValidated && history.length === 0) return;
    }
    
       
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
    
    // 🧹 NETTOYAGE : Si le match n'a pas vraiment commencé, on déchire le "ticket" de l'organisateur !
    if (!startersValidated && history.length === 0) {
        localStorage.removeItem(`canEdit_match_${matchId}`);
        localStorage.removeItem(`basketMatchSave_${matchId}`);
    }
    
    if (canEdit && !isMatchOver) {
        try {
            const isPlayoff = tourney?.playoffs?.matches?.some(m => m.id === matchId);
            const matchArray = isPlayoff ? tourney.playoffs.matches : tourney.schedule;
            
            if (matchArray) {
                const matchIndex = matchArray.findIndex(m => m.id === matchId);
        if (matchIndex > -1) {
            // 👇 NOUVEAU : On repasse le statut en "pending" si le 5 majeur est annulé
            const newStatus = isMatchOver ? 'finished' : ((startersValidated || history.length > 0) ? 'ongoing' : 'pending');

            const updatedMatch = {
                ...matchArray[matchIndex],
                savedStatsA: playersA,
                savedStatsB: playersB,
                liveTime: time,
                livePeriod: period,
                liveHistory: history,
                livePossession: possession,
                startersValidated: startersValidated,
                status: newStatus, // 👈 ON INJECTE LE VRAI STATUT ICI
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
                    
                    // 🚀 NOUVEAU : On utilise "update()" au lieu de "supabase.from..."
                    // Cela met à jour le cloud ET rafraîchit l'interface instantanément !
                    if (update) {
                        update(payload);
                    } else {
                        supabase.from('tournaments').update(payload).eq('id', tourney?.id).then();
                    }
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
    { playersA, playersB, time, period, history, isRunning, startersValidated, possession }, 
    { setPlayersA, setPlayersB, setTime, setPeriod, setHistory, setIsRunning, setStartersValidated, setActiveAction, setPossession }, 
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
            
            // 👇 REMPLACE LE 5 PAR courtSize ICI 👇
            if (targetPlayer?.status === 'bench' && courtCount >= courtSize) {
                setTimeout(() => toast.error(`${courtSize} joueurs maximum sur le terrain !`), 10);
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
        // On ne bloque que si ce n'est PAS un 1v1
        if (courtSize !== 1 && clickedPlayer && clickedPlayer.fouls >= maxFouls && clickedPlayer.status === 'court') {
           toast.error(`Ce joueur a ${maxFouls} fautes, il doit obligatoirement sortir.`); return;
        }
        setPendingSubs(prev => prev.filter(id => id !== pid));
      } else {
        if (courtSize !== 1 && clickedPlayer && clickedPlayer.fouls >= maxFouls && clickedPlayer.status === 'bench') {
           toast.error(`Ce joueur est exclu (${maxFouls} fautes) et ne peut plus jouer.`); return;
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
        return;
    }
    if (['FT', 'PLUS1', 'PLUS2', 'PLUS3'].includes(finalActionType)) { 
        setPendingAction({ team, playerId: pid, value: finalActionValue, type: finalActionType }); 
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
  
  const handleConfirmFoul = (typeFoul) => {
    if (!pendingFoul || !canEdit) return;
    
    const { team, playerId } = pendingFoul;
    const isA = team === 'A';

    const updateFouls = (list) => list.map(p => {
      if (p.id === playerId) {
        let up = { ...p };
        up.fouls += 1;
        
        // Sauvegarde de la lettre
        up.foulTypes = [...(up.foulTypes || []), typeFoul]; 
        
        if (typeFoul === 'T') up.techFouls = (up.techFouls || 0) + 1;
        if (typeFoul === 'U') up.antiFouls = (up.antiFouls || 0) + 1;
        if (typeFoul === 'D') up.isDisqualified = true;
        
        return up;
      }
      return p;
    });

    if (isA) setPlayersA(updateFouls(playersA));
    else setPlayersB(updateFouls(playersB));

    // On enregistre la faute dans l'historique pour le Play-by-Play et les Fautes d'Équipe
    setHistory([{ 
      team, 
      playerId, 
      type: 'FOUL', 
      foulType: typeFoul, 
      time, 
      period 
    }, ...history]);

    // Nettoyage
    setPendingFoul(null);
    setActiveAction(null);
  };

  const handleConfirmSubs = () => {
    // === CAS 1 : SORTIE OBLIGATOIRE ===
    if (isForcedSub) {
      const forcedPlayerA = playersA.find(p => p.status === 'court' && isPlayerExcluded(p));
      const forcedPlayerB = playersB.find(p => p.status === 'court' && isPlayerExcluded(p));
      const forcedPlayer = forcedPlayerA || forcedPlayerB;
      const isTeamA = !!forcedPlayerA;
      const playersList = isTeamA ? playersA : playersB;

      // On compte les joueurs dispos sur le banc
      const availableBench = playersList.filter(p => p.status === 'bench' && !isPlayerExcluded(p)).length;
      const subInId = pendingSubs.length > 0 ? pendingSubs[0] : null;

      // VERROUILLAGE : S'il y a des remplaçants dispos, on refuse la sortie à 4
      if (!subInId && availableBench > 0) {
          toast.error(`Action impossible : Il reste ${availableBench} joueur(s) valide(s) sur le banc.`);
          return;
      }

      const updateList = (list) => list.map(p => {
        if (p.id === forcedPlayer.id) return { ...p, status: 'bench' }; 
        if (subInId && p.id === subInId) return { ...p, status: 'court' }; 
        return p;
      });

      if (isTeamA) setPlayersA(updateList(playersA));
      else setPlayersB(updateList(playersB));

      setPendingSubs([]);
      setActiveAction(null);
      return;
    }

    // === CAS 2 : CHANGEMENTS CLASSIQUES ===
    if (!canEdit || pendingSubs.length < 2) return;
    const isTeamA = playersA.some(p => pendingSubs.includes(p.id));
    const activeTeam = isTeamA ? 'A' : 'B';
    const playersList = isTeamA ? playersA : playersB;
    const pIn = playersList.filter(p => pendingSubs.includes(p.id) && p.status === 'bench');
    const pOut = playersList.filter(p => pendingSubs.includes(p.id) && p.status === 'court');

    const newCourtCount = playersList.filter(p => p.status === 'court').length - pOut.length + pIn.length;
    
    const availableBench = playersList.filter(p => p.status === 'bench' && !isPlayerExcluded(p) && !pendingSubs.includes(p.id)).length;

    if (newCourtCount > courtSize) { toast.error(`Remplacement invalide : L'équipe se retrouverait avec ${newCourtCount} joueurs.`); return; }
    if (pOut.length > pIn.length) {
        if (availableBench > 0) { toast.error(`Remplacement incomplet : Il reste ${availableBench} remplaçant(s) valide(s).`); return; }
        const fouledOuts = pOut.filter(p => isPlayerExcluded(p)).length;
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

    if (status === 'CANCEL') {
      setPendingAction(null);
      setActiveAction(null);
      return; 
    }

    // ON RÉCUPÈRE LE TYPE DE L'ACTION (FT, PLUS1, PLUS2, PLUS3)
    const { team, playerId, value, type } = pendingAction;
    const isA = team === 'A';
    
    // 🧠 FONCTION INTELLIGENTE DE RÉPARTITION DES STATS
    const mapStats = (up, isMade) => {
      if (type === 'FT') {
        // C'est un lancer franc
        if (isMade) up.ftm += 1;
        up.fta += 1;
      } else {
        // C'est un tir sur le terrain (Field Goal)
        // On écoute le paramètre du tournoi en priorité
        const isStreetFormat = pointsSystem === 'street' || (!pointsSystem && courtSize !== 5);
        
        if (isStreetFormat) {
          // Logique Streetball (+1 / +2)
          if (value === 1) { 
            if (isMade) up.fg2m += 1; 
            up.fg2a += 1; 
          } else if (value === 2) { 
            if (isMade) up.fg3m += 1; // Le +2 est un tir primé en street !
            up.fg3a += 1; 
          }
        } else {
          // Logique Classique (+2 / +3)
          if (value === 2) { 
            if (isMade) up.fg2m += 1; 
            up.fg2a += 1; 
          } else if (value === 3) { 
            if (isMade) up.fg3m += 1; 
            up.fg3a += 1; 
          }
        }
      }
    };

    if (status === 'VALIDATED') {
      const updateList = (list, scoringTeam) => list.map(p => {
        let up = { ...p };
        if (p.id === playerId) {
          up.points += value;
          mapStats(up, true); // On ajoute le tir réussi
        }
        
        // On calcule le +/- uniquement en 5x5
        if (p.status === 'court' && courtSize === 5) { 
            up.plusMinus += (scoringTeam === isA) ? value : -value; 
        }
        
        return up;
      });
      
      setPlayersA(updateList(playersA, true)); 
      setPlayersB(updateList(playersB, false));
      setHistory([{ team, playerId, value, type, status: 'SCORE', time, period }, ...history]);
      
      // On déclenche l'assist SAUF pour un LF ou en 1v1
      if (type !== 'FT' && courtSize !== 1) { 
          setTimeout(() => setPendingAssist({ team, scorerId: playerId }), 10); 
      }
      
      const newScoreA = isA ? scoreA + value : scoreA;
      const newScoreB = !isA ? scoreB + value : scoreB;
      if (onLiveUpdate) onLiveUpdate(newScoreA, newScoreB);

    } else if (status === 'MISSED') {
      const updateMiss = (list) => list.map(p => {
        if (p.id === playerId) {
          let up = { ...p };
          mapStats(up, false); // On ajoute le tir raté
          return up;
        } 
        return p;
      });
      isA ? setPlayersA(updateMiss(playersA)) : setPlayersB(updateMiss(playersB));
      setHistory([{ team, playerId, value, type, status: 'MISS', time, period }, ...history]);
    }
    
    setPendingAction(null); 
    setActiveAction(null);
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

  // --- DÉTECTION AUTOMATIQUE DES EXCLUSIONS ---
  // 2. La détection automatique devient dynamique
  const isPlayerExcluded = (p) => 
    (courtSize !== 1 && p.fouls >= maxFouls) || 
    (p.techFouls || 0) >= 2 || 
    (p.antiFouls || 0) >= 2 || 
    p.isDisqualified;
  const isForcedSub = [...playersA, ...playersB].some(p => p.status === 'court' && isPlayerExcluded(p));

  // 👇 DÉBUT DU RENDU RESPONSIVE TAILWIND 👇
  return (
    <div className="w-full h-full flex flex-col max-w-[1920px] mx-auto p-2 sm:p-4 md:p-6 relative">
      
      {/* TOP BAR PREMIUM */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4 bg-app-panel/80 backdrop-blur-md p-4 rounded-2xl border border-muted-line shadow-lg relative z-10">
        
        <div className="flex items-center gap-4">
          <button 
            className="bg-app-input text-muted-light font-black tracking-widest uppercase border border-muted-line px-5 py-2.5 rounded-xl hover:bg-muted-dark hover:text-white transition-all cursor-pointer shadow-inner text-xs" 
            onClick={handleExit}
          >
            ⬅ RETOUR
          </button>
          
          {canEdit ? (
            <span className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-lg border shadow-sm ${isOnline ? 'bg-primary/10 text-primary border-primary/30' : 'bg-danger/10 text-danger border-danger/30'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></div>
              {isOnline ? 'EN LIGNE' : 'HORS-LIGNE'}
            </span>
          ) : (
            <span className="bg-action/10 border border-action/30 text-action px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-black flex items-center gap-2 shadow-sm animate-pulse">
              <span className="text-sm">👁️</span> MODE SPECTATEUR (DIRECT)
            </span>
          )}
        </div>

        <div className="flex gap-3 items-center">
            <div className="flex bg-app-input rounded-xl p-1 border border-muted-line shadow-inner">
              <button 
                className={`px-5 py-2 rounded-lg font-black tracking-widest text-xs transition-all ${currentView === 'court' ? 'bg-gradient-to-r from-secondary to-danger text-white shadow-md' : 'bg-transparent text-muted hover:text-muted-light'}`} 
                onClick={() => !isFinished && setCurrentView('court')}
              >
                TERRAIN
              </button>
              <button 
                className={`px-5 py-2 rounded-lg font-black tracking-widest text-xs transition-all ${currentView === 'boxscore' ? 'bg-gradient-to-r from-secondary to-danger text-white shadow-md' : 'bg-transparent text-muted hover:text-muted-light'}`} 
                onClick={() => setCurrentView('boxscore')}
              >
                STATS
              </button>
            </div>
            
            {isMatchOver && (
              <button 
                onClick={handleGeneratePDF} 
                className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl font-black tracking-widest text-xs hover:bg-white/20 transition-all shadow-md cursor-pointer"
              >
                GÉNÉRER PDF 📄
              </button>
            )}
            
            {(!isMatchOver && canEdit) && (
              <button 
                onClick={handleFinishMatch} 
                className="bg-gradient-to-r from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-black tracking-widest text-xs hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                TERMINER LE MATCH 🏁
              </button>
            )}
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
        bonusFouls={bonusFouls}
      />

      {/* --- VUE TERRAIN (COURT) --- */}
      {currentView === 'court' ? (
        <div className="flex flex-col gap-6 w-full relative z-10">
          
          {/* 1. CONSOLE D'ACTIONS : REMONTÉE EN HAUT (PLEINE LARGEUR) */}
          {canEdit && (
            <div className="w-full">
              <ActionPanel 
                activeAction={activeAction} 
                setActiveAction={setActiveAction}
                pendingFoul={pendingFoul} 
                setPendingFoul={setPendingFoul} 
                handleConfirmFoul={handleConfirmFoul}
                pendingAssist={pendingAssist} 
                setPendingAssist={setPendingAssist}
                isForcedSub={isForcedSub} 
                handleConfirmSubs={handleConfirmSubs} 
                pendingSubs={pendingSubs} 
                pendingAction={pendingAction}
                setPendingAction={setPendingAction}
                setPendingSubs={setPendingSubs}
                playersA={playersA} 
                playersB={playersB} 
                setStartersValidated={setStartersValidated}
                courtSize={courtSize}
                pointsSystem={settings?.pointsSystem}
              />
            </div>
          )}

          {/* 2. GRILLE DES ÉQUIPES : CÔTE À CÔTE (LARGEUR MAXIMISÉE) */}
          <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            
            {/* TERRAIN ÉQUIPE A */}
            <div className="flex-1 w-full bg-app-panel/80 backdrop-blur-md border border-muted-line rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-danger shadow-[0_0_15px_rgba(249,115,22,0.4)] opacity-80"></div>
                <h3 className="text-center font-black tracking-widest text-secondary mb-6 mt-2 text-lg uppercase drop-shadow-md">{teamA?.name}</h3>
                
                {/* LES TITULAIRES */}
                <div className={`grid gap-3 pb-6 ${courtSize === 1 ? 'grid-cols-1 max-w-[280px] mx-auto' : 'grid-cols-2 sm:grid-cols-5'}`}>
                  {playersA.filter(p => p.status === 'court').map(p => (
                      <PlayerCard 
                        key={p.id} 
                        team="A" 
                        player={p} 
                        onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} 
                        pendingSubs={pendingSubs} 
                        pendingAction={pendingAction} 
                        onConfirm={confirmScore} 
                        hasGlobalAction={!!activeAction || !!pendingAssist} 
                        pendingAssist={pendingAssist} 
                        activeActionType={activeAction?.type} 
                        canEdit={canEdit} 
                        maxFouls={maxFouls}
                        pendingFoul={pendingFoul}
                        isForcedSub={isForcedSub} 
                        courtSize={courtSize}
                      />
                  ))}
                </div>
                
                {/* 👇 LE BANC (MASQUÉ EN 1v1) 👇 */}
                {courtSize !== 1 && (
                  <>
                    <div className="flex items-center gap-3 mb-4 mt-2">
                      <div className="h-px bg-muted-line flex-1"></div>
                      <p className="text-center text-muted text-[10px] tracking-widest font-black uppercase m-0">BANC</p>
                      <div className="h-px bg-muted-line flex-1"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {playersA.filter(p => p.status === 'bench').map(p => (
                          <PlayerCard 
                            key={p.id} 
                            team="A" 
                            player={p} 
                            onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} 
                            pendingSubs={pendingSubs} 
                            pendingAction={pendingAction} 
                            onConfirm={confirmScore} 
                            hasGlobalAction={!!activeAction || !!pendingAssist} 
                            pendingAssist={pendingAssist} 
                            activeActionType={activeAction?.type} 
                            canEdit={canEdit} 
                            maxFouls={maxFouls}
                            pendingFoul={pendingFoul}
                            isForcedSub={isForcedSub} 
                            courtSize={courtSize}
                          />
                      ))}
                    </div>
                  </>
                )}
            </div>

            {/* TERRAIN ÉQUIPE B */}
            <div className="flex-1 w-full bg-app-panel/80 backdrop-blur-md border border-muted-line rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-action to-action-light shadow-[0_0_15px_rgba(59,130,246,0.4)] opacity-80"></div>
                <h3 className="text-center font-black tracking-widest text-action mb-6 mt-2 text-lg uppercase drop-shadow-md">{teamB?.name}</h3>
                
                {/* LES TITULAIRES */}
                <div className={`grid gap-3 pb-6 ${courtSize === 1 ? 'grid-cols-1 max-w-[280px] mx-auto' : 'grid-cols-2 sm:grid-cols-5'}`}>
                  {playersB.filter(p => p.status === 'court').map(p => (
                      <PlayerCard 
                        key={p.id} 
                        team="B" 
                        player={p} 
                        onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} 
                        pendingSubs={pendingSubs} 
                        pendingAction={pendingAction} 
                        onConfirm={confirmScore} 
                        hasGlobalAction={!!activeAction || !!pendingAssist} 
                        pendingAssist={pendingAssist} 
                        activeActionType={activeAction?.type} 
                        canEdit={canEdit} 
                        maxFouls={maxFouls}
                        pendingFoul={pendingFoul} 
                        isForcedSub={isForcedSub}
                        courtSize={courtSize}
                      />
                  ))}
                </div>
                
                {/* 👇 LE BANC (MASQUÉ EN 1v1) 👇 */}
                {courtSize !== 1 && (
                  <>
                    <div className="flex items-center gap-3 mb-4 mt-2">
                      <div className="h-px bg-muted-line flex-1"></div>
                      <p className="text-center text-muted text-[10px] tracking-widest font-black uppercase m-0">BANC</p>
                      <div className="h-px bg-muted-line flex-1"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {playersB.filter(p => p.status === 'bench').map(p => (
                          <PlayerCard 
                            key={p.id} 
                            team="B" 
                            player={p} 
                            onPlayerClick={(type, t, pid) => handleAction(activeAction?.type || type, t, pid, activeAction?.value)} 
                            pendingSubs={pendingSubs} 
                            pendingAction={pendingAction} 
                            onConfirm={confirmScore} 
                            hasGlobalAction={!!activeAction || !!pendingAssist} 
                            pendingAssist={pendingAssist} 
                            activeActionType={activeAction?.type} 
                            canEdit={canEdit} 
                            maxFouls={maxFouls}
                            pendingFoul={pendingFoul} 
                            isForcedSub={isForcedSub}
                            courtSize={courtSize}
                          />
                      ))}
                    </div>
                  </>
                )}
            </div>

          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8 bg-app-panel/80 backdrop-blur-md p-6 rounded-3xl border border-muted-line shadow-2xl relative z-10">
          <BoxscoreTable 
            title={teamA?.name} 
            players={playersA} 
            color="#f97316" // secondary
            courtSize={courtSize} 
          />
          <BoxscoreTable 
            title={teamB?.name} 
            players={playersB} 
            color="#3b82f6" // action
            courtSize={courtSize} 
          />
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
          pointsSystem={pointsSystem}
          courtSize={courtSize}
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