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
      const canClick = isReady || isFinished;
      const isAssignedOtm = currentUserName && m.otm && m.otm.includes(currentUserName);
      const canLaunchThisMatch = canEdit || isAssignedOtm;

      // Définition de la bordure latérale Tailwind
      let borderColor = 'border-l-[var(--danger)]';
      if (isOngoing) borderColor = 'border-l-[var(--accent-blue)]';
      else if (isCanceled || isForfeit) borderColor = 'border-l-[#666]';
      else if (canClick) borderColor = 'border-l-[var(--accent-orange)]';

      return (
          <div 
            key={m.id} 
            className={`p-4 rounded-lg relative transition-all duration-200 border-l-4 w-full ${isFinished ? 'bg-[#1a1a1a]' : 'bg-[#111]'} ${borderColor} ${draggedMatchId === m.id ? 'opacity-40 scale-[1.02] shadow-[0_0_15px_rgba(255,165,0,0.4)]' : (isCanceled ? 'opacity-60' : 'opacity-100')} ${canEdit ? (draggedMatchId === m.id ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
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
                // Effet visuel géré dans le drag, mais Tailwind ne gère pas bien le survol de drag, on garde l'effet direct
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
            }}
          >
              {canEdit && <div className="absolute top-2 right-3 text-[#666] text-lg cursor-grab hover:text-white" title="Glisser pour intervertir">⠿</div>}

              {isOngoing && <div className="absolute -top-1 -left-1 bg-[var(--accent-blue)] text-white text-[0.55rem] font-black tracking-widest px-2 py-0.5 rounded shadow-sm z-10">EN COURS</div>}
              {isFinished && <div className="absolute -top-1 -left-1 bg-[#444] text-white text-[0.55rem] font-black tracking-widest px-2 py-0.5 rounded shadow-sm z-10">TERMINÉ</div>}
              {isCanceled && <div className="absolute -top-1 -left-1 bg-[#555] text-white text-[0.55rem] font-black tracking-widest px-2 py-0.5 rounded shadow-sm z-10">ANNULÉ</div>}
              {isForfeit && <div className="absolute -top-1 -left-1 bg-[var(--danger)] text-white text-[0.55rem] font-black tracking-widest px-2 py-0.5 rounded shadow-sm z-10">FORFAIT</div>}
              
              <div className="text-[0.7rem] text-[var(--accent-orange)] font-bold mb-2.5">{m.label}</div>
              
              {/* ÉQUIPE A */}
              <div className="flex justify-between items-center gap-2 mb-2 pr-6">
                  <span className={`text-sm truncate ${isFinished || isForfeit ? (m.scoreA > m.scoreB ? 'text-[var(--success)] font-bold' : 'text-gray-400') : 'text-white'} ${isCanceled ? 'line-through' : ''}`}>
                      {m.teamA?.name || <span className="text-[#555] italic">À déterminer...</span>}
                  </span>
                  {(isFinished || isCanceled || isForfeit) && <b className="text-white ml-2">{m.scoreA}</b>}
              </div>

              {/* ÉQUIPE B */}
              <div className="flex justify-between items-center gap-2 mb-2.5 pr-6">
                  <span className={`text-sm truncate ${isFinished || isForfeit ? (m.scoreB > m.scoreA ? 'text-[var(--success)] font-bold' : 'text-gray-400') : 'text-white'} ${isCanceled ? 'line-through' : ''}`}>
                      {m.teamB?.name || <span className="text-[#555] italic">À déterminer...</span>}
                  </span>
                  {(isFinished || isCanceled || isForfeit) && <b className="text-white ml-2">{m.scoreB}</b>}
              </div>
              
              {m.otm && <div className="text-[0.7rem] text-[#aaa] mb-2.5 truncate">📋 OTM : <span className="text-[var(--accent-orange)] font-bold">{m.otm}</span></div>}
              
              {/* SAISIE HORAIRE */}
              {(canEdit && !isFinished && !isCanceled && !isForfeit && !m.teamA?.isBye && !m.teamB?.isBye) && (
                <div className="flex gap-2 mb-2.5 border-t border-dashed border-[#333] pt-2.5">
                  <input
                    type="time"
                    value={m.time || ''}
                    onChange={(e) => {
                      const newMatches = tourney.playoffs.matches.map(x => x.id === m.id ? { ...x, time: e.target.value } : x);
                      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                    }}
                    className="flex-1 w-full p-1.5 text-xs bg-[#222] text-[#ccc] border border-[#444] rounded focus:outline-none focus:border-[var(--accent-orange)]"
                  />
                  <input
                    type="text"
                    placeholder="Terrain..."
                    value={m.court || ''}
                    onChange={(e) => {
                      const newMatches = tourney.playoffs.matches.map(x => x.id === m.id ? { ...x, court: e.target.value } : x);
                      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                    }}
                    className="flex-[1.5] w-full p-1.5 text-xs bg-[#222] text-[#ccc] border border-[#444] rounded focus:outline-none focus:border-[var(--accent-orange)]"
                  />
                </div>
              )}

              {/* BOUTONS ACTIONS OU BYE */}
              {(m.teamA?.isBye || m.teamB?.isBye) ? (
                  <div className="text-center text-[0.7rem] text-[#888] mt-2.5 p-1.5 bg-[#222] rounded border border-dashed border-[#444]">
                      ⏩ QUALIFICATION DIRECTE
                  </div>
              ) : (
                  <div className="flex gap-2 mt-2.5 h-8">
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          if (!canClick && !['canceled', 'forfeit'].includes(m.status)) { 
                          toast.error("Impossible de lancer : il manque des joueurs.");
                          return; 
                        }
                          if (!['canceled', 'forfeit'].includes(m.status)) handleLaunchMatch(m.id, canLaunchThisMatch);
                      }}
                      className={`flex-1 m-0 px-1 py-0 rounded font-bold text-[0.7rem] transition-colors ${canClick ? 'text-white cursor-pointer' : 'text-[#888] bg-[#333] cursor-not-allowed border border-[#444]'} ${isOngoing ? 'bg-[var(--accent-blue)] hover:bg-blue-600' : ((isCanceled || isForfeit) ? 'bg-[#333] text-[#666]' : (canClick && !isFinished ? 'bg-[var(--success)] hover:bg-green-600' : ''))} ${isFinished ? 'bg-[#444] hover:bg-[#555]' : ''}`} 
                      disabled={isCanceled || isForfeit}
                    >
                        {isCanceled ? "MATCH ANNULÉ" : isForfeit ? "VICTOIRE FORFAIT" : (isFinished ? "VOIR LES STATS 📊" : (canLaunchThisMatch ? (isOngoing ? "REPRENDRE 🏀" : "LANCER MATCH 🏀") : "SUIVRE EN DIRECT 🔴"))}
                    </button>
                    
                    {(!isFinished && !isCanceled && !isForfeit && canEdit) && (
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, false); }} className="w-8 h-8 rounded bg-[#222] border border-[#444] text-white flex justify-center items-center text-sm cursor-pointer hover:bg-[#333] transition-colors" title="Assigner un OTM">👤</button>
                        <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', false); }} className="w-8 h-8 rounded bg-[#444] border-none text-white flex justify-center items-center text-sm cursor-pointer hover:bg-[#555] transition-colors" title="Annuler le match">❌</button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMatchException(m.id, 'forfeit', true); }} className="w-8 h-8 rounded bg-[var(--danger)] border-none text-white flex justify-center items-center text-sm cursor-pointer hover:bg-red-700 transition-colors" title="Forfait">🏳️</button>
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
    <div className="tm-panel glass-effect border border-[#333] rounded-xl p-5 bg-[#1a1a1a]">
      <div className="flex justify-between items-center mb-5">
        <h3 className="m-0 text-xl font-bold text-white">🏆 Phase Finale</h3>
        {(tourney.playoffs && canEdit) && (
          <button 
            onClick={() => update({playoffs: null})} 
            className="bg-transparent border border-[var(--danger)] text-[var(--danger)] px-2 py-1 rounded text-xs font-bold cursor-pointer hover:bg-[var(--danger)] hover:text-white transition-colors"
          >
            RESET TABLEAU
          </button>
        )}
      </div>
      
      {!tourney.playoffs ? (
        <div className="text-center py-16 px-5 border border-dashed border-[#333] rounded-xl bg-white/5">
            <div className="text-5xl mb-5">⏳</div>
            
            {canEdit ? (
                /* --- VUE ORGANISATEUR --- */
                <>
                    <p className="mb-5 text-lg text-white">
                        <b className="text-[var(--accent-orange)]">{totalQualified} équipes</b> sont actuellement qualifiées d'après vos réglages.
                    </p>
                    {totalQualified >= 2 ? (
                        <div className="flex flex-col items-center gap-4">
                            <span className="text-[var(--accent-orange)] text-sm">
                                L'arbre sera de <b>{bracketSize} places</b>. <br/>Les 1ers de poule sauteront le premier tour !
                            </span>
                            <button 
                              onClick={generatePlayoffs} 
                              className="bg-[var(--success)] text-white px-8 py-3 rounded-lg text-lg font-black cursor-pointer hover:bg-green-600 transition-colors shadow-lg mt-2"
                            >
                                🚀 GÉNÉRER {getStartRoundName(bracketSize)}
                            </button>
                        </div>
                    ) : (
                        <div className="text-[var(--danger)] font-bold">Il faut au moins 2 équipes qualifiées pour générer l'arbre.</div>
                    )}
                </>
            ) : (
                /* --- VUE JOUEUR / SPECTATEUR --- */
                <>
                    <h3 className="text-white text-2xl mb-3">En attente des qualifications</h3>
                    <p className="text-[#888] max-w-lg mx-auto leading-relaxed">
                        Le tableau de la phase finale sera généré dès que les matchs de poules seront terminés et que les positions seront figées. 
                        <br/><br/>
                        <span className="text-[var(--accent-orange)] font-bold text-lg">
                            Seuls les meilleurs décrocheront leur ticket pour {getStartRoundName(bracketSize)} !
                        </span>
                    </p>
                </>
            )}
        </div>
      ) : (
        /* --- L'ARBRE SYMÉTRIQUE (BRACKET) --- */
        <div className={`flex gap-5 overflow-x-auto py-5 px-2 min-h-[600px] scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-[#1a1a1a] ${columns.length <= 3 ? 'justify-center' : 'justify-start'}`}>
            {columns.map((col) => (
                <div 
                  key={col.id} 
                  className={`flex flex-col p-4 rounded-xl shrink-0 ${col.isCenter ? 'min-w-[320px] bg-[rgba(255,165,0,0.05)] border border-[rgba(255,165,0,0.3)] shadow-[0_0_20px_rgba(255,165,0,0.1)]' : 'min-w-[280px] bg-white/5 flex-1'}`}
                >
                    <h3 className={`text-center m-0 mb-6 pb-4 border-b-2 ${col.isCenter ? 'text-[var(--accent-orange)] border-[var(--accent-orange)] text-xl font-black' : 'text-[#ccc] border-[#333] text-lg font-bold'}`}>
                        {col.title}
                    </h3>
                    
                    {/* Le flex et justify-around font toute la magie visuelle de l'arbre */}
                    <div className="flex flex-col justify-around gap-8 flex-1 w-full">
                        {col.matches.map(m => renderMatch(m))}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}