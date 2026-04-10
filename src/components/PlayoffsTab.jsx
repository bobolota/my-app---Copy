import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

export default function PlayoffsTab({
  tourney,
  canEdit,
  update,
  generatePlayoffs,
  currentUserName,
  handleLaunchMatch,
  handleAssignOtm,
  handleMatchException,
  getGroupLimit
}) {
  
  const [draggedMatchId, setDraggedMatchId] = useState(null);
  const { setConfirmData } = useAppContext();

  // ÉTATS POUR LA SAISIE MANUELLE DU SCORE
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [tempScoreA, setTempScoreA] = useState(0);
  const [tempScoreB, setTempScoreB] = useState(0);

  // NOUVEAU : ÉTAT POUR LE MODE "ÉCHANGE D'ÉQUIPES"
  const [swapSource, setSwapSource] = useState(null);

  // NOUVEAU : FONCTION POUR INTERVERTIR DEUX ÉQUIPES
  const handleSwapClick = (match, slot) => {
    if (!canEdit || match.status === 'finished') return;
    
    const team = match[slot];
    if (!team) return; // On ne peut pas échanger une case vide (TBD)

    if (!swapSource) {
      // Premier clic : On mémorise la première équipe
      setSwapSource({ matchId: match.id, slot, team });
      toast("Sélectionnez l'équipe avec laquelle échanger", { icon: "🔄", duration: 3000 });
    } else {
      // Deuxième clic
      if (swapSource.matchId === match.id && swapSource.slot === slot) {
        setSwapSource(null); // Si on reclique sur la même, on annule
        return;
      }

      // On procède à l'échange !
      const newMatches = [...tourney.playoffs.matches];
      const m1Idx = newMatches.findIndex(m => m.id === swapSource.matchId);
      const m2Idx = newMatches.findIndex(m => m.id === match.id);

      const m1 = { ...newMatches[m1Idx] };
      const m2 = { ...newMatches[m2Idx] };

      m1[swapSource.slot] = match[slot]; // On met l'équipe 2 à la place de la 1
      m2[slot] = swapSource.team;        // On met l'équipe 1 à la place de la 2

      newMatches[m1Idx] = m1;
      newMatches[m2Idx] = m2;

      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
      setSwapSource(null);
      toast.success("Affiches modifiées avec succès ! 🔀");
    }
  };

  // Fonction de sauvegarde manuelle pour les Playoffs
  const saveManualScore = (matchId) => {
    const newMatches = tourney.playoffs.matches.map(x => {
      if (x.id === matchId) {
        return {
          ...x,
          scoreA: parseInt(tempScoreA) || 0,
          scoreB: parseInt(tempScoreB) || 0,
          status: 'finished',
          startersValidated: true 
        };
      }
      return x;
    });
    
    update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
    setEditingScoreId(null);
    toast.success("Score validé manuellement ! ✅");
  };

  // --- CALCULS DE L'ARBRE ---
  const savedGroupIds = [...new Set((tourney.teams || []).map(t => t.groupId).filter(g => g !== null))].sort((a,b) => a-b);
  const totalQualified = savedGroupIds.reduce((sum, gNum) => sum + getGroupLimit(tourney, gNum), 0);

  let bracketSize = 2;
  while (bracketSize < totalQualified && bracketSize <= 1024) {
    bracketSize *= 2;
  }
  const numByes = Math.max(0, bracketSize - totalQualified);

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
  if (tourney.playoffs && tourney.playoffs.matches) {
      const maxRound = Math.max(1, ...tourney.playoffs.matches.map(m => m.round || 1));
      for (let r = 1; r <= maxRound; r++) {
          playoffRounds.push(tourney.playoffs.matches.filter(m => (m.round || 1) === r));
      }
  }

  // --- DÉCOUPAGE SYMÉTRIQUE DE L'ARBRE (GAUCHE / CENTRE / DROITE) ---
  const columns = [];
  if (playoffRounds.length > 0) {
      const maxRound = playoffRounds.length;

      // 1. BRANCHE DE GAUCHE (Tours 1 jusqu'à l'avant-dernier)
      for (let r = 0; r < maxRound - 1; r++) {
          const roundMatches = playoffRounds[r];
          const half = Math.ceil(roundMatches.length / 2);
          columns.push({
              id: `left-${r}`,
              title: getRoundTitle(roundMatches.length),
              matches: roundMatches.slice(0, half),
              isCenter: false
          });
      }

      // 2. LE CENTRE (La Finale)
      columns.push({
          id: `center`,
          title: "LA GRANDE FINALE 🏆",
          matches: playoffRounds[maxRound - 1],
          isCenter: true
      });

      // 3. BRANCHE DE DROITE (Avant-dernier tour jusqu'au Tour 1 - Ordre inversé pour le miroir)
      for (let r = maxRound - 2; r >= 0; r--) {
          const roundMatches = playoffRounds[r];
          const half = Math.ceil(roundMatches.length / 2);
          columns.push({
              id: `right-${r}`,
              title: getRoundTitle(roundMatches.length),
              matches: roundMatches.slice(half),
              isCenter: false
          });
      }
  }

  // --- LE COMPOSANT D'UN MATCH (Pour ne pas répéter le code) ---
  const renderMatch = (m) => {
      // NOUVEAU : On récupère l'équipe fraîche pour avoir les joueurs à jour
      const teamA = tourney?.teams?.find(t => t.id === m.teamA?.id) || m.teamA;
      const teamB = tourney?.teams?.find(t => t.id === m.teamB?.id) || m.teamB;

      const courtSize = parseInt(tourney?.matchsettings?.courtSize) || 5;
      // On utilise teamA et teamB au lieu de m.teamA et m.teamB
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
            className={`bg-app-card p-4 rounded-xl relative transition-all border border-muted-line shadow-lg w-full ${borderClass} ${draggedMatchId === m.id ? 'opacity-50 scale-95 border-dashed border-secondary shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'opacity-100 scale-100 hover:border-white/20 hover:-translate-y-0.5'} ${canEdit ? (draggedMatchId === m.id ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing') : 'cursor-default'} ${isCanceled ? 'opacity-60' : ''}`}
            draggable={canEdit}
            onDragStart={(e) => {
                if(!canEdit) return;
                setDraggedMatchId(m.id);
                e.dataTransfer.setData("matchId", m.id);
                e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDraggedMatchId(null)}
            onDragOver={(e) => {
                if(!canEdit) return;
                e.preventDefault();
            }}
            onDrop={(e) => {
                if(!canEdit) return;
                e.preventDefault();
                
                const sourceMatchId = e.dataTransfer.getData("matchId");
                if (!sourceMatchId || sourceMatchId === m.id) return;
                
                const newMatches = [...tourney.playoffs.matches];
                const sourceIndex = newMatches.findIndex(x => x.id === sourceMatchId);
                const targetIndex = newMatches.findIndex(x => x.id === m.id);
                
                if (sourceIndex > -1 && targetIndex > -1) {
                    const temp = newMatches[sourceIndex];
                    newMatches[sourceIndex] = newMatches[targetIndex];
                    newMatches[targetIndex] = temp;
                    update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                }
                setDraggedMatchId(null);
            }}
          >
              {canEdit && <div className="absolute top-2.5 right-3 text-muted-dark text-lg hover:text-white cursor-grab transition-colors" title="Glisser pour intervertir">⠿</div>}

              {/* RUBANS VISUELS */}
              {isOngoing && <div className="absolute -top-2 -left-2 bg-action text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">EN COURS</div>}
              {isFinished && <div className="absolute -top-2 -left-2 bg-muted-dark text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">TERMINÉ</div>}
              {isCanceled && <div className="absolute -top-2 -left-2 bg-muted-dark text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">ANNULÉ</div>}
              {isForfeit && <div className="absolute -top-2 -left-2 bg-danger-dark text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">FORFAIT</div>}
              
              <div className="text-[0.65rem] text-secondary font-black mb-3 uppercase tracking-widest">{m.label}</div>
              
              {/* NOMS DES ÉQUIPES ET SCORES */}
              {editingScoreId === m.id ? (
                <div className="flex flex-col gap-2 mt-3 mb-2 bg-app-input p-3 rounded-xl border border-muted-line shadow-inner">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-white font-bold truncate flex-1">{m.teamA?.name || 'Équipe A'}</span>
                    <input type="number" min="0" value={tempScoreA} onChange={e => setTempScoreA(e.target.value)} className="w-14 p-1.5 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner transition-colors" />
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-white font-bold truncate flex-1">{m.teamB?.name || 'Équipe B'}</span>
                    <input type="number" min="0" value={tempScoreB} onChange={e => setTempScoreB(e.target.value)} className="w-14 p-1.5 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner transition-colors" />
                  </div>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-muted-line">
                    <button onClick={(e) => { e.stopPropagation(); setEditingScoreId(null); }} className="flex-1 text-[0.65rem] font-bold text-muted hover:text-white py-1.5 transition-colors uppercase tracking-widest cursor-pointer">Annuler</button>
                    <button onClick={(e) => { e.stopPropagation(); saveManualScore(m.id); }} className="flex-1 text-[0.65rem] font-black bg-secondary/20 text-secondary hover:bg-secondary hover:text-white rounded py-1.5 transition-all shadow-md uppercase tracking-widest cursor-pointer border border-secondary/30">Valider</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* ÉQUIPE A */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); handleSwapClick(m, 'teamA'); }}
                    className={`flex justify-between items-center gap-2 mb-2 pr-6 py-1 px-2 -mx-2 rounded-lg transition-all ${canEdit && m.teamA && !isFinished ? 'cursor-pointer hover:bg-secondary/20' : ''} ${swapSource?.matchId === m.id && swapSource?.slot === 'teamA' ? 'bg-secondary text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : ''}`}
                    title={canEdit && m.teamA && !isFinished ? 'Cliquez pour intervertir' : undefined}
                  >
                      <span className={`text-sm truncate ${isFinished || isForfeit ? (m.scoreA > m.scoreB ? 'text-primary font-black' : 'text-muted-dark font-bold') : 'text-white font-black'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                          {m.teamA?.name || <span className="text-muted italic font-normal">À déterminer...</span>}
                      </span>
                      {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-app-input px-2.5 py-1 rounded border border-muted-line">{m.scoreA}</b>}
                  </div>

                  {/* ÉQUIPE B */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); handleSwapClick(m, 'teamB'); }}
                    className={`flex justify-between items-center gap-2 mb-2 pr-6 py-1 px-2 -mx-2 rounded-lg transition-all ${canEdit && m.teamB && !isFinished ? 'cursor-pointer hover:bg-secondary/20' : ''} ${swapSource?.matchId === m.id && swapSource?.slot === 'teamB' ? 'bg-secondary text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : ''}`}
                    title={canEdit && m.teamB && !isFinished ? 'Cliquez pour intervertir' : undefined}
                  >
                      <span className={`text-sm truncate ${isFinished || isForfeit ? (m.scoreB > m.scoreA ? 'text-primary font-black' : 'text-muted-dark font-bold') : 'text-white font-black'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                          {m.teamB?.name || <span className="text-muted italic font-normal">À déterminer...</span>}
                      </span>
                      {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-app-input px-2.5 py-1 rounded border border-muted-line">{m.scoreB}</b>}
                  </div>
                </>
              )}
              
              {m.otm && <div className="text-[0.65rem] font-bold text-muted mt-2 mb-1 truncate bg-black/30 border border-muted-line inline-block px-2.5 py-1 rounded-md w-fit">📋 OTM: <span className="text-secondary">{m.otm}</span></div>}
              
              {/* SAISIE HORAIRE ET TERRAIN */}
                          {(canEdit && !isFinished && !isCanceled && !isForfeit) && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-muted-line" onClick={(e) => e.stopPropagation()}>
                              
                              {/* SÉLECTEUR DE DATE ET HEURE (SÉPARÉS) */}
                              <div className="flex gap-2 flex-[3]">
                                <input
                                  type="date"
                                  value={m.datetime ? m.datetime.split('T')[0] : ''}
                                  onChange={(e) => {
                                    const d = e.target.value;
                                    const t = m.datetime ? (m.datetime.split('T')[1] || '00:00') : '00:00';
                                    const newMatches = tourney.playoffs.matches.map(x => 
                                      x.id === m.id ? { ...x, datetime: d ? `${d}T${t}` : '' } : x
                                    );
                                    update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                                  }}
                                  className="w-full p-2.5 text-[10px] sm:text-xs bg-app-input text-secondary font-black tracking-widest border border-muted-line rounded-lg focus:border-secondary outline-none transition-colors shadow-inner cursor-pointer"
                                  title="Date du match"
                                />
                                <input
                                  type="time"
                                  value={m.datetime && m.datetime.includes('T') ? m.datetime.split('T')[1].substring(0, 5) : ''}
                                  onChange={(e) => {
                                    const t = e.target.value;
                                    const d = m.datetime ? m.datetime.split('T')[0] : new Date().toISOString().split('T')[0];
                                    const newMatches = tourney.playoffs.matches.map(x => 
                                      x.id === m.id ? { ...x, datetime: `${d}T${t}` } : x
                                    );
                                    update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                                  }}
                                  className="w-full p-2.5 text-[10px] sm:text-xs bg-app-input text-white font-black tracking-widest border border-muted-line rounded-lg focus:border-secondary outline-none transition-colors shadow-inner cursor-pointer"
                                  title="Heure du match"
                                />
                              </div>
                              
                              {/* SÉLECTEUR DE TERRAIN */}
                              <input
                                type="text"
                                placeholder="Court 1..."
                                value={m.court || ''}
                                onChange={(e) => {
                                  const newMatches = tourney.playoffs.matches.map(x => 
                                    x.id === m.id ? { ...x, court: e.target.value } : x
                                  );
                                  update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                                }}
                                className="flex-[2] p-2.5 text-xs bg-app-input text-white font-bold border border-muted-line rounded-lg focus:border-action outline-none transition-colors shadow-inner min-w-[70px]"
                              />
                            </div>
                          )}

                          {/* AFFICHAGE DE LA DATE (Pour l'organisateur après saisie, ou en lecture seule) */}
                          {(!canEdit || isFinished || isCanceled || isForfeit) && m.datetime && (
                             <div className="mt-3 bg-secondary/10 border border-secondary/20 px-3 py-2 rounded-lg flex items-center justify-center gap-2">
                               <span className="text-xs">📅</span>
                               <span className="text-secondary text-[10px] font-black uppercase tracking-widest">
                                 {new Date(m.datetime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(':', 'H')}
                               </span>
                             </div>
                          )}

              {/* BOUTONS ACTIONS OU BYE */}
              {(m.teamA?.isBye || m.teamB?.isBye) ? (
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
                        {/* BOUTON CRAYON : Toujours visible ! */}
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingScoreId(m.id); 
                            setTempScoreA(m.scoreA || 0); 
                            setTempScoreB(m.scoreB || 0); 
                          }} 
                          className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center text-sm cursor-pointer hover:bg-secondary hover:text-white transition-colors shadow-sm" 
                          title="Saisie / Modification manuelle du score"
                        >
                          ✏️
                        </button>
                        
                        {/* AUTRES BOUTONS : Cachés si le match est terminé */}
                        {!isFinished && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, true); }} className="w-10 h-10 rounded-lg bg-app-input border border-muted-line text-white flex items-center justify-center text-sm cursor-pointer hover:bg-secondary hover:border-secondary transition-colors shadow-sm" title="Assigner un OTM">👤</button>
                            <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', true); }} className="w-10 h-10 rounded-lg bg-white/5 border border-muted-line text-white flex items-center justify-center text-sm cursor-pointer hover:bg-muted-dark transition-colors shadow-sm" title="Annuler le match">❌</button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMatchException(m.id, 'forfeit', true); }} className="w-10 h-10 rounded-lg bg-danger/20 border border-danger/30 text-danger flex items-center justify-center text-sm cursor-pointer hover:bg-danger hover:text-white transition-colors shadow-sm" title="Déclarer Forfait">🏳️</button>
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
      
      {/* EN-TÊTE PREMIUM */}
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
        
        {(tourney.playoffs && canEdit) && (
          <button 
            onClick={() => update({playoffs: null})} 
            className="bg-danger/10 border border-danger/30 text-danger px-4 py-2.5 rounded-lg text-xs font-black tracking-widest cursor-pointer hover:bg-danger hover:text-white transition-all shadow-sm shrink-0"
          >
            RESET TABLEAU ⚠️
          </button>
        )}
      </div>

      {/* BANNIÈRE MODE ÉCHANGE */}
      {swapSource && (
        <div className="bg-secondary/20 border border-secondary/50 text-secondary p-4 rounded-xl mb-6 flex justify-between items-center shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <strong className="block text-sm uppercase tracking-widest">Mode Modification des affiches</strong>
              <span className="text-xs text-muted-light">Cliquez sur une autre équipe pour l'échanger avec <b className="text-white">{swapSource.team.name}</b>.</span>
            </div>
          </div>
          <button 
            onClick={() => setSwapSource(null)} 
            className="bg-app-input hover:bg-app-panel text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-muted-line cursor-pointer"
          >
            ANNULER
          </button>
        </div>
      )}
      
      {!tourney.playoffs ? (
        <div className="bg-app-panel/60 backdrop-blur-md border border-muted-line rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden flex flex-col items-center mt-4">
            {/* Lueur de fond douce */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="text-6xl mb-6 drop-shadow-2xl relative z-10">⏳</div>
            
            {canEdit ? (
                /* --- VUE ORGANISATEUR --- */
                <div className="relative z-10 flex flex-col items-center">
                    <p className="mb-8 text-sm sm:text-base text-muted-light font-medium text-center max-w-xl leading-relaxed">
                        <b className="text-secondary text-lg sm:text-xl font-black">{totalQualified} équipes</b> sont actuellement qualifiées d'après vos réglages de poules.
                    </p>
                    {totalQualified >= 2 ? (
                        <div className="flex flex-col items-center gap-6">
                            <span className="text-secondary text-xs sm:text-sm font-bold text-center bg-secondary/10 px-5 py-3 rounded-xl border border-secondary/20">
                                L'arbre sera généré pour <b>{bracketSize} places</b>. <br/>Les premiers de poules seront potentiellement exemptés (Bye) au 1er tour !
                            </span>
                            <button 
                              onClick={generatePlayoffs} 
                              className="bg-gradient-to-r from-secondary to-danger text-white px-8 py-4 rounded-xl text-sm sm:text-base font-black tracking-widest cursor-pointer hover:shadow-[0_6px_20px_rgba(249,115,22,0.4)] hover:-translate-y-1 transition-all mt-2"
                            >
                                🚀 GÉNÉRER {getStartRoundName(bracketSize)}
                            </button>
                        </div>
                    ) : (
                        <div className="text-danger text-sm font-bold bg-danger/10 border border-danger/20 px-5 py-3 rounded-xl">
                            ⚠️ Il faut au moins 2 équipes qualifiées pour générer l'arbre.
                        </div>
                    )}
                </div>
            ) : (
                /* --- VUE JOUEUR / SPECTATEUR --- */
                <div className="relative z-10 flex flex-col items-center">
                    <h3 className="text-xl sm:text-2xl text-white font-black mb-4 tracking-wide">En attente des qualifications</h3>
                    <p className="text-muted max-w-lg mx-auto leading-relaxed text-center text-sm md:text-base font-medium">
                        Le tableau de la phase finale sera généré dès que les matchs de poules seront terminés et que les positions seront figées. 
                        <br/><br/>
                        <span className="text-secondary font-black tracking-wide text-base sm:text-lg inline-block mt-2">
                            Seuls les meilleurs décrocheront leur ticket pour {getStartRoundName(bracketSize)} !
                        </span>
                    </p>
                </div>
            )}
        </div>
      ) : (
        /* --- L'ARBRE SYMÉTRIQUE (BRACKET) --- */
        <div className={`flex gap-8 overflow-x-auto py-8 px-4 min-h-[600px] custom-scrollbar ${columns.length <= 3 ? 'justify-center' : 'justify-start'}`}>
            {columns.map((col) => (
                <div 
                  key={col.id} 
                  className={`flex flex-col p-6 rounded-3xl shrink-0 border relative overflow-hidden ${col.isCenter ? 'min-w-[360px] bg-app-panel/90 backdrop-blur-md border-secondary/30 shadow-[0_0_40px_rgba(249,115,22,0.15)] z-10' : 'min-w-[320px] bg-app-panel/60 backdrop-blur-sm border-muted-line shadow-xl flex-1'}`}
                >
                    {/* Ruban lumineux pour la finale */}
                    {col.isCenter && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-warning via-secondary to-danger"></div>}
                    
                    <h3 className={`text-center m-0 mb-8 pb-4 border-b ${col.isCenter ? 'text-secondary border-secondary/30 text-2xl font-black uppercase tracking-widest drop-shadow-md' : 'text-muted-light border-muted-line text-lg font-black tracking-widest uppercase'}`}>
                        {col.title}
                    </h3>
                    
                    {/* Le flex et justify-around font toute la magie visuelle de l'arbre */}
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