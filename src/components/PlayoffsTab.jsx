// DEBUT DE LA MODIFICATION - NOUVEAU FICHIER : src/components/PlayoffsTab.jsx
import React, { useState } from 'react';

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
  // Le state du Drag & Drop est maintenant isolé ici !
  const [draggedMatchId, setDraggedMatchId] = useState(null);

  // --- CALCULS DE L'ARBRE (Déplacés depuis TournamentManager) ---
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

  const playoffRounds = [];
  if (tourney.playoffs && tourney.playoffs.matches) {
      const maxRound = Math.max(1, ...tourney.playoffs.matches.map(m => m.round || 1));
      for (let r = 1; r <= maxRound; r++) {
          playoffRounds.push(tourney.playoffs.matches.filter(m => (m.round || 1) === r));
      }
  }
  // --------------------------------------------------------------

  return (
    <div className="tm-panel glass-effect">
      <div className="tm-flex-between" style={{ marginBottom: '20px' }}>
        <h3>🏆 Phase Finale</h3>
        {(tourney.playoffs && canEdit) && <button onClick={() => update({playoffs: null})} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>RESET TABLEAU</button>}
      </div>
      {!tourney.playoffs ? (
        <div style={{ textAlign: 'center', padding: '40px', border: '1px dashed #333', borderRadius: '12px' }}>
            <p style={{ marginBottom: '20px', fontSize: '1.1rem' }}>
                <b>{totalQualified} équipes</b> sont actuellement qualifiées d'après vos réglages.
            </p>
            {totalQualified >= 2 ? (
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                    {numByes > 0 ? (
                        <span style={{ color: 'var(--accent-orange)' }}>
                            L'arbre sera de <b>{bracketSize} places</b>. <br/>Les <b>{numByes} meilleures équipes</b> (1ers de poule) sauteront le premier tour !
                        </span>
                    ) : (
                        <span style={{ color: 'var(--success)' }}>Le format est parfait pour un tableau symétrique !</span>
                    )}
                    {canEdit && (
                      <button onClick={generatePlayoffs} className="tm-btn-success" style={{ padding: '15px 30px', fontSize: '1.2rem', marginTop: '10px' }}>
                          🚀 GÉNÉRER {getStartRoundName(bracketSize)}
                      </button>
                    )}
                </div>
            ) : (
                <div style={{ color: 'var(--danger)' }}>Il faut au moins 2 équipes qualifiées.</div>
            )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '40px', overflowX: 'auto', padding: '20px 10px', minHeight: '500px' }}>
            {playoffRounds.map((roundMatches, rIdx) => {
                const matchCount = roundMatches.length;
                let colTitle = `TOUR ${rIdx + 1}`;
                if (matchCount === 1) colTitle = "FINALE 🏆";
                else if (matchCount === 2) colTitle = "DEMI-FINALES";
                else if (matchCount === 4) colTitle = "QUARTS DE FINALE";
                else if (matchCount === 8) colTitle = "8ÈMES DE FINALE";
                else if (matchCount === 16) colTitle = "16ÈMES DE FINALE";

                return (
                    <div key={rIdx} style={{ display: 'flex', flexDirection: 'column', minWidth: '280px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '15px' }}>
                        <h3 style={{ textAlign: 'center', color: 'var(--accent-orange)', margin: '0 0 25px 0', borderBottom: '2px solid #333', paddingBottom: '15px', fontSize: '1.1rem' }}>
                            {colTitle}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '30px', flex: 1 }}>
                            
                            {roundMatches.map(m => {
                                const isReady = m.teamA?.players?.length >= 5 && m.teamB?.players?.length >= 5;
                                const isFinished = m.status === 'finished';
                                const isCanceled = m.status === 'canceled';
                                const isForfeit = m.status === 'forfeit';
                                
                                // NOUVEAU : On vérifie si le 5 majeur a été validé (dans le cloud ou en local)
                                let hasValidatedStarters = m.startersValidated === true;
                                if (!hasValidatedStarters) {
                                    try {
                                        const localSave = localStorage.getItem(`basketMatchSave_${m.id}`);
                                        if (localSave) {
                                            hasValidatedStarters = JSON.parse(localSave).startersValidated === true;
                                        }
                                    } catch(e) {}
                                }
                                
                                // L'état en cours dépend de la validation des titulaires
                                const isOngoing = !isFinished && !isCanceled && !isForfeit && hasValidatedStarters;
                                const canClick = isReady || isFinished;
                                
                                const isAssignedOtm = currentUserName && m.otm && m.otm.includes(currentUserName);
                                const canLaunchThisMatch = canEdit || isAssignedOtm;
                                
                                return (
                                    <div 

                                      key={m.id} 
                                      className="tm-match-row"
                                      draggable={canEdit}
                                      onDragStart={(e) => {
                                          if(!canEdit) return;
                                          setDraggedMatchId(m.id);
                                          e.dataTransfer.setData("matchId", m.id);
                                          e.dataTransfer.effectAllowed = "move";
                                      }}
                                      onDragEnd={(e) => {
                                          setDraggedMatchId(null);
                                      }}
                                      onDragOver={(e) => {
                                          if(!canEdit) return;
                                          e.preventDefault();
                                          if(draggedMatchId && draggedMatchId !== m.id) {
                                              e.currentTarget.style.transform = "scale(1.02)";
                                              e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 165, 0, 0.4)";
                                          }
                                      }}
                                      onDragLeave={(e) => {
                                          if(!canEdit) return;
                                          e.currentTarget.style.transform = "";
                                          e.currentTarget.style.boxShadow = "";
                                      }}
                                      onDrop={(e) => {
                                          if(!canEdit) return;
                                          e.preventDefault();
                                          e.currentTarget.style.transform = "";
                                          e.currentTarget.style.boxShadow = "";
                                          
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
                                      style={{ 
                                          padding: '15px', 
                                          background: isFinished ? '#1a1a1a' : '#111', 
                                          borderLeft: `4px solid ${isOngoing ? 'var(--accent-blue)' : ((isCanceled || isForfeit) ? '#666' : (canClick ? 'var(--accent-orange)' : 'var(--danger)'))}`,
                                          position: 'relative',
                                          cursor: canEdit ? (draggedMatchId === m.id ? 'grabbing' : 'grab') : 'default',
                                          opacity: draggedMatchId === m.id ? 0.4 : (isCanceled ? 0.6 : 1),
                                          transition: 'all 0.2s ease'
                                      }}
                                    >
                                        {canEdit && <div style={{ position: 'absolute', top: '8px', right: '12px', color: '#666', fontSize: '1.2rem' }} title="Glisser pour intervertir">⠿</div>}

                                        {isOngoing && <div className="tm-ribbon-ongoing">EN COURS</div>}
                                        {isFinished && <div className="tm-ribbon-finished">TERMINÉ</div>}
                                        {isCanceled && <div className="tm-ribbon-finished" style={{background: '#555'}}>ANNULÉ</div>}
                                        {isForfeit && <div className="tm-ribbon-finished" style={{background: 'var(--danger)'}}>FORFAIT</div>}
                                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', fontWeight: 'bold', marginBottom: '10px' }}>{m.label}</div>
                                        
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ color: (isFinished || isForfeit) ? (m.scoreA > m.scoreB ? 'var(--success)' : 'var(--danger)') : 'white', fontWeight: (isFinished || isForfeit) && m.scoreA > m.scoreB ? 'bold' : 'normal', textDecoration: isCanceled ? 'line-through' : 'none' }}>
                                                {m.teamA?.name || <span style={{color: '#555', fontStyle: 'italic'}}>À déterminer...</span>}
                                            </span>
                                            {(isFinished || isCanceled || isForfeit) && <b>{m.scoreA}</b>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ color: (isFinished || isForfeit) ? (m.scoreB > m.scoreA ? 'var(--success)' : 'var(--danger)') : 'white', fontWeight: (isFinished || isForfeit) && m.scoreB > m.scoreA ? 'bold' : 'normal', textDecoration: isCanceled ? 'line-through' : 'none' }}>
                                                {m.teamB?.name || <span style={{color: '#555', fontStyle: 'italic'}}>À déterminer...</span>}
                                            </span>
                                            {(isFinished || isCanceled || isForfeit) && <b>{m.scoreB}</b>}
                                        </div>
                                        
                                        {m.otm && <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '10px' }}>📋 OTM : <span style={{color: 'var(--accent-orange)', fontWeight: 'bold'}}>{m.otm}</span></div>}
                                        
                                        {(m.teamA?.isBye || m.teamB?.isBye) ? (
                                            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#888', marginTop: '10px', padding: '6px', background: '#222', borderRadius: '4px', border: '1px dashed #444' }}>
                                                ⏩ QUALIFICATION DIRECTE
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', height: '35px' }}>
                                              <button onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!canClick && !['canceled', 'forfeit'].includes(m.status)) { alert(`Impossible de lancer : il manque des joueurs.`); return; }
                                                  if (!['canceled', 'forfeit'].includes(m.status)) handleLaunchMatch(m.id, canLaunchThisMatch);
                                              }}
                                              className={`tm-launch-btn ${canClick ? 'ready' : 'not-ready'}`} 
                                              style={{ 
                                                backgroundColor: isOngoing ? 'var(--accent-blue)' : ((isCanceled || isForfeit) ? '#333' : ''), 
                                                flex: 1, margin: 0, padding: '0 10px', fontSize: '0.8rem', height: '100%'
                                              }}
                                              disabled={isCanceled || isForfeit}
                                              >
                                                  {isCanceled ? "MATCH ANNULÉ" : isForfeit ? "VICTOIRE PAR FORFAIT" : (isFinished ? "VOIR LES STATS 📊" : (canLaunchThisMatch ? (isOngoing ? "REPRENDRE 🏀" : "LANCER LE MATCH 🏀") : "SUIVRE EN DIRECT 🔴"))}
                                              </button>
                                              
                                              {(!isFinished && !isCanceled && !isForfeit && canEdit) && (
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                  <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, false); }} style={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Assigner un OTM">👤</button>
                                                  <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', false); }} style={{ backgroundColor: '#444', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Annuler le match">❌</button>
                                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMatchException(m.id, 'forfeit', true); }} style={{ backgroundColor: 'var(--danger)', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s', position: 'relative' }} title="Forfait">🏳️</button>
                                                </div>
                                              )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}
// FIN DE LA MODIFICATION