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
  
  const [draggedMatchId, setDraggedMatchId] = useState(null);
  const { setConfirmData, fetchTournaments, setTournaments } = useAppContext();

  const [editingScoreId, setEditingScoreId] = useState(null);
  const [tempScoreA, setTempScoreA] = useState(0);
  const [tempScoreB, setTempScoreB] = useState(0);
  const [swapSource, setSwapSource] = useState(null);

  
  // --- 🛠️ 1. ÉCHANGE D'ÉQUIPES RÉPARÉ ---
  const handleSwapClick = async (match, slot) => {
    if (!canEdit || match.status === 'finished') return;
    
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

  // --- 🛠️ LA SAUVEGARDE AVEC MISE À JOUR ÉCRAN FORCÉE ---
  const saveManualScore = async (matchId) => {
    const finalScoreA = parseInt(tempScoreA, 10) || 0;
    const finalScoreB = parseInt(tempScoreB, 10) || 0;

    const currentMatch = playoffMatches.find(m => m.id === matchId);
    if (!currentMatch) return;

    const meta = typeof currentMatch.metadata === 'string' ? JSON.parse(currentMatch.metadata) : (currentMatch.metadata || {});
    
    let winnerId = null;
    if (finalScoreA > finalScoreB) {
        const tA = currentMatch.teamA || currentMatch.team_a;
        winnerId = typeof tA === 'object' ? tA?.id : tA;
    } else if (finalScoreB > finalScoreA) {
        const tB = currentMatch.teamB || currentMatch.team_b;
        winnerId = typeof tB === 'object' ? tB?.id : tB;
    }

    // 🚀 MAGIE VISUELLE : On force l'écran à se mettre à jour tout de suite
    const newMatches = [...(tourney.matches || [])];
    
    // Fermer le match actuel
    const matchIdx = newMatches.findIndex(m => m.id === matchId);
    if (matchIdx > -1) {
        newMatches[matchIdx] = { ...newMatches[matchIdx], scoreA: finalScoreA, scoreB: finalScoreB, score_a: finalScoreA, score_b: finalScoreB, status: 'finished' };
    }

    // Pousser le gagnant à l'écran
    if (winnerId && meta.nextMatchId) {
        const nextMatchIdx = newMatches.findIndex(m => m.id === meta.nextMatchId);
        const nextSlotDb = meta.nextSlot === 'teamA' ? 'team_a' : 'team_b';
        
        if (nextMatchIdx > -1) {
            newMatches[nextMatchIdx] = {
                ...newMatches[nextMatchIdx],
                [nextSlotDb]: winnerId,
                [meta.nextSlot]: winnerId // On blinde la mise à jour React
            };
        }
        
        // Ordre silencieux à Supabase
        supabase.from('matches').update({ [nextSlotDb]: winnerId }).eq('id', meta.nextMatchId).then(({error}) => {
            if(error) console.error("Erreur Supabase:", error);
        });
    }

    // Enregistrement du score
    await supabase.from('matches').update({
      score_a: finalScoreA,
      score_b: finalScoreB,
      status: 'finished'
    }).eq('id', matchId);

    // 💥 On applique les changements à l'interface !
    update({ matches: newMatches });
    setEditingScoreId(null);
    toast.success("Score validé et arbre mis à jour ! 🏆");
  };

 // --- 🪄 LE BOUTON MAGIQUE QUI MET À JOUR L'ÉCRAN ---
  const syncBracket = async () => {
    let updatedCount = 0;
    const newMatches = [...(tourney.matches || [])];

    for (const m of playoffMatches) {
        if (m.status !== 'finished' && m.status !== 'forfeit') continue;
        
        const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : (m.metadata || {});
        if (!meta.nextMatchId) continue;

        let winnerId = null;
        if (meta.isByeMatch) {
            winnerId = meta.byeWinnerId; // C'est un exempté !
        } else {
            const sA = m.scoreA ?? m.score_a ?? 0;
            const sB = m.scoreB ?? m.score_b ?? 0;
            let winnerObj = null;
            if (sA > sB) winnerObj = m.teamA || m.team_a;
            else if (sB > sA) winnerObj = m.teamB || m.team_b;
            winnerId = typeof winnerObj === 'object' ? winnerObj?.id : winnerObj;
        }

        if (winnerId) {
            const nextMatchIdx = newMatches.findIndex(x => x.id === meta.nextMatchId);
            if (nextMatchIdx > -1) {
                const nextMatch = newMatches[nextMatchIdx];
                const nextSlotDb = meta.nextSlot === 'teamA' ? 'team_a' : 'team_b';
                const currentOccupant = typeof nextMatch[meta.nextSlot] === 'object' 
                    ? nextMatch[meta.nextSlot]?.id 
                    : (nextMatch[nextSlotDb] || nextMatch[meta.nextSlot]);

                if (currentOccupant !== winnerId) {
                    // Force React à dessiner l'équipe dans la nouvelle case
                    newMatches[nextMatchIdx] = {
                        ...nextMatch,
                        [nextSlotDb]: winnerId,
                        [meta.nextSlot]: winnerId
                    };
                    await supabase.from('matches').update({ [nextSlotDb]: winnerId }).eq('id', meta.nextMatchId);
                    updatedCount++;
                }
            }
        }
    }
    
    if (updatedCount > 0) {
        // 💥 Le secret est là : on rafraîchit l'interface immédiatement !
        update({ matches: newMatches });
        toast.success(`${updatedCount} équipe(s) avancée(s) ! 🚀`);
    } else {
        toast("Tout est déjà à sa place !", { icon: "✅" });
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
        t.id === tourney.id ? { ...t, matches: (t.matches || []).filter(m => m.type !== 'playoff') } : t
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

      await supabase.from('matches').delete().eq('tournament_id', tourney.id).eq('type', 'playoff');
      // 2. Insertion des nouveaux matchs (Ceci fonctionne car la table 'matches' est OK)
      const { error } = await supabase.from('matches').insert(newMatchesToInsert);

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
  if (playoffMatches.length > 0) {
      const maxRound = Math.max(1, ...playoffMatches.map(m => m.round || m.metadata?.round || 1));
      for (let r = 1; r <= maxRound; r++) {
          playoffRounds.push(playoffMatches.filter(m => (m.round || m.metadata?.round || 1) === r));
      }
  }

  // --- DÉCOUPAGE SYMÉTRIQUE DE L'ARBRE ---
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
              
              // 🪄 PHASE 1 : Détection magique des Exemptés (Byes)
              if (typeof t === 'string' && t.startsWith('bye_')) {
                  return { id: t, name: 'EXEMPTÉ', isBye: true };
              }
              if (t.isBye) return t; // Si c'est déjà un objet Bye

              // Recherche classique
              if (typeof t === 'string') return tourney?.teams?.find(team => team.id === t);
              if (t.id) return tourney?.teams?.find(team => team.id === t.id) || t;
              return t;
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
      const disableButton = isCanceled || isForfeit || (isSpectator && !canSpectateLive && !canViewStats);

      let borderClass = 'border-l-[4px] border-l-danger';
      if (isOngoing) borderClass = 'border-l-[4px] border-l-action';
      else if (isCanceled || isForfeit) borderClass = 'border-l-[4px] border-l-muted-dark';
      else if (canLaunchThisMatch || isFinished) borderClass = 'border-l-[4px] border-l-secondary';

      return (
          <div 
            key={m.id} 
            className={`bg-app-card p-4 rounded-xl relative transition-all border border-muted-line shadow-lg w-full ${borderClass} opacity-100 scale-100 hover:border-white/20 hover:-translate-y-0.5 ${isCanceled ? 'opacity-60' : ''}`}
          >
              {canEdit && <div className="absolute top-2.5 right-3 text-muted-dark text-lg hover:text-white cursor-grab transition-colors" title="Glisser pour intervertir">⠿</div>}

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
                  <div 
                    onClick={(e) => { e.stopPropagation(); handleSwapClick(m, 'teamA'); }}
                    className={`flex justify-between items-center gap-2 mb-2 pr-6 py-1 px-2 -mx-2 rounded-lg transition-all ${canEdit && teamA && !isFinished ? 'cursor-pointer hover:bg-secondary/20' : ''} ${swapSource?.matchId === m.id && swapSource?.slot === 'teamA' ? 'bg-secondary text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : ''}`}
                  >
                      <span className={`text-sm truncate ${isFinished || isForfeit ? (sA > sB ? 'text-primary font-black' : 'text-muted-dark font-bold') : 'text-white font-black'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                          {teamA?.name || <span className="text-muted italic font-normal">À déterminer...</span>}
                      </span>
                      {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-app-input px-2.5 py-1 rounded border border-muted-line">{sA}</b>}
                  </div>

                  <div 
                    onClick={(e) => { e.stopPropagation(); handleSwapClick(m, 'teamB'); }}
                    className={`flex justify-between items-center gap-2 mb-2 pr-6 py-1 px-2 -mx-2 rounded-lg transition-all ${canEdit && teamB && !isFinished ? 'cursor-pointer hover:bg-secondary/20' : ''} ${swapSource?.matchId === m.id && swapSource?.slot === 'teamB' ? 'bg-secondary text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : ''}`}
                  >
                      <span className={`text-sm truncate ${isFinished || isForfeit ? (sB > sA ? 'text-primary font-black' : 'text-muted-dark font-bold') : 'text-white font-black'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                          {teamB?.name || <span className="text-muted italic font-normal">À déterminer...</span>}
                      </span>
                      {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-app-input px-2.5 py-1 rounded border border-muted-line">{sB}</b>}
                  </div>
                </>
              )}
              
              {m.otm && <div className="text-[0.65rem] font-bold text-muted mt-2 mb-1 truncate bg-black/30 border border-muted-line inline-block px-2.5 py-1 rounded-md w-fit">📋 OTM: <span className="text-secondary">{m.otm}</span></div>}
              
              {/* SAISIE HORAIRE ET TERRAIN */}
                          {(canEdit && !isFinished && !isCanceled && !isForfeit) && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-muted-line" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2 flex-[3]">
                                <input
                                  type="date"
                                  value={m.datetime ? m.datetime.split('T')[0] : ''}
                                  onChange={async (e) => {
                                    const d = e.target.value;
                                    const t = m.datetime ? (m.datetime.split('T')[1] || '00:00') : '00:00';
                                    const newDatetime = d ? `${d}T${t}` : null;
                                    await supabase.from('matches').update({ datetime: newDatetime }).eq('id', m.id);
                                    if (fetchTournaments) fetchTournaments();
                                  }}
                                  className="w-full p-2.5 text-[10px] sm:text-xs bg-app-input text-secondary font-black tracking-widest border border-muted-line rounded-lg focus:border-secondary outline-none transition-colors shadow-inner cursor-pointer"
                                />
                                <input
                                  type="time"
                                  value={m.datetime && m.datetime.includes('T') ? m.datetime.split('T')[1].substring(0, 5) : ''}
                                  onChange={async (e) => {
                                    const t = e.target.value;
                                    const d = m.datetime ? m.datetime.split('T')[0] : new Date().toISOString().split('T')[0];
                                    const newDatetime = `${d}T${t}`;
                                    await supabase.from('matches').update({ datetime: newDatetime }).eq('id', m.id);
                                    if (fetchTournaments) fetchTournaments();
                                  }}
                                  className="w-full p-2.5 text-[10px] sm:text-xs bg-app-input text-white font-black tracking-widest border border-muted-line rounded-lg focus:border-secondary outline-none transition-colors shadow-inner cursor-pointer"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Court 1..."
                                value={m.court || ''}
                                onChange={async (e) => {
                                  const newCourt = e.target.value;
                                  await supabase.from('matches').update({ court: newCourt }).eq('id', m.id);
                                  if (fetchTournaments) fetchTournaments();
                                }}
                                className="flex-[2] p-2.5 text-xs bg-app-input text-white font-bold border border-muted-line rounded-lg focus:border-action outline-none transition-colors shadow-inner min-w-[70px]"
                              />
                            </div>
                          )}

                          {(!canEdit || isFinished || isCanceled || isForfeit) && m.datetime && (
                             <div className="mt-3 bg-secondary/10 border border-secondary/20 px-3 py-2 rounded-lg flex items-center justify-center gap-2">
                               <span className="text-xs">📅</span>
                               <span className="text-secondary text-[10px] font-black uppercase tracking-widest">
                                 {new Date(m.datetime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(':', 'H')}
                               </span>
                             </div>
                          )}

              {(teamA?.isBye || teamB?.isBye) ? (
                  <div className="text-center text-[0.65rem] font-black tracking-widest text-muted mt-4 p-2 bg-app-input rounded-lg border border-dashed border-muted-line uppercase">
                      ⏩ Qualification Directe
                  </div>
              ) : (
                  <div className="flex gap-2 mt-4 h-10">
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
                      className={`flex-1 rounded-lg font-black tracking-widest text-[0.65rem] transition-all shadow-md ${
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
                        {isCanceled ? "MATCH ANNULÉ" : isForfeit ? "VICTOIRE FORFAIT" : (isFinished ? "📊 VOIR LES STATS" : (canLaunchThisMatch ? (isOngoing ? "▶️ REPRENDRE" : "🚀 LANCER MATCH") : (canSpectateLive ? "🔴 SUIVRE LE DIRECT" : "SCORE DIRECT")))}
                    </button>
                    
                    {(canEdit && !isCanceled && !isForfeit) && (
                      <div className="flex gap-1.5 shrink-0">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingScoreId(m.id); 
                            setTempScoreA(sA || 0); 
                            setTempScoreB(sB || 0); 
                          }} 
                          className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center text-sm cursor-pointer hover:bg-secondary hover:text-white transition-colors shadow-sm" 
                        >
                          ✏️
                        </button>
                        
                        {!isFinished && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, true); }} className="w-10 h-10 rounded-lg bg-app-input border border-muted-line text-white flex items-center justify-center text-sm cursor-pointer hover:bg-secondary hover:border-secondary transition-colors shadow-sm">👤</button>
                            <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', true); }} className="w-10 h-10 rounded-lg bg-white/5 border border-muted-line text-white flex items-center justify-center text-sm cursor-pointer hover:bg-muted-dark transition-colors shadow-sm">❌</button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMatchException(m.id, 'forfeit', true); }} className="w-10 h-10 rounded-lg bg-danger/20 border border-danger/30 text-danger flex items-center justify-center text-sm cursor-pointer hover:bg-danger hover:text-white transition-colors shadow-sm">🏳️</button>
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
          <div className="flex gap-3">
            <button 
              onClick={syncBracket}
              className="bg-action/10 border border-action/30 text-action px-4 py-2.5 rounded-lg text-xs font-black tracking-widest cursor-pointer hover:bg-action hover:text-white transition-all shadow-sm shrink-0"
              title="Force l'avancement des équipes coincées"
            >
              🔄 SYNC ARBRE
            </button>
            <button 
              onClick={() => { /* ... ton code existant de reset ... */ }} 
              className="bg-danger/10 border border-danger/30 text-danger px-4 py-2.5 rounded-lg text-xs font-black tracking-widest cursor-pointer hover:bg-danger hover:text-white transition-all shadow-sm shrink-0"
            >
              RESET TABLEAU ⚠️
            </button>
          </div>
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
      
      {playoffMatches.length === 0 ? (
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
        <div className={`flex gap-8 overflow-x-auto py-8 px-4 min-h-[600px] custom-scrollbar ${columns.length <= 3 ? 'justify-center' : 'justify-start'}`}>
            {columns.map((col) => (
                <div key={col.id} className={`flex flex-col p-6 rounded-3xl shrink-0 border relative overflow-hidden ${col.isCenter ? 'min-w-[360px] bg-app-panel/90 backdrop-blur-md border-secondary/30 shadow-[0_0_40px_rgba(249,115,22,0.15)] z-10' : 'min-w-[320px] bg-app-panel/60 backdrop-blur-sm border-muted-line shadow-xl flex-1'}`}>
                    {col.isCenter && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-warning via-secondary to-danger"></div>}
                    <h3 className={`text-center m-0 mb-8 pb-4 border-b ${col.isCenter ? 'text-secondary border-secondary/30 text-2xl font-black uppercase tracking-widest drop-shadow-md' : 'text-muted-light border-muted-line text-lg font-black tracking-widest uppercase'}`}>
                        {col.title}
                    </h3>
                    <div className="flex flex-col justify-around gap-8 flex-1 w-full relative z-10">
                        {col.matches.map(m => renderMatch(m))}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}