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
            className={`p-4 rounded-xl relative transition-all duration-200 border-l-4 w-full shadow-lg ${isFinished ? 'bg-[#1a1a1a]' : 'bg-[#111] border border-[#333]'} ${borderColor} ${draggedMatchId === m.id ? 'opacity-40 scale-[1.02] shadow-[0_0_20px_rgba(255,165,0,0.3)]' : (isCanceled ? 'opacity-60' : 'opacity-100 hover:border-r hover:border-r-[#555] hover:-translate-y-1')} ${canEdit ? (draggedMatchId === m.id ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
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
            }}
          >
              {canEdit && <div className="absolute top-2 right-2 text-[#555] text-lg cursor-grab hover:text-white transition-colors" title="Glisser pour intervertir">⠿</div>}

              {isOngoing && <div className="absolute -top-2 -left-2 bg-[var(--accent-blue)] text-white text-[0.6rem] font-black tracking-widest px-2 py-0.5 rounded shadow-md z-10 border border-[#111]">EN COURS</div>}
              {isFinished && <div className="absolute -top-2 -left-2 bg-[#444] text-white text-[0.6rem] font-black tracking-widest px-2 py-0.5 rounded shadow-md z-10 border border-[#111]">TERMINÉ</div>}
              {isCanceled && <div className="absolute -top-2 -left-2 bg-[#555] text-white text-[0.6rem] font-black tracking-widest px-2 py-0.5 rounded shadow-md z-10 border border-[#111]">ANNULÉ</div>}
              {isForfeit && <div className="absolute -top-2 -left-2 bg-[var(--danger)] text-white text-[0.6rem] font-black tracking-widest px-2 py-0.5 rounded shadow-md z-10 border border-[#111]">FORFAIT</div>}
              
              <div className="text-[0.7rem] text-[var(--accent-orange)] font-bold mb-3 uppercase tracking-wider">{m.label}</div>
              
              {/* ÉQUIPE A */}
              <div className="flex justify-between items-center gap-2 mb-2 pr-6 bg-white/5 p-1.5 rounded">
                  <span className={`text-sm truncate ${isFinished || isForfeit ? (m.scoreA > m.scoreB ? 'text-[var(--success)] font-bold' : 'text-[#888]') : 'text-white font-bold'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                      {m.teamA?.name || <span className="text-[#555] italic font-normal">À déterminer...</span>}
                  </span>
                  {(isFinished || isCanceled || isForfeit) && <b className={`ml-2 px-2 py-0.5 rounded ${isFinished ? 'bg-[#222] text-white' : 'text-[#888]'}`}>{m.scoreA}</b>}
              </div>

              {/* ÉQUIPE B */}
              <div className="flex justify-between items-center gap-2 mb-3 pr-6 bg-white/5 p-1.5 rounded">
                  <span className={`text-sm truncate ${isFinished || isForfeit ? (m.scoreB > m.scoreA ? 'text-[var(--success)] font-bold' : 'text-[#888]') : 'text-white font-bold'} ${isCanceled ? 'line-through opacity-50' : ''}`}>
                      {m.teamB?.name || <span className="text-[#555] italic font-normal">À déterminer...</span>}
                  </span>
                  {(isFinished || isCanceled || isForfeit) && <b className={`ml-2 px-2 py-0.5 rounded ${isFinished ? 'bg-[#222] text-white' : 'text-[#888]'}`}>{m.scoreB}</b>}
              </div>
              
              {m.otm && <div className="text-[0.65rem] text-[#888] mb-3 truncate bg-white/5 inline-block px-2 py-1 rounded">📋 OTM : <span className="text-[var(--accent-orange)] font-bold">{m.otm}</span></div>}
              
              {/* SAISIE HORAIRE */}
              {(canEdit && !isFinished && !isCanceled && !isForfeit && !m.teamA?.isBye && !m.teamB?.isBye) && (
                <div className="flex gap-2 mb-3 border-t border-dashed border-[#333] pt-3">
                  <input
                    type="time"
                    value={m.time || ''}
                    onChange={(e) => {
                      const newMatches = tourney.playoffs.matches.map(x => x.id === m.id ? { ...x, time: e.target.value } : x);
                      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                    }}
                    className="flex-1 w-full p-1.5 text-xs bg-[#222] text-[#ccc] border border-[#444] rounded focus:outline-none focus:border-[var(--accent-orange)] transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Terrain..."
                    value={m.court || ''}
                    onChange={(e) => {
                      const newMatches = tourney.playoffs.matches.map(x => x.id === m.id ? { ...x, court: e.target.value } : x);
                      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                    }}
                    className="flex-[1.5] w-full p-1.5 text-xs bg-[#222] text-[#ccc] border border-[#444] rounded focus:outline-none focus:border-[var(--accent-orange)] transition-colors"
                  />
                </div>
              )}

              {/* BOUTONS ACTIONS OU BYE */}
              {(m.teamA?.isBye || m.teamB?.isBye) ? (
                  <div className="text-center text-[0.7rem] font-bold tracking-widest text-[#888] mt-3 p-2 bg-[#1a1a1a] rounded-lg border border-dashed border-[#444]">
                      ⏩ QUALIFICATION DIRECTE
                  </div>
              ) : (
                  <div className="flex gap-2 mt-3 h-9">
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          if (!canClick && !['canceled', 'forfeit'].includes(m.status)) { 
                          toast.error("Impossible de lancer : il manque des joueurs.");
                          return; 
                        }
                          if (!['canceled', 'forfeit'].includes(m.status)) handleLaunchMatch(m.id, canLaunchThisMatch);
                      }}
                      className={`flex-1 m-0 px-2 py-0 rounded font-bold text-[0.7rem] transition-colors shadow-sm ${canClick ? 'text-white cursor-pointer' : 'text-[#888] bg-[#333] cursor-not-allowed border border-[#444]'} ${isOngoing ? 'bg-[var(--accent-blue)] hover:bg-blue-600' : ((isCanceled || isForfeit) ? 'bg-[#333] text-[#666]' : (canClick && !isFinished ? 'bg-[var(--success)] hover:bg-green-600' : ''))} ${isFinished ? 'bg-[#444] hover:bg-[#555]' : ''}`} 
                      disabled={isCanceled || isForfeit}
                    >
                        {isCanceled ? "MATCH ANNULÉ" : isForfeit ? "VICTOIRE FORFAIT" : (isFinished ? "📊 VOIR LES STATS" : (canLaunchThisMatch ? (isOngoing ? "▶️ REPRENDRE" : "🚀 LANCER LE MATCH") : "🔴 SUIVRE EN DIRECT"))}
                    </button>
                    
                    {(!isFinished && !isCanceled && !isForfeit && canEdit) && (
                      <div className="flex gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, false); }} className="w-9 h-9 rounded bg-[#222] border border-[#444] text-white flex justify-center items-center text-sm cursor-pointer hover:bg-[var(--accent-blue)] hover:border-[var(--accent-blue)] transition-colors shadow-sm" title="Assigner un OTM">👤</button>
                        <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', false); }} className="w-9 h-9 rounded bg-[#333] border-none text-white flex justify-center items-center text-sm cursor-pointer hover:bg-[#555] transition-colors shadow-sm" title="Annuler le match">❌</button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMatchException(m.id, 'forfeit', true); }} className="w-9 h-9 rounded bg-[var(--danger)] border-none text-white flex justify-center items-center text-sm cursor-pointer hover:bg-red-700 transition-colors shadow-sm" title="Forfait">🏳️</button>
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
    <div className="bg-[#111] border border-[#333] rounded-xl p-5 shadow-2xl mt-4">
      <div className="flex justify-between items-center mb-6 border-b border-[#222] pb-4">
        <h3 className="m-0 text-2xl font-black text-white tracking-wide">🏆 Phase Finale</h3>
        {(tourney.playoffs && canEdit) && (
          <button 
            onClick={() => update({playoffs: null})} 
            className="bg-transparent border border-[var(--danger)] text-[var(--danger)] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-[var(--danger)] hover:text-white transition-colors"
          >
            RESET TABLEAU
          </button>
        )}
      </div>
      
      {!tourney.playoffs ? (
        <div className="flex flex-col justify-center items-center py-20 px-5 border-2 border-dashed border-[#333] rounded-xl bg-white/5">
            <div className="text-6xl mb-6 drop-shadow-md">⏳</div>
            
            {canEdit ? (
                /* --- VUE ORGANISATEUR --- */
                <>
                    <p className="mb-6 text-lg text-[#ccc] text-center max-w-xl">
                        <b className="text-[var(--accent-orange)] text-xl">{totalQualified} équipes</b> sont actuellement qualifiées d'après vos réglages de poules.
                    </p>
                    {totalQualified >= 2 ? (
                        <div className="flex flex-col items-center gap-6">
                            <span className="text-[var(--accent-orange)] text-sm text-center bg-[rgba(255,165,0,0.1)] px-4 py-2 rounded-lg border border-[rgba(255,165,0,0.2)]">
                                L'arbre sera généré pour <b>{bracketSize} places</b>. <br/>Les premiers de poules seront potentiellement exemptés (Bye) au 1er tour !
                            </span>
                            <button 
                              onClick={generatePlayoffs} 
                              className="bg-[var(--success)] text-white px-8 py-4 rounded-xl text-lg font-black cursor-pointer hover:bg-green-600 hover:-translate-y-1 transition-all shadow-[0_10px_20px_rgba(46,204,113,0.3)] mt-2"
                            >
                                🚀 GÉNÉRER {getStartRoundName(bracketSize)}
                            </button>
                        </div>
                    ) : (
                        <div className="text-[var(--danger)] font-bold bg-[rgba(255,59,48,0.1)] px-4 py-2 rounded-lg">⚠️ Il faut au moins 2 équipes qualifiées pour générer l'arbre.</div>
                    )}
                </>
            ) : (
                /* --- VUE JOUEUR / SPECTATEUR --- */
                <>
                    <h3 className="text-white text-2xl mb-4 font-bold">En attente des qualifications</h3>
                    <p className="text-[#888] max-w-lg mx-auto leading-relaxed text-center text-sm md:text-base">
                        Le tableau de la phase finale sera généré dès que les matchs de poules seront terminés et que les positions seront figées. 
                        <br/><br/>
                        <span className="text-[var(--accent-orange)] font-bold text-lg inline-block mt-2">
                            Seuls les meilleurs décrocheront leur ticket pour {getStartRoundName(bracketSize)} !
                        </span>
                    </p>
                </>
            )}
        </div>
      ) : (
        /* --- L'ARBRE SYMÉTRIQUE (BRACKET) --- */
        <div className={`flex gap-8 overflow-x-auto py-8 px-4 min-h-[600px] custom-scrollbar ${columns.length <= 3 ? 'justify-center' : 'justify-start'}`}>
            {columns.map((col) => (
                <div 
                  key={col.id} 
                  className={`flex flex-col p-5 rounded-2xl shrink-0 ${col.isCenter ? 'min-w-[340px] bg-[rgba(255,165,0,0.03)] border-2 border-[rgba(255,165,0,0.2)] shadow-[0_0_30px_rgba(255,165,0,0.05)]' : 'min-w-[300px] bg-[#1a1a1a] border border-[#222] flex-1'}`}
                >
                    <h3 className={`text-center m-0 mb-8 pb-4 border-b-2 ${col.isCenter ? 'text-[var(--accent-orange)] border-[var(--accent-orange)] text-2xl font-black uppercase tracking-widest drop-shadow-md' : 'text-[#ccc] border-[#333] text-lg font-bold tracking-wider'}`}>
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