import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient';

export default function PlayoffsTab({
  tourney,
  canEdit,
  update,
  currentUserName,
  handleLaunchMatch,
  handleAssignOtm,
  handleMatchException,
  getGroupLimit,
  getGroupStandings, // Assure-toi que cette fonction est bien passée en prop !
  setActiveTab // Et celle-ci aussi !
}) {
  
  const playoffMatches = (tourney.matches || []).filter(m => m.type === 'playoff');

  // 🚀 NOUVEAU : SÉPARATION 100% INFAILLIBLE (Basée sur le mot "manual" dans l'ID)
  const bracketMatches = playoffMatches.filter(m => !String(m.id).includes('manual'));
  const customMatches = playoffMatches.filter(m => String(m.id).includes('manual'));

  // 🛠️ NOUVEAUX ÉTATS POUR LA MODALE
  const [manualMatchModal, setManualMatchModal] = useState(false);
  const [manualTeamA, setManualTeamA] = useState('');
  const [manualTeamB, setManualTeamB] = useState('');
  const [manualMatchLabel, setManualMatchLabel] = useState('Match de Classement');
  
  // 🔒 NOUVEAU : LE DÉTECTEUR DE PHASE (Trouve le tour le plus bas encore en cours)
  const pendingPlayoffMatches = bracketMatches.filter(m => !['finished', 'forfeit', 'canceled'].includes(m.status));
  const lowestPendingRound = pendingPlayoffMatches.length > 0 
      ? Math.min(...pendingPlayoffMatches.map(m => m.round || m.metadata?.round || 1))
      : 999;
  
  const [draggedMatchId, setDraggedMatchId] = useState(null);
  const { setConfirmData, fetchTournaments, setTournaments } = useAppContext();

  const [editingScoreId, setEditingScoreId] = useState(null);
  const [tempScoreA, setTempScoreA] = useState(0);
  const [tempScoreB, setTempScoreB] = useState(0);
  const [swapSource, setSwapSource] = useState(null);

  
  // --- 🛠️ 1. ÉCHANGE D'ÉQUIPES RÉPARÉ ET VERROUILLÉ ---
  const handleSwapClick = async (match, slot, isMatchLocked = false) => {
    // 🔒 On bloque si le match est terminé, annulé, forfait ou verrouillé par l'arbre
    if (!canEdit || match.status === 'finished' || match.status === 'canceled' || match.status === 'forfeit' || isMatchLocked) {
        return;
    }
    
    const team = match[slot];
    if (!team) return;

    if (!swapSource) {
      setSwapSource({ matchId: match.id, slot, team });
      toast("Sélectionnez l'équipe avec laquelle échanger", { icon: "🔄", duration: 3000 });
    } else {
      if (swapSource.matchId === match.id && swapSource.slot === slot) {
        setSwapSource(null);
        return;
      }

      const slotKey1 = swapSource.slot === 'teamA' ? 'team_a' : 'team_b';
      const slotKey2 = slot === 'teamA' ? 'team_a' : 'team_b';

      const id1 = match[slot]?.id || match[slot];
      const id2 = swapSource.team?.id || swapSource.team;

      await supabase.from('matches').update({ [slotKey1]: id1 }).eq('id', swapSource.matchId);
      await supabase.from('matches').update({ [slotKey2]: id2 }).eq('id', match.id);

      setSwapSource(null);
      toast.success("Affiches modifiées avec succès ! 🔀");
      if (fetchTournaments) await fetchTournaments();
    }
  };

  // --- 🛠️ LA SAUVEGARDE ET AVANCÉE DÉFINITIVE ---
  const saveManualScore = async (matchId) => {
    const finalScoreA = parseInt(tempScoreA, 10) || 0;
    const finalScoreB = parseInt(tempScoreB, 10) || 0;

    const currentMatch = playoffMatches.find(m => m.id === matchId);
    if (!currentMatch) return;

    // 1. Extraire l'ID du gagnant
    let winnerId = null;
    const getTeamId = (t) => t ? (typeof t === 'object' ? t.id : t) : null;
    
    if (finalScoreA > finalScoreB) winnerId = getTeamId(currentMatch.teamA || currentMatch.team_a);
    else if (finalScoreB > finalScoreA) winnerId = getTeamId(currentMatch.teamB || currentMatch.team_b);

    // 💡 L'ADRESSE DE DESTINATION (On lit directement sur le match car AppContext a étalé les données)
    const nextMatchId = currentMatch.nextMatchId || currentMatch.metadata?.nextMatchId;
    const nextSlot = currentMatch.nextSlot || currentMatch.metadata?.nextSlot;

    const newMatches = [...(tourney.matches || [])];

    // 2. Fermer le match actuel à l'écran
    const matchIdx = newMatches.findIndex(m => m.id === matchId);
    if (matchIdx > -1) {
        newMatches[matchIdx] = { ...newMatches[matchIdx], scoreA: finalScoreA, scoreB: finalScoreB, score_a: finalScoreA, score_b: finalScoreB, status: 'finished' };
    }

    // 3. Pousser le gagnant au match suivant (Écran + Base de données)
    if (winnerId && nextMatchId) {
        const nextMatchIdx = newMatches.findIndex(m => m.id === nextMatchId);
        const nextSlotDb = nextSlot === 'teamA' ? 'team_a' : 'team_b';
        
        if (nextMatchIdx > -1) {
            newMatches[nextMatchIdx] = {
                ...newMatches[nextMatchIdx],
                [nextSlotDb]: winnerId,
                [nextSlot]: winnerId // Force l'affichage React
            };
        }
        // Envoi silencieux du vainqueur dans la case suivante
        supabase.from('matches').update({ [nextSlotDb]: winnerId }).eq('id', nextMatchId);
    }

    // 4. Envoi du score final du match actuel
    await supabase.from('matches').update({ score_a: finalScoreA, score_b: finalScoreB, status: 'finished' }).eq('id', matchId);

    // 5. Affichage final
    update({ matches: newMatches });
    setEditingScoreId(null);
    toast.success("Score validé et équipe avancée ! 🏆");
  };

  // 🗑️ SUPPRIMER UN MATCH (Poule ou Playoff)
  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm("⚠️ Voulez-vous vraiment supprimer ce match définitivement ?")) return;

    // 1. Disparition instantanée à l'écran (Optimistic UI)
    update({ matches: (tourney.matches || []).filter(m => m.id !== matchId) });

    // 2. Suppression dans la base de données
    const { error } = await supabase.from('matches').delete().eq('id', matchId);

    if (error) {
      toast.error("Erreur réseau lors de la suppression.");
      console.error(error);
    } else {
      toast.success("Match pulvérisé ! 🗑️");
    }
  };
  
  // --- 🛠️ CRÉATION MANUELLE D'UN MATCH SUR-MESURE ---
  const handleCreateManualMatch = async () => {
    if (!manualTeamA || !manualTeamB) {
      toast.error("Veuillez sélectionner deux équipes. 🏀");
      return;
    }
    if (manualTeamA === manualTeamB) {
      toast.error("Une équipe ne peut pas s'affronter elle-même ! ❌");
      return;
    }

    const fullTeamA = tourney.teams?.find(t => String(t.id) === String(manualTeamA));
    const fullTeamB = tourney.teams?.find(t => String(t.id) === String(manualTeamB));

    const newMatchData = {
      id: `p_manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tournament_id: tourney.id,
      type: 'playoff',
      team_a: fullTeamA,
      team_b: fullTeamB,
      status: 'pending',
      score_a: 0,
      score_b: 0,
      metadata: { 
        isCustom: true, 
        label: manualMatchLabel || "Match Sur-Mesure" 
      }
    };

    const { data, error } = await supabase.from('matches').insert([newMatchData]).select().single();

    if (error) {
      toast.error("Erreur réseau lors de la création.");
    } else {
      const localMatch = { ...data, teamA: fullTeamA, teamB: fullTeamB };
      update({ matches: [...(tourney.matches || []), localMatch] });
      
      toast.success("Match sur-mesure créé avec succès ! ✅");
      setManualMatchModal(false);
      setManualTeamA('');
      setManualTeamB('');
      setManualMatchLabel('Match de Classement');
    }
  };

  // --- 🛠️ 3. GÉNÉRATION DE L'ARBRE (PERSISTANCE CORRIGÉE) ---
  const generatePlayoffs = async () => {
    if (!canEdit) return;

    const poolMatches = (tourney.matches || []).filter(m => m.type === 'pool');

    if (poolMatches.length === 0) {
      toast.error("Impossible : Aucun match de poule n'a été généré.");
      return;
    }

    const resolvedMatches = poolMatches.filter(m => ['finished', 'forfeit', 'canceled'].includes(m.status)).length;
    const totalMatches = poolMatches.length;

    if (resolvedMatches < totalMatches) {
      const remaining = totalMatches - resolvedMatches;
      toast.error(`Tous les matchs de poule doivent être terminés. Il reste ${remaining} match(s).`);
      return;
    }

    const executeGeneration = async () => {
      // 🚀 OPTIMISTIC UI
      setTournaments(prev => prev.map(t => 
        t.id === tourney.id ? { ...t, matches: (t.matches || []).filter(m => m.metadata?.isCustom || m.type !== 'playoff') } : t
      ));

      const qualifiedTeams = [];
      const savedGroupIds = [...new Set((tourney.teams || []).map(t => t.groupId).filter(g => g !== null))].sort((a,b) => a-b);
      
      let maxLimit = 0;
      savedGroupIds.forEach(gNum => {
        const limit = getGroupLimit(tourney, gNum);
        if(limit > maxLimit) maxLimit = limit;
      });

      for(let rank = 0; rank < maxLimit; rank++) {
        savedGroupIds.forEach(gNum => {
          const limit = getGroupLimit(tourney, gNum);
          if (rank < limit && getGroupStandings) {
            const standings = getGroupStandings(gNum);
            if (standings[rank]) qualifiedTeams.push(standings[rank]);
          }
        });
      }

      const totalTeams = qualifiedTeams.length;
      if (totalTeams < 2) { toast.error("Il faut au moins 2 équipes qualifiées."); return; }

      let size = 2;
      while (size < totalTeams && size <= 1024) size *= 2;

      const seeded = new Array(size).fill(null);
      for(let i=0; i<totalTeams; i++) seeded[i] = qualifiedTeams[i];
      for(let i=totalTeams; i<size; i++) seeded[i] = { id: `bye_${i}`, name: 'EXEMPTÉ', isBye: true };

      const getRoundLabel = (matchesCount, matchIdx) => {
        if (matchesCount === 1) return "FINALE";
        if (matchesCount === 2) return `DEMI-FINALE ${matchIdx + 1}`;
        if (matchesCount === 4) return `QUART DE FINALE ${matchIdx + 1}`;
        if (matchesCount === 8) return `8ÈME DE FINALE ${matchIdx + 1}`;
        if (matchesCount === 16) return `16ÈME DE FINALE ${matchIdx + 1}`;
        return `MATCH ${matchIdx + 1}`;
      };

      const newMatchesToInsert = [];
      let numMatchesInRound = size / 2;
      let roundNum = 1;
      const ts = Date.now();

      for (let i = 0; i < numMatchesInRound; i++) {
        const tA = seeded[i];
        const tB = seeded[size - 1 - i];
        const hasBye = tA.isBye || tB.isBye;

        newMatchesToInsert.push({
          id: `p_${ts}_r${roundNum}_m${i}`,
          tournament_id: tourney.id,
          type: 'playoff',
          team_a: tA?.id || null, // CORRECTION BDD
          team_b: tB?.id || null, // CORRECTION BDD
          score_a: 0, score_b: 0, 
          status: hasBye ? 'finished' : 'pending',
          metadata: {
            round: roundNum,
            label: getRoundLabel(numMatchesInRound, i),
            nextMatchId: numMatchesInRound === 1 ? null : `p_${ts}_r${roundNum+1}_m${Math.floor(i/2)}`,
            nextSlot: i % 2 === 0 ? 'teamA' : 'teamB',
            isByeMatch: hasBye,
            byeWinnerId: hasBye ? (tA.isBye ? tB.id : tA.id) : null
          }
        });
      }

      numMatchesInRound /= 2;
      roundNum++;

      while (numMatchesInRound >= 1) {
        for (let i = 0; i < numMatchesInRound; i++) {
          newMatchesToInsert.push({
            id: `p_${ts}_r${roundNum}_m${i}`,
            tournament_id: tourney.id,
            type: 'playoff',
            team_a: null, team_b: null, 
            score_a: 0, score_b: 0, status: 'pending',
            metadata: {
              round: roundNum,
              label: getRoundLabel(numMatchesInRound, i),
              nextMatchId: numMatchesInRound === 1 ? null : `p_${ts}_r${roundNum+1}_m${Math.floor(i/2)}`,
              nextSlot: i % 2 === 0 ? 'teamA' : 'teamB'
            }
          });
        }
        numMatchesInRound /= 2;
        roundNum++;
      }

            
      // 🚀 NOUVEAU : On propage les Exemptés (Byes) immédiatement dans le Tour 2
      newMatchesToInsert.forEach(m => {
          if (m.metadata.isByeMatch && m.metadata.nextMatchId) {
              const nextM = newMatchesToInsert.find(x => x.id === m.metadata.nextMatchId);
              if (nextM) {
                  const nextSlotDb = m.metadata.nextSlot === 'teamA' ? 'team_a' : 'team_b';
                  nextM[nextSlotDb] = m.metadata.byeWinnerId;
              }
          }
      });

      // On ne supprime QUE les matchs de l'arbre principal (on protège les Custom)
      const oldBracketIds = bracketMatches.map(m => m.id);
      if (oldBracketIds.length > 0) {
        await supabase.from('matches').delete().in('id', oldBracketIds);
      }

      // 2. Insertion des nouveaux matchs
      const { error } = await supabase.from('matches').insert(newMatchesToInsert);
      
      // ... suite du code

      if (error) {
        toast.error("Erreur de sauvegarde dans la base de données.");
        return;
      }

      // 🚨 LA LIGNE SUPABASE SUR 'TOURNAMENTS' A ÉTÉ SUPPRIMÉE ICI 🚨

      if (setActiveTab) setActiveTab("finale");
      toast.success("Phase finale générée avec succès !");
      
      // C'est cette fonction qui va recharger les matchs et afficher l'arbre
      if (fetchTournaments) fetchTournaments();
    };

    if (tourney.playoffs?.status === 'started' || playoffMatches.length > 0) {
       setConfirmData({
         isOpen: true,
         title: "Écraser la phase finale ?",
         message: "Une phase finale existe déjà. Voulez-vous la régénérer et écraser l'actuelle ?",
         isDanger: true,
         onConfirm: executeGeneration
       });
    } else {
       executeGeneration();
    }
  };

  // --- CALCULS DE L'ARBRE (POUR L'AFFICHAGE DU BOUTON GÉNÉRER) ---
  const savedGroupIds = [...new Set((tourney.teams || []).map(t => t.groupId).filter(g => g !== null))].sort((a,b) => a-b);
  const totalQualified = savedGroupIds.reduce((sum, gNum) => sum + getGroupLimit(tourney, gNum), 0);

  let bracketSize = 2;
  while (bracketSize < totalQualified && bracketSize <= 1024) { bracketSize *= 2; }
  
  const getStartRoundName = (size) => {
      if (size === 2) return "LA FINALE";
      if (size === 4) return "LES DEMI-FINALES";
      if (size === 8) return "LES QUARTS DE FINALE";
      if (size === 16) return "LES 8ÈMES DE FINALE";
      if (size === 32) return "LES 16ÈMES DE FINALE";
      return "LA PHASE FINALE";
  };

  const getRoundTitle = (matchCount) => {
      if (matchCount === 1) return "FINALE 🏆";
      if (matchCount === 2) return "DEMI-FINALES";
      if (matchCount === 4) return "QUARTS DE FINALE";
      if (matchCount === 8) return "8ÈMES DE FINALE";
      if (matchCount === 16) return "16ÈMES DE FINALE";
      return "TOUR";
  };

  const playoffRounds = [];
  if (bracketMatches.length > 0) {
      const maxRound = Math.max(1, ...bracketMatches.map(m => m.round || m.metadata?.round || 1));
      for (let r = 1; r <= maxRound; r++) {
          // 1. On récupère UNIQUEMENT les matchs de l'arbre principal
          const roundMatches = bracketMatches.filter(m => (m.round || m.metadata?.round || 1) === r);
          
          // 🛡️ LE CADENAS : On fige l'ordre des matchs
          roundMatches.sort((a, b) => {
              const getIndex = (matchId) => parseInt(matchId.split('_m')[1]) || 0;
              return getIndex(a.id) - getIndex(b.id);
          });
          
          playoffRounds.push(roundMatches);
      }
  }

  // --- DÉCOUPAGE SYMÉTRIQUE DE L'ARBRE (Le reste ne change pas) ---
  const columns = [];
  if (playoffRounds.length > 0) {
      const maxRound = playoffRounds.length;
      for (let r = 0; r < maxRound - 1; r++) {
          const roundMatches = playoffRounds[r];
          const half = Math.ceil(roundMatches.length / 2);
          columns.push({ id: `left-${r}`, title: getRoundTitle(roundMatches.length), matches: roundMatches.slice(0, half), isCenter: false });
      }
      columns.push({ id: `center`, title: "LA GRANDE FINALE 🏆", matches: playoffRounds[maxRound - 1], isCenter: true });
      for (let r = maxRound - 2; r >= 0; r--) {
          const roundMatches = playoffRounds[r];
          const half = Math.ceil(roundMatches.length / 2);
          columns.push({ id: `right-${r}`, title: getRoundTitle(roundMatches.length), matches: roundMatches.slice(half), isCenter: false });
      }
  }

  // --- LE COMPOSANT D'UN MATCH ---
      const renderMatch = (m) => {
          const resolveTeam = (t) => {
          if (!t) return null;
          // 1. Si c'est un ID de Bye (Exempté)
          if (typeof t === 'string' && t.startsWith('bye_')) return { id: t, name: 'EXEMPTÉ', isBye: true };
          if (t.isBye) return t; 

          // 2. Recherche blindée dans la liste des équipes
          const teamId = typeof t === 'object' ? t.id : t;
          const found = tourney?.teams?.find(team => String(team.id) === String(teamId));
          
          // 3. Si on ne trouve rien, on renvoie au moins l'ID pour ne pas planter
          return found || (typeof t === 'object' ? t : { id: t, name: "ID: " + t });
      };

          const teamA = resolveTeam(m.teamA || m.team_a);
          const teamB = resolveTeam(m.teamB || m.team_b);
        
      
      const sA = m.scoreA ?? m.score_a ?? 0;
      const sB = m.scoreB ?? m.score_b ?? 0;

      const courtSize = parseInt(tourney?.matchsettings?.courtSize) || 5;
      const isReady = teamA?.players?.length >= courtSize && teamB?.players?.length >= courtSize;
      const isFinished = m.status === 'finished';
      const isCanceled = m.status === 'canceled';
      const isForfeit = m.status === 'forfeit';

      // 🔒 NOUVEAU : LOGIQUE DE VERROUILLAGE STRICT
      const matchRound = m.round || m.metadata?.round || 1;
      const isRoundLocked = matchRound > lowestPendingRound; // Le tour d'avant n'est pas fini
      const isMissingTeams = !teamA || !teamB; // Il manque une équipe
      const isLocked = isRoundLocked || isMissingTeams;
      // ------------------------------------------
      
      let hasValidatedStarters = m.startersValidated === true;
      if (!hasValidatedStarters) {
          try {
              const localSave = localStorage.getItem(`basketMatchSave_${m.id}`);
              if (localSave) {
                  hasValidatedStarters = JSON.parse(localSave).startersValidated === true;
              }
          } catch(e) {}
      }
            
      const isOngoing = !isFinished && !isCanceled && !isForfeit && hasValidatedStarters;
      const isAssignedOtm = currentUserName && m.otm && m.otm.includes(currentUserName);
      const canLaunchThisMatch = canEdit || isAssignedOtm;

      const isSpectator = !canLaunchThisMatch;
      const canSpectateLive = isOngoing && tourney.isPublicScoreboard;
      const canViewStats = isFinished;
      
      // 🔒 MODIFIÉ : On intègre `isLocked` dans la désactivation du bouton
      const disableButton = isCanceled || isForfeit || (isSpectator && !canSpectateLive && !canViewStats) || (!isFinished && isLocked);

      let borderClass = 'border-l-[4px] border-l-danger';
      if (isOngoing) borderClass = 'border-l-[4px] border-l-action';
      else if (isCanceled || isForfeit) borderClass = 'border-l-[4px] border-l-muted-dark';
      else if (canLaunchThisMatch || isFinished) borderClass = 'border-l-[4px] border-l-secondary';

      // 🔒 NOUVEAU : On détermine si on a le droit d'intervertir sur ce match
      const canSwap = canEdit && !isFinished && !isCanceled && !isForfeit && !isLocked;

      return (
          <div 
            key={m.id} 
            className={`bg-app-card p-4 rounded-xl relative transition-all border border-muted-line shadow-lg w-full ${borderClass} opacity-100 scale-100 hover:border-white/20 hover:-translate-y-0.5 ${isCanceled ? 'opacity-60' : ''}`}
          >
              {/* On masque le bouton "Glisser" si on ne peut pas swap */}
              {/* 👇 LA CONDITION EST MODIFIÉE : canEdit ET ID contenant "manual" 👇 */}
  {(canEdit && String(m.id).includes('manual')) && (
    <button 
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMatch(m.id); }} 
      className="absolute top-2.5 right-2.5 w-6 h-6 rounded bg-danger/10 text-danger flex items-center justify-center text-xs cursor-pointer hover:bg-danger hover:text-white transition-colors border border-danger/20 z-20"
      title="Supprimer ce match"
    >
      🗑️
    </button>
  )}

              {isOngoing && <div className="absolute -top-2 -left-2 bg-action text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">EN COURS</div>}
              {isFinished && <div className="absolute -top-2 -left-2 bg-muted-dark text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">TERMINÉ</div>}
              {isCanceled && <div className="absolute -top-2 -left-2 bg-muted-dark text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">ANNULÉ</div>}
              {isForfeit && <div className="absolute -top-2 -left-2 bg-danger-dark text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">FORFAIT</div>}
              
              <div className="text-[0.65rem] text-secondary font-black mb-3 uppercase tracking-widest">{m.metadata?.label || m.label || "MATCH"}</div>
              
              {editingScoreId === m.id ? (
                <div className="flex flex-col gap-2 mt-3 mb-2 bg-app-input p-3 rounded-xl border border-muted-line shadow-inner">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-white font-bold truncate flex-1">{teamA?.name || 'Équipe A'}</span>
                    <input type="number" min="0" value={tempScoreA} onChange={e => setTempScoreA(e.target.value)} className="w-14 p-1.5 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner transition-colors" />
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-white font-bold truncate flex-1">{teamB?.name || 'Équipe B'}</span>
                    <input type="number" min="0" value={tempScoreB} onChange={e => setTempScoreB(e.target.value)} className="w-14 p-1.5 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner transition-colors" />
                  </div>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-muted-line">
                    <button onClick={(e) => { e.stopPropagation(); setEditingScoreId(null); }} className="flex-1 text-[0.65rem] font-bold text-muted hover:text-white py-1.5 transition-colors uppercase tracking-widest cursor-pointer">Annuler</button>
                    <button onClick={(e) => { e.stopPropagation(); saveManualScore(m.id); }} className="flex-1 text-[0.65rem] font-black bg-secondary/20 text-secondary hover:bg-secondary hover:text-white rounded py-1.5 transition-all shadow-md uppercase tracking-widest cursor-pointer border border-secondary/30">Valider</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 👇 MODIFIÉ : On passe isLocked à la fonction et on utilise canSwap pour le design 👇 */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); handleSwapClick(m, 'teamA', isLocked); }}
                    className={`flex justify-between items-center gap-2 mb-2 pr-6 py-1 px-2 -mx-2 rounded-lg transition-all ${canSwap && teamA ? 'cursor-pointer hover:bg-secondary/20' : ''} ${swapSource?.matchId === m.id && swapSource?.slot === 'teamA' ? 'bg-secondary text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : ''}`}
                  >
                      <span className={`text-sm truncate ${isFinished || isForfeit ? (sA > sB ? 'text-primary font-black' : 'text-muted-dark font-bold') : 'text-white font-black'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                          {teamA?.name || <span className="text-muted italic font-normal">À déterminer...</span>}
                      </span>
                      {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-app-input px-2.5 py-1 rounded border border-muted-line">{sA}</b>}
                  </div>

                  {/* 👇 MODIFIÉ : Pareil pour l'équipe B 👇 */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); handleSwapClick(m, 'teamB', isLocked); }}
                    className={`flex justify-between items-center gap-2 mb-2 pr-6 py-1 px-2 -mx-2 rounded-lg transition-all ${canSwap && teamB ? 'cursor-pointer hover:bg-secondary/20' : ''} ${swapSource?.matchId === m.id && swapSource?.slot === 'teamB' ? 'bg-secondary text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : ''}`}
                  >
                      <span className={`text-sm truncate ${isFinished || isForfeit ? (sB > sA ? 'text-primary font-black' : 'text-muted-dark font-bold') : 'text-white font-black'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                          {teamB?.name || <span className="text-muted italic font-normal">À déterminer...</span>}
                      </span>
                      {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-app-input px-2.5 py-1 rounded border border-muted-line">{sB}</b>}
                  </div>
                </>
              )}
              
              {m.otm && <div className="text-[0.65rem] font-bold text-muted mt-2 mb-1 truncate bg-black/30 border border-muted-line inline-block px-2.5 py-1 rounded-md w-fit">📋 OTM: <span className="text-secondary">{m.otm}</span></div>}
              
              {/* SAISIE HORAIRE ET TERRAIN SYNCHRONISÉE GLOBALEMENT */}
              {(canEdit && !isFinished && !isCanceled && !isForfeit) && (
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-muted-line" onClick={(e) => e.stopPropagation()}>
                  {/* Ligne 1 : Date et Heure */}
                  <div className="flex gap-2 w-full">
                    <input
                      type="date"
                      value={m.datetime ? m.datetime.split('T')[0] : ''}
                      onChange={async (e) => {
                        const d = e.target.value;
                        const t = m.datetime ? (m.datetime.split('T')[1] || '00:00') : '00:00';
                        const newDatetime = d ? `${d}T${t}` : null;

                        // 🚀 SYNCHRO GLOBALE (Met à jour Planning ET Arbitrages instantanément)
                        setTournaments(prev => prev.map(tour => 
                          tour.id === tourney.id 
                            ? { ...tour, matches: (tour.matches || []).map(match => match.id === m.id ? { ...match, datetime: newDatetime } : match) }
                            : tour
                        ));

                        // 💾 SAUVEGARDE BDD
                        await supabase.from('matches').update({ datetime: newDatetime }).eq('id', m.id);
                      }}
                      className="w-1/2 p-2 text-[10px] bg-app-input text-secondary font-black tracking-wider border border-muted-line rounded-lg focus:border-secondary outline-none transition-colors shadow-inner cursor-pointer"
                    />
                    <input
                      type="time"
                      value={m.datetime && m.datetime.includes('T') ? m.datetime.split('T')[1].substring(0, 5) : ''}
                      onChange={async (e) => {
                        const t = e.target.value;
                        const d = m.datetime ? m.datetime.split('T')[0] : new Date().toISOString().split('T')[0];
                        const newDatetime = `${d}T${t}`;

                        // 🚀 SYNCHRO GLOBALE
                        setTournaments(prev => prev.map(tour => 
                          tour.id === tourney.id 
                            ? { ...tour, matches: (tour.matches || []).map(match => match.id === m.id ? { ...match, datetime: newDatetime } : match) }
                            : tour
                        ));

                        // 💾 SAUVEGARDE BDD
                        await supabase.from('matches').update({ datetime: newDatetime }).eq('id', m.id);
                      }}
                      className="w-1/2 p-2 text-[10px] bg-app-input text-white font-black tracking-wider border border-muted-line rounded-lg focus:border-secondary outline-none transition-colors shadow-inner cursor-pointer"
                    />
                  </div>
                  {/* Ligne 2 : Terrain (Correction de la frappe) */}
                  <input
                    type="text"
                    placeholder="Nom du terrain..."
                    defaultValue={m.court || ''}
                    key={`court-${m.id}-${m.court || ''}`}
                    onBlur={async (e) => {
                      const newCourt = e.target.value;
                      if (newCourt === m.court) return; // Ne rien faire si on n'a rien changé

                      // 🚀 SYNCHRO GLOBALE
                      setTournaments(prev => prev.map(tour => 
                        tour.id === tourney.id 
                          ? { ...tour, matches: (tour.matches || []).map(match => match.id === m.id ? { ...match, court: newCourt } : match) }
                          : tour
                      ));

                      // 💾 SAUVEGARDE BDD
                      await supabase.from('matches').update({ court: newCourt }).eq('id', m.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur(); // Sauvegarde instantanée si on tape "Entrée"
                    }}
                    className="w-full p-2 text-[10px] bg-app-input text-white font-bold border border-muted-line rounded-lg focus:border-action outline-none transition-colors shadow-inner"
                  />
                </div>
              )}

              {/* AFFICHAGE LECTURE SEULE HARMONISÉ */}
              {(!canEdit || isFinished || isCanceled || isForfeit) && (m.datetime || m.court) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 justify-center">
                  {m.datetime && (
                    <div className="flex items-center gap-1 bg-secondary/10 border border-secondary/20 w-fit px-2 py-1 rounded-lg shadow-sm">
                      <span className="text-[10px]">📅</span>
                      <span className="text-secondary text-[9px] font-black uppercase tracking-widest">
                        {new Date(m.datetime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <span className="text-white text-[9px] font-black bg-secondary px-1.5 py-0.5 rounded ml-1">
                        {new Date(m.datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'H')}
                      </span>
                    </div>
                  )}
                  {m.court && (
                    <div className="bg-black/20 px-2 py-1 rounded-lg border border-muted-line text-muted-light text-[9px] font-black uppercase tracking-widest">
                      📍 {m.court}
                    </div>
                  )}
                </div>
              )}

              {(teamA?.isBye || teamB?.isBye) ? (
                  <div className="text-center text-[0.6rem] font-black tracking-wider text-muted mt-3 p-2 bg-app-input rounded-lg border border-dashed border-muted-line uppercase">
                      ⏩ Qualif. Directe
                  </div>
              ) : (
                  <div className="flex gap-1.5 mt-3 h-8 sm:h-9 w-full">
                    {/* GROS BOUTON (min-w-0 ajouté pour éviter qu'il ne pousse les autres) */}
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          if (disableButton) return;
                          
                          if (canLaunchThisMatch && !isReady && !isFinished && !['canceled', 'forfeit'].includes(m.status)) { 
                            toast.error("Impossible de lancer : il manque des joueurs.");
                            return; 
                          }
                          
                          handleLaunchMatch(m.id, canLaunchThisMatch);
                      }}
                      className={`flex-1 min-w-0 truncate px-1 rounded-md font-black tracking-wider text-[0.55rem] sm:text-[0.6rem] flex justify-center items-center text-center transition-all shadow-md ${
                          disableButton 
                              ? 'text-muted-dark bg-app-input cursor-not-allowed border border-muted-line shadow-none' 
                              : 'text-white cursor-pointer hover:-translate-y-0.5 ' + (
                                  isFinished ? 'bg-muted-dark hover:bg-muted border border-muted-line shadow-none text-muted-light' : 
                                  canLaunchThisMatch ? (isOngoing ? 'bg-gradient-to-r from-action to-action-light hover:shadow-[0_4px_10px_rgba(59,130,246,0.4)]' : 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-[0_4px_10px_rgba(16,185,129,0.4)]') : 
                                  'bg-danger/20 text-danger border border-danger/30 animate-pulse hover:bg-danger hover:text-white'
                              )
                      }`}
                      disabled={disableButton}
                    >
                        <span className="truncate">
                          {isCanceled ? "ANNULÉ" : isForfeit ? "FORFAIT" : (isFinished ? "📊 STATS" : (isLocked ? "🔒 ATTENTE" : (canLaunchThisMatch ? (isOngoing ? "▶️ REPRENDRE" : "🚀 LANCER") : (canSpectateLive ? "🔴 DIRECT" : "SCORE"))))}
                        </span>
                    </button>
                    
                    {/* PETITS BOUTONS (Réduits à w-7 et w-8) */}
                    {(canEdit && !isCanceled && !isForfeit && !isLocked) && (
                      <div className="flex gap-1 shrink-0">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingScoreId(m.id); 
                            setTempScoreA(sA || 0); 
                            setTempScoreB(sB || 0); 
                          }} 
                          className="w-7 sm:w-8 h-full rounded-md bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center text-xs cursor-pointer hover:bg-secondary hover:text-white transition-colors shadow-sm" 
                        >
                          ✏️
                        </button>
                        
                        {!isFinished && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, true); }} className="w-7 sm:w-8 h-full rounded-md bg-app-input border border-muted-line text-white flex items-center justify-center text-xs cursor-pointer hover:bg-secondary hover:border-secondary transition-colors shadow-sm">👤</button>
                            <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', true); }} className="w-7 sm:w-8 h-full rounded-md bg-white/5 border border-muted-line text-white flex items-center justify-center text-xs cursor-pointer hover:bg-muted-dark transition-colors shadow-sm">❌</button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMatchException(m.id, 'forfeit', true); }} className="w-7 sm:w-8 h-full rounded-md bg-danger/20 border border-danger/30 text-danger flex items-center justify-center text-xs cursor-pointer hover:bg-danger hover:text-white transition-colors shadow-sm">🏳️</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
              )}
          </div>
      );
  };

  // ==========================================
  // 💻 RENDU PRINCIPAL
  // ==========================================
  return (
    <div className="py-4 w-full flex-1 flex flex-col box-border">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-muted-line pb-5 mb-8 gap-5 w-full">
        <div className="text-left">
          <h2 className="m-0 text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-start gap-3">
            <span className="text-3xl drop-shadow-lg">🏆</span> 
            Phase Finale
          </h2>
          <p className="mt-2 text-muted font-medium text-sm text-left">
            L'arbre du tournoi. Seuls les meilleurs atteindront le sommet.
          </p>
        </div>
        
        {(playoffMatches.length > 0 && canEdit) && (
          <button 
            onClick={() => {
              setConfirmData({
                isOpen: true,
                title: "Réinitialiser l'arbre ? ⚠️",
                message: "Voulez-vous vraiment supprimer toute la phase finale ?",
                isDanger: true,
                onConfirm: async () => {
                  // On a supprimé les appels à "tournaments" ici !
                  const { error } = await supabase.from('matches').delete().eq('tournament_id', tourney.id).eq('type', 'playoff');
                  
                  if (error) toast.error("Erreur lors de la suppression");
                  else toast.success("Arbre réinitialisé !");
                  if (fetchTournaments) fetchTournaments();
                }
              });
            }} 
            className="bg-danger/10 border border-danger/30 text-danger px-4 py-2.5 rounded-lg text-xs font-black tracking-widest cursor-pointer hover:bg-danger hover:text-white transition-all shadow-sm shrink-0"
          >
            RESET TABLEAU ⚠️
          </button>
        )}
      </div>

      {swapSource && (
        <div className="bg-secondary/20 border border-secondary/50 text-secondary p-4 rounded-xl mb-6 flex justify-between items-center shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <strong className="block text-sm uppercase tracking-widest">Mode Modification des affiches</strong>
              <span className="text-xs text-muted-light">Cliquez sur une autre équipe pour l'échanger avec <b className="text-white">{swapSource.team.name}</b>.</span>
            </div>
          </div>
          <button onClick={() => setSwapSource(null)} className="bg-app-input hover:bg-app-panel text-white px-4 py-2 rounded-lg text-xs font-bold border border-muted-line cursor-pointer">ANNULER</button>
        </div>
      )}
      
      {bracketMatches.length === 0 ? (
        <div className="bg-app-panel/60 backdrop-blur-md border border-muted-line rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden flex flex-col items-center mt-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="text-6xl mb-6 drop-shadow-2xl relative z-10">⏳</div>
            
            {canEdit ? (
                <div className="relative z-10 flex flex-col items-center">
                    <p className="mb-8 text-sm sm:text-base text-muted-light font-medium text-center max-w-xl leading-relaxed">
                        <b className="text-secondary text-lg sm:text-xl font-black">{totalQualified} équipes</b> sont actuellement qualifiées d'après vos réglages de poules.
                    </p>
                    {totalQualified >= 2 ? (
                        <div className="flex flex-col items-center gap-6">
                            <span className="text-secondary text-xs sm:text-sm font-bold text-center bg-secondary/10 px-5 py-3 rounded-xl border border-secondary/20">
                                L'arbre sera généré pour <b>{bracketSize} places</b>. <br/>Les premiers de poules seront potentiellement exemptés (Bye) au 1er tour !
                            </span>
                            <button onClick={generatePlayoffs} className="bg-gradient-to-r from-secondary to-danger text-white px-8 py-4 rounded-xl text-sm sm:text-base font-black tracking-widest cursor-pointer hover:shadow-[0_6px_20px_rgba(249,115,22,0.4)] hover:-translate-y-1 transition-all mt-2">
                                🚀 GÉNÉRER {getStartRoundName(bracketSize)}
                            </button>
                        </div>
                    ) : (
                        <div className="text-danger text-sm font-bold bg-danger/10 border border-danger/20 px-5 py-3 rounded-xl">⚠️ Il faut au moins 2 équipes qualifiées pour générer l'arbre.</div>
                    )}
                </div>
            ) : (
                <div className="relative z-10 flex flex-col items-center">
                    <h3 className="text-xl sm:text-2xl text-white font-black mb-4 tracking-wide">En attente des qualifications</h3>
                    <p className="text-muted max-w-lg mx-auto leading-relaxed text-center text-sm md:text-base font-medium">
                        Le tableau de la phase finale sera généré dès que les matchs de poules seront terminés et que les positions seront figées. 
                        <br/><br/>
                        <span className="text-secondary font-black tracking-wide text-base sm:text-lg inline-block mt-2">Seuls les meilleurs décrocheront leur ticket pour {getStartRoundName(bracketSize)} !</span>
                    </p>
                </div>
            )}
        </div>
      ) : (
        /* 🚀 CONTENEUR PLEINE LARGEUR AVEC SCROLL INTELLIGENT */
        <div className="w-full overflow-x-auto py-8 custom-scrollbar">
            {/* 📏 min-w-full pour prendre tout l'écran, w-max pour autoriser le scroll, justify-center pour centrer si max-w est atteint */}
            <div className="flex gap-4 md:gap-8 px-4 pb-10 min-w-full w-max justify-center">
                {columns.map((col) => (
                    /* 📏 flex-1 pour s'étirer (effet accordéon), min-w pour ne pas s'écraser, max-w pour ne pas devenir géant */
                    <div key={col.id} className={`flex flex-col p-4 sm:p-6 rounded-3xl border relative overflow-hidden flex-1 min-w-[280px] max-w-[450px] shrink-0 ${col.isCenter ? 'bg-app-panel/90 border-secondary/30 shadow-[0_0_40px_rgba(249,115,22,0.15)] z-10' : 'bg-app-panel/60 backdrop-blur-sm border-muted-line shadow-xl'}`}>
                        {col.isCenter && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-warning via-secondary to-danger"></div>}
                        <h3 className={`text-center mb-8 pb-4 border-b font-black uppercase tracking-widest ${col.isCenter ? 'text-secondary border-secondary/30 text-xl drop-shadow-md' : 'text-muted-light border-muted-line text-base'}`}>
                            {col.title}
                        </h3>
                        <div className="flex flex-col justify-around gap-8 flex-1 w-full">
                            {col.matches.map(m => renderMatch(m))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 🛠️ NOUVEAU : SECTION DES MATCHS SUR-MESURE */}
      <div className="mt-12 pt-8 border-t border-muted-line w-full">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>⚔️</span> Matchs de Classement & Sur-Mesure
            </h3>
            {canEdit && (
                <button onClick={() => setManualMatchModal(true)} className="bg-app-input border border-dashed border-muted-line text-muted-light px-4 py-2.5 rounded-xl font-black tracking-widest text-[10px] sm:text-xs hover:text-white hover:border-secondary transition-all cursor-pointer">
                    ➕ NOUVEAU MATCH
                </button>
            )}
        </div>
        
        {customMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {customMatches.map(m => renderMatch(m))}
            </div>
        ) : (
            <div className="bg-app-panel/40 border border-muted-line rounded-2xl p-8 text-center text-muted text-sm font-bold">
                Aucun match sur-mesure pour le moment.
            </div>
        )}
      </div>

      {/* 🛠️ MODALE DE CRÉATION DE MATCH MANUEL */}
      {manualMatchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[100] p-4" onClick={() => setManualMatchModal(false)}>
          <div className="bg-app-panel border border-muted-line rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-5" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-2 border-b border-muted-line pb-4">
              <h3 className="text-white font-black tracking-widest uppercase m-0 flex items-center gap-2">
                <span>⚔️</span> Match Sur-Mesure
              </h3>
              <button onClick={() => setManualMatchModal(false)} className="bg-transparent border-none text-muted-dark hover:text-white cursor-pointer text-xl">✕</button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-muted font-black tracking-widest uppercase">Nom du match (Optionnel)</label>
                <input 
                  type="text" 
                  value={manualMatchLabel} 
                  onChange={(e) => setManualMatchLabel(e.target.value)}
                  className="w-full p-3 rounded-xl bg-app-input border border-muted-line text-white font-bold focus:outline-none focus:border-secondary transition-colors shadow-inner"
                  placeholder="Ex: Match pour la 3ème place..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-muted font-black tracking-widest uppercase">Équipe Domicile (A)</label>
                <select 
                  value={manualTeamA} 
                  onChange={(e) => setManualTeamA(e.target.value)}
                  className="w-full p-3 rounded-xl bg-app-input border border-muted-line text-white font-bold focus:outline-none focus:border-secondary transition-colors shadow-inner cursor-pointer"
                >
                  <option value="">-- Sélectionner une équipe --</option>
                  {(tourney.teams || []).map(t => (
                    <option key={`A-${t.id}`} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center -my-2 relative z-10 pointer-events-none">
                <span className="bg-app-panel text-muted-dark font-black text-xs px-3 py-1 rounded-full border border-muted-line">VS</span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-muted font-black tracking-widest uppercase">Équipe Extérieur (B)</label>
                <select 
                  value={manualTeamB} 
                  onChange={(e) => setManualTeamB(e.target.value)}
                  className="w-full p-3 rounded-xl bg-app-input border border-muted-line text-white font-bold focus:outline-none focus:border-secondary transition-colors shadow-inner cursor-pointer"
                >
                  <option value="">-- Sélectionner une équipe --</option>
                  {(tourney.teams || []).map(t => (
                    <option key={`B-${t.id}`} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              onClick={handleCreateManualMatch}
              className="w-full mt-2 bg-gradient-to-r from-secondary to-danger text-white border-none py-3.5 rounded-xl font-black tracking-widest cursor-pointer text-xs hover:shadow-[0_4px_15px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 transition-all shadow-lg"
            >
              VALIDER LA CONFRONTATION ✅
            </button>
          </div>
        </div>
      )}

        </div>
      )}
    </div>
  );
}