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
      const isReady = m.teamA?.players?.length >= 5 && m.teamB?.players?.length >= 5;
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

      // NOUVELLE LOGIQUE SPECTATEUR
      const isSpectator = !canLaunchThisMatch;
      const canSpectateLive = isOngoing && tourney.isPublicScoreboard;
      const canViewStats = isFinished;
      const disableButton = isCanceled || isForfeit || (isSpectator && !canSpectateLive && !canViewStats);

      let borderClass = 'border-l-[4px] border-l-red-500';
      if (isOngoing) borderClass = 'border-l-[4px] border-l-blue-500';
      else if (isCanceled || isForfeit) borderClass = 'border-l-[4px] border-l-[#555]';
      else if (canLaunchThisMatch || isFinished) borderClass = 'border-l-[4px] border-l-orange-500';

      return (
          <div 
            key={m.id} 
            className={`bg-[#1e1e2a] p-4 rounded-xl relative transition-all border border-white/5 shadow-lg w-full ${borderClass} ${draggedMatchId === m.id ? 'opacity-50 scale-95 border-dashed border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'opacity-100 scale-100 hover:border-white/20 hover:-translate-y-0.5'} ${canEdit ? (draggedMatchId === m.id ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing') : 'cursor-default'} ${isCanceled ? 'opacity-60' : ''}`}
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
              {canEdit && <div className="absolute top-2.5 right-3 text-[#444] text-lg hover:text-white cursor-grab transition-colors" title="Glisser pour intervertir">⠿</div>}

              {/* RUBANS VISUELS */}
              {isOngoing && <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-[#111]">EN COURS</div>}
              {isFinished && <div className="absolute -top-2 -left-2 bg-[#444] text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-[#111]">TERMINÉ</div>}
              {isCanceled && <div className="absolute -top-2 -left-2 bg-[#555] text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-[#111]">ANNULÉ</div>}
              {isForfeit && <div className="absolute -top-2 -left-2 bg-red-600 text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-[#111]">FORFAIT</div>}
              
              <div className="text-[0.65rem] text-orange-400 font-black mb-3 uppercase tracking-widest">{m.label}</div>
              
              {/* ÉQUIPE A */}
              <div className="flex justify-between items-center gap-2 mb-2 pr-6">
                  <span className={`text-sm truncate ${isFinished || isForfeit ? (m.scoreA > m.scoreB ? 'text-emerald-400 font-black' : 'text-[#666] font-bold') : 'text-white font-black'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                      {m.teamA?.name || <span className="text-[#555] italic font-normal">À déterminer...</span>}
                  </span>
                  {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-black/40 px-2.5 py-1 rounded border border-white/5">{m.scoreA}</b>}
              </div>

              {/* ÉQUIPE B */}
              <div className="flex justify-between items-center gap-2 mb-2 pr-6">
                  <span className={`text-sm truncate ${isFinished || isForfeit ? (m.scoreB > m.scoreA ? 'text-emerald-400 font-black' : 'text-[#666] font-bold') : 'text-white font-black'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                      {m.teamB?.name || <span className="text-[#555] italic font-normal">À déterminer...</span>}
                  </span>
                  {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-black/40 px-2.5 py-1 rounded border border-white/5">{m.scoreB}</b>}
              </div>
              
              {m.otm && <div className="text-[0.65rem] font-bold text-[#888] mt-2 mb-1 truncate bg-black/30 border border-white/5 inline-block px-2.5 py-1 rounded-md w-fit">📋 OTM: <span className="text-orange-400">{m.otm}</span></div>}
              
              {/* SAISIE HORAIRE */}
              {(canEdit && !isFinished && !isCanceled && !isForfeit && !m.teamA?.isBye && !m.teamB?.isBye) && (
                <div className="flex gap-2 mt-4 border-t border-white/5 pt-4">
                  <input
                    type="time"
                    value={m.time || ''}
                    onChange={(e) => {
                      const newMatches = tourney.playoffs.matches.map(x => x.id === m.id ? { ...x, time: e.target.value } : x);
                      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                    }}
                    className="flex-1 w-full p-2.5 text-xs bg-black/40 text-[#ccc] font-bold border border-white/10 rounded-lg focus:border-orange-500 outline-none transition-colors shadow-inner"
                  />
                  <input
                    type="text"
                    placeholder="Terrain..."
                    value={m.court || ''}
                    onChange={(e) => {
                      const newMatches = tourney.playoffs.matches.map(x => x.id === m.id ? { ...x, court: e.target.value } : x);
                      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                    }}
                    className="flex-[1.5] w-full p-2.5 text-xs bg-black/40 text-[#ccc] font-bold border border-white/10 rounded-lg focus:border-orange-500 outline-none transition-colors shadow-inner"
                  />
                </div>
              )}

              {/* BOUTONS ACTIONS OU BYE */}
              {(m.teamA?.isBye || m.teamB?.isBye) ? (
                  <div className="text-center text-[0.65rem] font-black tracking-widest text-[#888] mt-4 p-2 bg-black/20 rounded-lg border border-dashed border-white/10 uppercase">
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
                              ? 'text-[#666] bg-black/40 cursor-not-allowed border border-white/5 shadow-none' 
                              : 'text-white cursor-pointer hover:-translate-y-0.5 ' + (
                                  isFinished ? 'bg-[#333] hover:bg-[#444] border border-white/5 shadow-none text-[#ccc]' : 
                                  canLaunchThisMatch ? (isOngoing ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-[0_4px_10px_rgba(59,130,246,0.4)]' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-[0_4px_10px_rgba(249,115,22,0.4)]') : 
                                  'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse hover:bg-red-500 hover:text-white'
                              )
                      }`}
                      disabled={disableButton}
                    >
                        {isCanceled ? "MATCH ANNULÉ" : isForfeit ? "VICTOIRE FORFAIT" : (isFinished ? "📊 VOIR LES STATS" : (canLaunchThisMatch ? (isOngoing ? "▶️ REPRENDRE" : "🚀 LANCER MATCH") : (canSpectateLive ? "🔴 SUIVRE LE DIRECT" : "SCORE DIRECT")))}
                    </button>
                    
                    {(!isFinished && !isCanceled && !isForfeit && canEdit) && (
                      <div className="flex gap-1.5 shrink-0">
                        {/* 👇 ON PASSE 'true' POUR INDIQUER QUE C'EST UN MATCH DE PLAYOFFS 👇 */}
                        <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, true); }} className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 text-white flex items-center justify-center text-sm cursor-pointer hover:bg-orange-500 hover:border-orange-400 transition-colors shadow-sm" title="Assigner un OTM">👤</button>
                        <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', true); }} className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center text-sm cursor-pointer hover:bg-[#444] transition-colors shadow-sm" title="Annuler le match">❌</button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMatchException(m.id, 'forfeit', true); }} className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center text-sm cursor-pointer hover:bg-red-600 hover:text-white transition-colors shadow-sm" title="Déclarer Forfait">🏳️</button>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-5 mb-8 gap-5 w-full">
        <div className="text-left">
          <h2 className="m-0 text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-start gap-3">
            <span className="text-3xl drop-shadow-lg">🏆</span> 
            Phase Finale
          </h2>
          <p className="mt-2 text-[#888] font-medium text-sm text-left">
            L'arbre du tournoi. Seuls les meilleurs atteindront le sommet.
          </p>
        </div>
        
        {(tourney.playoffs && canEdit) && (
          <button 
            onClick={() => update({playoffs: null})} 
            className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-lg text-xs font-black tracking-widest cursor-pointer hover:bg-red-500 hover:text-white transition-all shadow-sm shrink-0"
          >
            RESET TABLEAU ⚠️
          </button>
        )}
      </div>
      
      {!tourney.playoffs ? (
        <div className="bg-[#15151e]/60 backdrop-blur-md border border-white/5 rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden flex flex-col items-center mt-4">
            {/* Lueur de fond douce */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="text-6xl mb-6 drop-shadow-2xl relative z-10">⏳</div>
            
            {canEdit ? (
                /* --- VUE ORGANISATEUR --- */
                <div className="relative z-10 flex flex-col items-center">
                    <p className="mb-8 text-sm sm:text-base text-[#aaa] font-medium text-center max-w-xl leading-relaxed">
                        <b className="text-orange-400 text-lg sm:text-xl font-black">{totalQualified} équipes</b> sont actuellement qualifiées d'après vos réglages de poules.
                    </p>
                    {totalQualified >= 2 ? (
                        <div className="flex flex-col items-center gap-6">
                            <span className="text-orange-400 text-xs sm:text-sm font-bold text-center bg-orange-500/10 px-5 py-3 rounded-xl border border-orange-500/20">
                                L'arbre sera généré pour <b>{bracketSize} places</b>. <br/>Les premiers de poules seront potentiellement exemptés (Bye) au 1er tour !
                            </span>
                            <button 
                              onClick={generatePlayoffs} 
                              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl text-sm sm:text-base font-black tracking-widest cursor-pointer hover:shadow-[0_6px_20px_rgba(249,115,22,0.4)] hover:-translate-y-1 transition-all mt-2"
                            >
                                🚀 GÉNÉRER {getStartRoundName(bracketSize)}
                            </button>
                        </div>
                    ) : (
                        <div className="text-red-400 text-sm font-bold bg-red-500/10 border border-red-500/20 px-5 py-3 rounded-xl">
                            ⚠️ Il faut au moins 2 équipes qualifiées pour générer l'arbre.
                        </div>
                    )}
                </div>
            ) : (
                /* --- VUE JOUEUR / SPECTATEUR --- */
                <div className="relative z-10 flex flex-col items-center">
                    <h3 className="text-xl sm:text-2xl text-white font-black mb-4 tracking-wide">En attente des qualifications</h3>
                    <p className="text-[#888] max-w-lg mx-auto leading-relaxed text-center text-sm md:text-base font-medium">
                        Le tableau de la phase finale sera généré dès que les matchs de poules seront terminés et que les positions seront figées. 
                        <br/><br/>
                        <span className="text-orange-400 font-black tracking-wide text-base sm:text-lg inline-block mt-2">
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
                  className={`flex flex-col p-6 rounded-3xl shrink-0 border relative overflow-hidden ${col.isCenter ? 'min-w-[360px] bg-[#15151e]/90 backdrop-blur-md border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.15)] z-10' : 'min-w-[320px] bg-[#15151e]/60 backdrop-blur-sm border-white/5 shadow-xl flex-1'}`}
                >
                    {/* Ruban lumineux pour la finale */}
                    {col.isCenter && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>}
                    
                    <h3 className={`text-center m-0 mb-8 pb-4 border-b ${col.isCenter ? 'text-orange-400 border-orange-500/30 text-2xl font-black uppercase tracking-widest drop-shadow-md' : 'text-[#aaa] border-white/10 text-lg font-black tracking-widest uppercase'}`}>
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