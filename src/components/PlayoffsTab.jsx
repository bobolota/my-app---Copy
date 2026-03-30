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
            onDragEnd={() => setDraggedMatchId(null)}
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
                transition: 'all 0.2s ease',
                width: '100%',
                boxSizing: 'border-box'
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
              
              {(canEdit && !isFinished && !isCanceled && !isForfeit && !m.teamA?.isBye && !m.teamB?.isBye) && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', borderTop: '1px dashed #333', paddingTop: '10px' }}>
                  <input
                    type="time"
                    value={m.time || ''}
                    onChange={(e) => {
                      const newMatches = tourney.playoffs.matches.map(x => x.id === m.id ? { ...x, time: e.target.value } : x);
                      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                    }}
                    style={{ flex: 1, padding: '6px', fontSize: '0.75rem', background: '#222', color: '#ccc', border: '1px solid #444', borderRadius: '4px', width: '100%' }}
                  />
                  <input
                    type="text"
                    placeholder="Terrain..."
                    value={m.court || ''}
                    onChange={(e) => {
                      const newMatches = tourney.playoffs.matches.map(x => x.id === m.id ? { ...x, court: e.target.value } : x);
                      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                    }}
                    style={{ flex: 1.5, padding: '6px', fontSize: '0.75rem', background: '#222', color: '#ccc', border: '1px solid #444', borderRadius: '4px', width: '100%' }}
                  />
                </div>
              )}

              {(m.teamA?.isBye || m.teamB?.isBye) ? (
                  <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#888', marginTop: '10px', padding: '6px', background: '#222', borderRadius: '4px', border: '1px dashed #444' }}>
                      ⏩ QUALIFICATION DIRECTE
                  </div>
              ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', height: '35px' }}>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        if (!canClick && !['canceled', 'forfeit'].includes(m.status)) { 
                        toast.error("Impossible de lancer : il manque des joueurs.");
                        return; 
                      }
                        if (!['canceled', 'forfeit'].includes(m.status)) handleLaunchMatch(m.id, canLaunchThisMatch);
                    }}
                    className={`tm-launch-btn ${canClick ? 'ready' : 'not-ready'}`} 
                    style={{ backgroundColor: isOngoing ? 'var(--accent-blue)' : ((isCanceled || isForfeit) ? '#333' : ''), flex: 1, margin: 0, padding: '0 5px', fontSize: '0.75rem', height: '100%' }}
                    disabled={isCanceled || isForfeit}
                    >
                        {isCanceled ? "MATCH ANNULÉ" : isForfeit ? "VICTOIRE FORFAIT" : (isFinished ? "VOIR LES STATS 📊" : (canLaunchThisMatch ? (isOngoing ? "REPRENDRE 🏀" : "LANCER MATCH 🏀") : "SUIVRE EN DIRECT 🔴"))}
                    </button>
                    
                    {(!isFinished && !isCanceled && !isForfeit && canEdit) && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, false); }} style={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Assigner un OTM">👤</button>
                        <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', false); }} style={{ backgroundColor: '#444', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Annuler le match">❌</button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMatchException(m.id, 'forfeit', true); }} style={{ backgroundColor: 'var(--danger)', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Forfait">🏳️</button>
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
    <div className="tm-panel glass-effect">
      <div className="tm-flex-between" style={{ marginBottom: '20px' }}>
        <h3>🏆 Phase Finale</h3>
        {(tourney.playoffs && canEdit) && <button onClick={() => update({playoffs: null})} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>RESET TABLEAU</button>}
      </div>
      
      {!tourney.playoffs ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #333', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
            
            {canEdit ? (
                /* --- VUE ORGANISATEUR (Ton code original) --- */
                <>
                    <p style={{ marginBottom: '20px', fontSize: '1.1rem' }}>
                        <b>{totalQualified} équipes</b> sont actuellement qualifiées d'après vos réglages.
                    </p>
                    {totalQualified >= 2 ? (
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: 'var(--accent-orange)' }}>
                                L'arbre sera de <b>{bracketSize} places</b>. <br/>Les 1ers de poule sauteront le premier tour !
                            </span>
                            <button onClick={generatePlayoffs} className="tm-btn-success" style={{ padding: '15px 30px', fontSize: '1.2rem', marginTop: '10px' }}>
                                🚀 GÉNÉRER {getStartRoundName(bracketSize)}
                            </button>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--danger)' }}>Il faut au moins 2 équipes qualifiées pour générer l'arbre.</div>
                    )}
                </>
            ) : (
                /* --- NOUVELLE VUE JOUEUR / SPECTATEUR --- */
                <>
                    <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '10px' }}>En attente des qualifications</h3>
                    <p style={{ color: '#888', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
                        Le tableau de la phase finale sera généré dès que les matchs de poules seront terminés et que les positions seront figées. 
                        <br/><br/>
                        <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold' }}>
                            Seuls les meilleurs décrocheront leur ticket pour {getStartRoundName(bracketSize)} !
                        </span>
                    </p>
                </>
            )}
        </div>
      ) : (
        /* --- L'ARBRE SYMÉTRIQUE --- */
        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', padding: '20px 10px', minHeight: '600px', justifyContent: columns.length <= 3 ? 'center' : 'flex-start' }}>
            {columns.map((col, idx) => (
                <div 
                  key={col.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minWidth: col.isCenter ? '320px' : '280px', 
                    flex: col.isCenter ? '0 0 auto' : '1', 
                    background: col.isCenter ? 'rgba(255, 165, 0, 0.05)' : 'rgba(255,255,255,0.02)', 
                    border: col.isCenter ? '1px solid rgba(255, 165, 0, 0.3)' : 'none',
                    borderRadius: '12px', 
                    padding: '15px',
                    boxShadow: col.isCenter ? '0 0 20px rgba(255, 165, 0, 0.1)' : 'none'
                  }}
                >
                    <h3 style={{ textAlign: 'center', color: col.isCenter ? 'var(--accent-orange)' : '#ccc', margin: '0 0 25px 0', borderBottom: `2px solid ${col.isCenter ? 'var(--accent-orange)' : '#333'}`, paddingBottom: '15px', fontSize: col.isCenter ? '1.3rem' : '1.1rem' }}>
                        {col.title}
                    </h3>
                    
                    {/* Le justify-content: space-around permet aux matchs de s'espacer verticalement 
                        pour s'aligner naturellement avec les tours suivants (l'effet Bracket !) */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '30px', flex: 1 }}>
                        {col.matches.map(m => renderMatch(m))}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}