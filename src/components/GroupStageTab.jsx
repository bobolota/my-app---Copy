// DEBUT DE LA MODIFICATION - src/components/GroupStageTab.jsx

import React from 'react';
import toast from 'react-hot-toast';

export default function GroupStageTab({
  tourney, canEdit, savedGroupIds, generateMatches, currentUserName,
  handleLaunchMatch, handleAssignOtm, handleMatchException,
  // Toutes les variables et fonctions dont ton onglet a besoin :
  teamName, setTeamName, addTeam, teamSearchQuery, setTeamSearchQuery,
  globalTeams, handleDirectImport, teamPage, setTeamPage, teamsPerPage,
  setEditId, deleteTeam, groupCount, setGroupCount, update, getGroupStandings, getGroupLimit
}) {
  
  // NOUVEAU : On utilise un return classique !
  return (
        <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: '30px', alignItems: 'flex-start' }}>
          
          {/* COLONNE GAUCHE : CONFIGURATION (1 & 2) - ÉLARGIE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* 1. ÉQUIPES ET LICENCES */}
            <div className="tm-panel glass-effect" style={{ padding: '20px', margin: 0 }}>
              <h3 style={{ fontSize: '1.1rem', marginTop: 0, marginBottom: '15px' }}>1. Équipes et Licences</h3>
              {canEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input className="tm-input" style={{ flex: 1 }} placeholder="Nom manuel..." value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                    <button onClick={addTeam} className="tm-btn-success">AJOUTER</button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input 
                      className="tm-input" 
                      placeholder="🔍 Chercher équipe réseau..." 
                      value={teamSearchQuery} 
                      onChange={(e) => setTeamSearchQuery(e.target.value)} 
                      style={{ width: '100%', boxSizing: 'border-box' }} 
                    />
                    {teamSearchQuery.length >= 2 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid var(--accent-blue)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                        {globalTeams.filter(t => t.name.toLowerCase().includes(teamSearchQuery.toLowerCase())).map(gt => (
                          <div key={gt.id} onClick={() => handleDirectImport(gt)} style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #333', fontSize: '0.9rem', color: 'white' }} onMouseOver={e => e.target.style.background = 'var(--accent-blue)'} onMouseOut={e => e.target.style.background = 'transparent'}>
                            🏀 {gt.name} <span style={{ color: '#aaa', fontSize: '0.75rem' }}>({gt.city || '...'})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* GRILLE D'ÉQUIPES LIMITÉE À 6 (AVEC PAGINATION) */}
              <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', minHeight: '160px' }}>
                  {(tourney.teams || [])
                    .slice(teamPage * teamsPerPage, (teamPage + 1) * teamsPerPage)
                    .map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => setEditId(t.id)} 
                      className="tm-card" 
                      style={{ position: 'relative', margin: 0, padding: '10px 12px', cursor: 'pointer', border: '1px solid #333', minHeight: 'auto', transition: '0.2s' }}
                      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                      onMouseOut={e => e.currentTarget.style.borderColor = '#333'}
                    >
                      {t.global_id && <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-blue)', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.6rem' }}>🌐</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '85%' }}>
                          <b style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</b>
                          <span style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '2px' }}>
                             {t.players.filter(p => p.licenseStatus === 'validated').length}/{t.players.length} OK
                          </span>
                        </div>
                        {canEdit && (
                          <button onClick={(e) => { e.stopPropagation(); deleteTeam(t.id); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem', padding: '0 0 0 8px' }}>✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOUTONS DE PAGINATION */}
                {tourney.teams?.length > teamsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '15px', padding: '5px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <button disabled={teamPage === 0} onClick={() => setTeamPage(p => p - 1)} style={{ background: 'none', border: '1px solid #444', color: teamPage === 0 ? '#444' : 'white', cursor: teamPage === 0 ? 'default' : 'pointer', borderRadius: '4px', padding: '2px 8px' }}>◀</button>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>Page {teamPage + 1} / {Math.ceil(tourney.teams.length / teamsPerPage)}</span>
                    <button disabled={(teamPage + 1) * teamsPerPage >= tourney.teams?.length} onClick={() => setTeamPage(p => p + 1)} style={{ background: 'none', border: '1px solid #444', color: (teamPage + 1) * teamsPerPage >= tourney.teams?.length ? '#444' : 'white', cursor: (teamPage + 1) * teamsPerPage >= tourney.teams?.length ? 'default' : 'pointer', borderRadius: '4px', padding: '2px 8px' }}>▶</button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. PLANNING & GROUPES */}
            <div className="tm-panel glass-effect" style={{ padding: '20px', margin: 0, borderLeft: '4px solid var(--accent-purple)' }}>
              <h3 style={{ fontSize: '1.1rem', marginTop: 0, marginBottom: '15px' }}>2. Planning & Groupes</h3>
              {canEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ fontSize: '0.9rem' }}>Nombre de poules :</label>
                      <input type="number" min="1" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} className="tm-input" style={{ width: '60px' }} />
                    </div>
                    {/* CORRECTION ICI : generateMatches au lieu de generateDrawAndSchedule */}
                    <button onClick={generateMatches} className="tm-btn-success tm-btn-purple" style={{ width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      🎲 GÉNÉRER LE PLANNING AUTO
                    </button>
                </div>
              )}
            </div>
          </div>

          {/* COLONNE DROITE : POULES ET PLANNING */}
          <div style={{ display: 'flex', overflowX: 'auto', gap: '25px', alignItems: 'flex-start', paddingBottom: '20px' }}>
            {savedGroupIds.map(gNum => {
                const standings = getGroupStandings(gNum);
                const limit = getGroupLimit(tourney, gNum);
                return (
                  <div key={gNum} className="tm-group-col" style={{ minWidth: '400px', flexShrink: 0 }}>
                    <div className="tm-flex-between" style={{ marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem' }}>POULE {gNum}</h4>
                      <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Qualifiés :</span>
                        <input type="number" disabled={!canEdit} value={tourney.qualifiedSettings?.[gNum] ?? 2} onChange={(e) => update({ qualifiedSettings: { ...(tourney.qualifiedSettings || {}), [gNum]: parseInt(e.target.value) || 0 } })} className="tm-mini-input" style={{ width: '45px' }} />
                      </div>
                    </div>
                    
                    <table style={{ width: '100%', fontSize: '0.8rem', marginBottom: '18px' }}>
                      <thead><tr style={{ color: '#666', fontSize: '0.7rem' }}><th align="left">NOM</th><th align="right">PTS</th><th align="right">+/-</th></tr></thead>
                      <tbody>
                        {standings.map((team, idx) => (
                          <tr key={team.id} style={{ color: idx < limit ? '#fff' : '#444' }}>
                            <td style={{ padding: '6px 0' }}>{idx + 1}. {team.name} {idx < limit && "⭐"}</td>
                            <td align="right">{team.points}</td>
                            <td align="right" style={{ color: team.diff > 0 ? 'var(--success)' : (team.diff < 0 ? 'var(--danger)' : '#666') }}>{team.diff > 0 ? `+${team.diff}` : team.diff}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                      {(tourney.schedule || []).filter(m => m.group === gNum).map(m => {
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
                        
                        const isOngoing = !isFinished && !isCanceled && !isForfeit && hasValidatedStarters;
                        const canClick = isReady || isFinished;
                        const isAssignedOtm = currentUserName && m.otm && m.otm.includes(currentUserName);
                        const canLaunchThisMatch = canEdit || isAssignedOtm;

                        return (
                          <div key={m.id} className="tm-match-row" style={{ padding: '12px', borderLeft: `4px solid ${isOngoing ? 'var(--accent-blue)' : ((isCanceled || isForfeit) ? '#666' : (canClick ? 'var(--success)' : 'var(--danger)'))}`, position: 'relative' }}>
                             {canEdit && <div style={{ position: 'absolute', top: '8px', right: '12px', color: '#666', fontSize: '1.2rem', cursor: 'grab' }} title="Glisser pour déplacer le match">⠿</div>}
                             
                             {/* RUBANS VISUELS */}
                             {isOngoing && <div className="tm-ribbon-ongoing">EN COURS</div>}
                             {isFinished && <div className="tm-ribbon-finished">TERMINÉ</div>}
                             {isCanceled && <div className="tm-ribbon-finished" style={{background: '#555'}}>ANNULÉ</div>}
                             {isForfeit && <div className="tm-ribbon-finished" style={{background: 'var(--danger)'}}>FORFAIT</div>}
                             
                             {/* NOMS DES ÉQUIPES ET SCORES */}
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '40px' }}>
                               <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><span style={{ fontSize: '0.9rem', color: isFinished ? (m.scoreA > m.scoreB ? 'var(--success)' : 'var(--danger)') : 'white' }}>{m.teamA?.name || 'Équipe A'}</span>{(isFinished || isCanceled || isForfeit) && <b>{m.scoreA}</b>}</div>
                               <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><span style={{ fontSize: '0.9rem', color: isFinished ? (m.scoreB > m.scoreA ? 'var(--success)' : 'var(--danger)') : 'white' }}>{m.teamB?.name || 'Équipe B'}</span>{(isFinished || isCanceled || isForfeit) && <b>{m.scoreB}</b>}</div>
                               {m.otm && <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>📋 OTM : <span style={{color: 'var(--accent-blue)', fontWeight: 'bold'}}>{m.otm}</span></div>}
                             </div>

                             {/* 👇 NOUVEAU : SAISIE HORAIRE ET TERRAIN 👇 */}
                             {(canEdit && !isFinished && !isCanceled && !isForfeit) && (
                               <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #333' }}>
                                 <input
                                   type="time"
                                   value={m.time || ''}
                                   onChange={(e) => {
                                     const newSchedule = tourney.schedule.map(x => x.id === m.id ? { ...x, time: e.target.value } : x);
                                     update({ schedule: newSchedule });
                                   }}
                                   style={{ flex: 1, padding: '6px', fontSize: '0.75rem', background: '#222', color: '#ccc', border: '1px solid #444', borderRadius: '4px' }}
                                 />
                                 <input
                                   type="text"
                                   placeholder="Terrain (ex: Court 1)"
                                   value={m.court || ''}
                                   onChange={(e) => {
                                     const newSchedule = tourney.schedule.map(x => x.id === m.id ? { ...x, court: e.target.value } : x);
                                     update({ schedule: newSchedule });
                                   }}
                                   style={{ flex: 2, padding: '6px', fontSize: '0.75rem', background: '#222', color: '#ccc', border: '1px solid #444', borderRadius: '4px' }}
                                 />
                               </div>
                             )}
                             {/* 👆 FIN NOUVEAU 👆 */}
                                                          
                             {/* BOUTONS D'ACTION */}
                             <div style={{ display: 'flex', gap: '10px', marginTop: '12px', height: '36px' }}>
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (!canClick && !['canceled', 'forfeit'].includes(m.status)) { 
                                    toast.error("Impossible de lancer : il manque des joueurs.");
                                    return; 
                                  }
                                   if (!['canceled', 'forfeit'].includes(m.status)) handleLaunchMatch(m.id, canLaunchThisMatch);
                                 }}
                                 className={`tm-launch-btn ${canClick ? 'ready' : 'not-ready'}`} 
                                 style={{ backgroundColor: isOngoing ? 'var(--accent-blue)' : ((isCanceled || isForfeit) ? '#333' : ''), flex: 1, margin: 0, padding: '0 10px', fontSize: '0.8rem', height: '100%' }}
                                 disabled={isCanceled || isForfeit}
                               >
                                  {isCanceled ? "ANNULÉ" : isForfeit ? "FORFAIT" : (isFinished ? "STATS" : (canLaunchThisMatch ? (isOngoing ? "REPRENDRE" : "LANCER LE MATCH") : "DIRECT"))}
                               </button>
                               
                               {(!isFinished && !isCanceled && !isForfeit && canEdit) && (
                                 <div style={{ display: 'flex', gap: '6px' }}>
                                   <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, false); }} style={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }} title="OTM">👤</button>
                                   <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', false); }} style={{ backgroundColor: '#444', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }} title="Annuler">❌</button>
                                   <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'forfeit', false); }} style={{ backgroundColor: 'var(--danger)', border: 'none', borderRadius: '6px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }} title="Forfait">🏳️</button>
                                 </div>
                               )}
                             </div>
                          </div>
                        );
                      })}

                    </div>
                  </div>
                );
            })}
          </div>
        </div>
  );
}

// FIN DE LA MODIFICATION