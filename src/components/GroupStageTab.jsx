import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function GroupStageTab({
  tourney, canEdit, savedGroupIds, generateMatches, currentUserName,
  handleLaunchMatch, handleAssignOtm, handleMatchException,
  teamName, setTeamName, addTeam, teamSearchQuery, setTeamSearchQuery,
  globalTeams, handleDirectImport, teamPage, setTeamPage, teamsPerPage,
  setEditId, deleteTeam, groupCount, setGroupCount, update, getGroupStandings, getGroupLimit
}) {
  
  // État pour mémoriser quel match tu es en train de glisser
  const [draggedMatchId, setDraggedMatchId] = useState(null);

  // ==========================================
  // 👥 VUE JOUEUR / SPECTATEUR
  // ==========================================
  if (!canEdit) {
    const myTeam = (tourney?.teams || []).find(t =>
      t.players && t.players.some(p => p.name === currentUserName)
    );
    const myTeamName = myTeam?.name;

    return (
      <div className="py-2">
        {savedGroupIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-[#111] border border-dashed border-[#333] rounded-xl p-10 mt-10">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Phase de poules en attente</h3>
            <p className="text-[#888] text-sm text-center">Les poules n'ont pas encore été définies par les organisateurs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedGroupIds.map(gNum => {
              const standings = getGroupStandings(gNum);
              const limit = getGroupLimit(tourney, gNum);
              const groupMatches = (tourney.schedule || []).filter(m => m.group === gNum && ['finished', 'canceled', 'forfeit'].includes(m.status));

              return (
                <div key={gNum} className="bg-[#111] rounded-xl p-5 border border-[#222] flex flex-col shadow-lg">
                  
                  <h3 className="m-0 mb-4 text-[var(--accent-purple)] text-center text-lg uppercase tracking-wider font-bold">
                    🏆 POULE {gNum}
                  </h3>

                  <table className="w-full text-sm mb-5 border-collapse">
                    <thead>
                      <tr className="text-[#888] border-b border-[#333] text-left">
                        <th className="pb-2">CLASSEMENT</th>
                        <th className="pb-2 text-center">PTS</th>
                        <th className="pb-2 text-right">+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, idx) => {
                        const isMyTeam = team.name === myTeamName;
                        const isQualified = idx < limit;
                        
                        return (
                          <tr key={team.id} className={`border-b border-[#222] ${isMyTeam ? 'bg-[rgba(157,78,221,0.15)]' : 'bg-transparent'} ${isQualified ? 'text-white' : 'text-[#888]'}`}>
                            <td className={`py-3 px-1.5 ${isMyTeam ? 'border-l-4 border-[var(--accent-purple)] font-bold' : 'border-l-4 border-transparent'}`}>
                              {idx + 1}. {team.name} {isQualified && "⭐"}
                            </td>
                            <td className="text-center font-bold">{team.points}</td>
                            <td className={`text-right font-bold ${team.diff > 0 ? 'text-[var(--success)]' : (team.diff < 0 ? 'text-[var(--danger)]' : 'inherit')}`}>
                              {team.diff > 0 ? `+${team.diff}` : team.diff}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="flex-1 mt-auto">
                    <h4 className="text-[#aaa] text-xs uppercase mb-2 border-b border-dashed border-[#333] pb-1 font-bold">
                      Résultats validés
                    </h4>
                    
                    {groupMatches.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {groupMatches.map(m => (
                          <div key={m.id} className="flex justify-between items-center bg-[#1a1a1a] px-3 py-2 rounded-lg text-sm border border-[#333]">
                            <span className={`flex-1 text-right truncate ${m.scoreA > m.scoreB ? 'text-[var(--success)] font-bold' : (m.status === 'finished' ? 'text-[#888]' : 'text-white')}`}>
                              {m.teamA?.name || 'TBD'}
                            </span>
                            <b className="px-3 tracking-wider text-white">
                              {m.status === 'canceled' ? 'ANNULÉ' : `${m.scoreA || 0} - ${m.scoreB || 0}`}
                            </b>
                            <span className={`flex-1 text-left truncate ${m.scoreB > m.scoreA ? 'text-[var(--success)] font-bold' : (m.status === 'finished' ? 'text-[#888]' : 'text-white')}`}>
                              {m.teamB?.name || 'TBD'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-[#666] italic mt-4">
                        Aucun match terminé pour le moment.
                      </p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 🛠️ VUE ORGANISATEUR (Avec Drag & Drop !)
  // ==========================================
  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start w-full">
      
      {/* COLONNE GAUCHE : CONFIGURATION (1 & 2) */}
      <div className="flex flex-col gap-6 w-full xl:w-[480px] shrink-0">
        
        {/* 1. ÉQUIPES ET LICENCES */}
        <div className="bg-[#111] p-5 rounded-xl border border-[#333] shadow-lg">
          <h3 className="text-lg mt-0 mb-4 font-bold text-white">1. Équipes et Licences</h3>
          {canEdit && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input className="flex-1 p-2.5 rounded-lg bg-[#222] border border-[#444] text-white focus:outline-none focus:border-[var(--accent-blue)] transition-colors text-sm" placeholder="Nom manuel..." value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                <button onClick={addTeam} className="bg-[var(--success)] text-white px-4 py-2.5 rounded-lg font-bold cursor-pointer hover:bg-green-600 transition-colors shadow-md text-sm">AJOUTER</button>
              </div>

              <div className="relative">
                <input 
                  className="w-full p-2.5 rounded-lg bg-[#222] border border-[#444] text-white focus:outline-none focus:border-[var(--accent-blue)] transition-colors text-sm" 
                  placeholder="🔍 Chercher équipe réseau..." 
                  value={teamSearchQuery} 
                  onChange={(e) => setTeamSearchQuery(e.target.value)} 
                />
                {teamSearchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[var(--accent-blue)] z-50 max-h-[200px] overflow-y-auto shadow-2xl rounded-md custom-scrollbar">
                    {globalTeams.filter(t => t.name.toLowerCase().includes(teamSearchQuery.toLowerCase())).map(gt => (
                      <div 
                        key={gt.id} 
                        onClick={() => handleDirectImport(gt)} 
                        className="p-3 cursor-pointer border-b border-[#333] text-sm text-white hover:bg-[var(--accent-blue)] transition-colors"
                      >
                        🏀 {gt.name} <span className="text-[#aaa] text-xs">({gt.city || '...'})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* GRILLE D'ÉQUIPES LIMITÉE À 6 (AVEC PAGINATION) */}
          <div className="mt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[160px]">
              {(tourney.teams || [])
                .slice(teamPage * teamsPerPage, (teamPage + 1) * teamsPerPage)
                .map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setEditId(t.id)} 
                  className="relative p-3 cursor-pointer border border-[#333] bg-[#1a1a1a] rounded-lg transition-colors hover:border-[var(--accent-blue)] hover:bg-[#222] group shadow-sm"
                >
                  {t.global_id && <div className="absolute -top-2 -right-2 bg-[var(--accent-blue)] rounded-full w-5 h-5 flex justify-center items-center text-[0.6rem] shadow-sm">🌐</div>}
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col max-w-[85%]">
                      <b className="text-sm text-white truncate">{t.name}</b>
                      <span className="text-xs text-[#888] mt-0.5">
                          {t.players.filter(p => p.licenseStatus === 'validated').length}/{t.players.length} OK
                      </span>
                    </div>
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); deleteTeam(t.id); }} className="bg-transparent border-none text-[#555] cursor-pointer text-lg opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition-all">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* BOUTONS DE PAGINATION */}
            {tourney.teams?.length > teamsPerPage && (
              <div className="flex justify-center items-center gap-4 mt-5 p-2 bg-[#1a1a1a] rounded-lg border border-[#333]">
                <button disabled={teamPage === 0} onClick={() => setTeamPage(p => p - 1)} className={`bg-transparent border-none rounded px-3 py-1 ${teamPage === 0 ? 'text-[#444] cursor-default' : 'text-white cursor-pointer hover:bg-[#333] transition-colors'}`}>◀</button>
                <span className="text-xs text-[#888] font-bold tracking-wider">PAGE {teamPage + 1} / {Math.ceil(tourney.teams.length / teamsPerPage)}</span>
                <button disabled={(teamPage + 1) * teamsPerPage >= tourney.teams?.length} onClick={() => setTeamPage(p => p + 1)} className={`bg-transparent border-none rounded px-3 py-1 ${(teamPage + 1) * teamsPerPage >= tourney.teams?.length ? 'text-[#444] cursor-default' : 'text-white cursor-pointer hover:bg-[#333] transition-colors'}`}>▶</button>
              </div>
            )}
          </div>
        </div>

        {/* 2. PLANNING & GROUPES */}
        <div className="bg-[#111] p-5 border border-[#333] border-l-4 border-l-[var(--accent-purple)] rounded-xl shadow-lg">
          <h3 className="text-lg mt-0 mb-4 font-bold text-white">2. Planning & Groupes</h3>
          {canEdit && (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400 font-bold">Nombre de poules :</label>
                  <input type="number" min="1" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} className="w-20 p-2.5 rounded-lg bg-[#222] border border-[#444] text-white text-center focus:outline-none focus:border-[var(--accent-purple)] transition-colors" />
                </div>
                <button onClick={generateMatches} className="w-full p-3.5 bg-[var(--accent-purple)] hover:bg-purple-600 text-white font-bold tracking-widest rounded-lg text-sm transition-colors shadow-lg cursor-pointer">
                  🎲 GÉNÉRER LE PLANNING AUTO
                </button>
            </div>
          )}
        </div>
      </div>

      {/* COLONNE DROITE : POULES ET PLANNING */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 items-start pb-5 w-full">
        {savedGroupIds.map(gNum => {
            const standings = getGroupStandings(gNum);
            const limit = getGroupLimit(tourney, gNum);
            return (
              <div key={gNum} className="bg-[#111] p-4 rounded-xl border border-[#222] shadow-lg min-w-0">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="m-0 text-lg font-bold text-[var(--accent-purple)] tracking-wider">POULE {gNum}</h4>
                  <div className="text-xs flex items-center gap-2 text-[#888] font-bold bg-[#1a1a1a] px-2 py-1.5 rounded-lg border border-[#333]">
                    <span>QUALIFIÉS :</span>
                    <input type="number" disabled={!canEdit} value={tourney.qualifiedSettings?.[gNum] ?? 2} onChange={(e) => update({ qualifiedSettings: { ...(tourney.qualifiedSettings || {}), [gNum]: parseInt(e.target.value) || 0 } })} className="w-10 p-1 text-center bg-[#222] border border-[#444] text-white rounded focus:outline-none focus:border-[var(--accent-purple)] disabled:opacity-50" />
                  </div>
                </div>
                
                <table className="w-full text-xs mb-5 border-collapse">
                  <thead><tr className="text-[#666] border-b border-[#333]"><th className="text-left pb-2">NOM</th><th className="text-right pb-2">PTS</th><th className="text-right pb-2">+/-</th></tr></thead>
                  <tbody>
                    {standings.map((team, idx) => (
                      <tr key={team.id} className={`border-b border-[#222] ${idx < limit ? 'text-white' : 'text-[#666]'}`}>
                        <td className="py-2.5 truncate max-w-[120px]">{idx + 1}. {team.name} {idx < limit && "⭐"}</td>
                        <td className="text-right font-bold">{team.points}</td>
                        <td className={`text-right font-bold ${team.diff > 0 ? 'text-[var(--success)]' : (team.diff < 0 ? 'text-[var(--danger)]' : 'text-[#666]')}`}>{team.diff > 0 ? `+${team.diff}` : team.diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex flex-col gap-3">
                  {(tourney.schedule || []).filter(m => m.group === gNum).map(m => {
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

                    // Classe des bordures pour chaque état de match
                    let borderClass = 'border-l-[4px] border-l-[var(--danger)]'; // Défaut (pas prêt)
                    if (isOngoing) borderClass = 'border-l-[4px] border-l-[var(--accent-blue)]';
                    else if (isCanceled || isForfeit) borderClass = 'border-l-[4px] border-l-[#666]';
                    else if (canClick) borderClass = 'border-l-[4px] border-l-[var(--success)]';

                    return (
                      <div 
                        key={m.id} 
                        className={`bg-[#1a1a1a] p-3 rounded-lg relative transition-all border border-[#333] shadow-sm ${borderClass} ${draggedMatchId === m.id ? 'opacity-50 scale-95 border-dashed border-[#555]' : 'opacity-100 scale-100 hover:border-[#555]'} ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                        
                        // LOGIQUE DE GLISSER-DÉPOSER
                        draggable={canEdit}
                        onDragStart={() => setDraggedMatchId(m.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!draggedMatchId || draggedMatchId === m.id) return;
                          
                          const newSchedule = [...tourney.schedule];
                          const draggedIdx = newSchedule.findIndex(x => x.id === draggedMatchId);
                          const targetIdx = newSchedule.findIndex(x => x.id === m.id);
                          
                          const [draggedItem] = newSchedule.splice(draggedIdx, 1);
                          newSchedule.splice(targetIdx, 0, draggedItem);
                          
                          update({ schedule: newSchedule });
                          setDraggedMatchId(null);
                        }}
                      >
                          {canEdit && <div className="absolute top-2 right-2 text-[#444] text-lg hover:text-white cursor-grab transition-colors" title="Glisser pour déplacer le match">⠿</div>}
                          
                          {/* RUBANS VISUELS */}
                          {isOngoing && <div className="absolute -top-2 -left-2 bg-[var(--accent-blue)] text-white text-[0.6rem] font-black tracking-widest px-2 py-0.5 rounded shadow-sm z-10 border border-[#111]">EN COURS</div>}
                          {isFinished && <div className="absolute -top-2 -left-2 bg-[#444] text-white text-[0.6rem] font-black tracking-widest px-2 py-0.5 rounded shadow-sm z-10 border border-[#111]">TERMINÉ</div>}
                          {isCanceled && <div className="absolute -top-2 -left-2 bg-[#555] text-white text-[0.6rem] font-black tracking-widest px-2 py-0.5 rounded shadow-sm z-10 border border-[#111]">ANNULÉ</div>}
                          {isForfeit && <div className="absolute -top-2 -left-2 bg-[var(--danger)] text-white text-[0.6rem] font-black tracking-widest px-2 py-0.5 rounded shadow-sm z-10 border border-[#111]">FORFAIT</div>}
                          
                          {/* NOMS DES ÉQUIPES ET SCORES */}
                          <div className="flex flex-col gap-1.5 pr-8 mt-2">
                            <div className="flex justify-between items-center">
                                <span className={`text-sm truncate ${isFinished ? (m.scoreA > m.scoreB ? 'text-[var(--success)] font-bold' : 'text-gray-400') : 'text-white font-bold'}`}>{m.teamA?.name || 'Équipe A'}</span>
                                {(isFinished || isCanceled || isForfeit) && <b className="text-white text-sm ml-2 bg-[#222] px-2 py-0.5 rounded">{m.scoreA}</b>}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`text-sm truncate ${isFinished ? (m.scoreB > m.scoreA ? 'text-[var(--success)] font-bold' : 'text-gray-400') : 'text-white font-bold'}`}>{m.teamB?.name || 'Équipe B'}</span>
                                {(isFinished || isCanceled || isForfeit) && <b className="text-white text-sm ml-2 bg-[#222] px-2 py-0.5 rounded">{m.scoreB}</b>}
                            </div>
                            {m.otm && <div className="text-[0.65rem] text-[#888] mt-2 truncate bg-white/5 inline-block px-2 py-1 rounded">📋 OTM : <span className="text-[var(--accent-blue)] font-bold">{m.otm}</span></div>}
                          </div>

                          {/* SAISIE HORAIRE ET TERRAIN */}
                          {(canEdit && !isFinished && !isCanceled && !isForfeit) && (
                            <div className="flex gap-2 mt-4 pt-3 border-t border-dashed border-[#333]">
                              <input
                                type="time"
                                value={m.time || ''}
                                onChange={(e) => {
                                  const newSchedule = tourney.schedule.map(x => x.id === m.id ? { ...x, time: e.target.value } : x);
                                  update({ schedule: newSchedule });
                                }}
                                className="flex-1 p-2 text-xs bg-[#222] text-[#ccc] border border-[#444] rounded focus:border-[var(--accent-blue)] outline-none transition-colors"
                              />
                              <input
                                type="text"
                                placeholder="Court 1..."
                                value={m.court || ''}
                                onChange={(e) => {
                                  const newSchedule = tourney.schedule.map(x => x.id === m.id ? { ...x, court: e.target.value } : x);
                                  update({ schedule: newSchedule });
                                }}
                                className="flex-1 p-2 text-xs bg-[#222] text-[#ccc] border border-[#444] rounded focus:border-[var(--accent-blue)] outline-none transition-colors"
                              />
                            </div>
                          )}
                                          
                          {/* BOUTONS D'ACTION */}
                          <div className="flex gap-2 mt-4 h-9">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canClick && !['canceled', 'forfeit'].includes(m.status)) { 
                                 toast.error("Impossible de lancer : il manque des joueurs.");
                                 return; 
                               }
                                if (!['canceled', 'forfeit'].includes(m.status)) handleLaunchMatch(m.id, canLaunchThisMatch);
                              }}
                              className={`flex-1 rounded font-bold text-[0.7rem] transition-colors shadow-sm ${canClick ? 'text-white cursor-pointer' : 'text-[#888] bg-[#333] cursor-not-allowed border border-[#444]'} ${isOngoing ? 'bg-[var(--accent-blue)] hover:bg-blue-600' : ((isCanceled || isForfeit) ? 'bg-[#333] text-[#666]' : (canClick && !isFinished ? 'bg-[var(--success)] hover:bg-green-600' : ''))} ${isFinished ? 'bg-[#444] hover:bg-[#555]' : ''}`} 
                              disabled={isCanceled || isForfeit}
                            >
                               {isCanceled ? "ANNULÉ" : isForfeit ? "FORFAIT" : (isFinished ? "📊 STATS" : (canLaunchThisMatch ? (isOngoing ? "▶️ REPRENDRE" : "🚀 LANCER LE MATCH") : "🔴 DIRECT"))}
                            </button>
                            
                            {(!isFinished && !isCanceled && !isForfeit && canEdit) && (
                              <div className="flex gap-1.5">
                                <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, false); }} className="w-9 h-9 rounded bg-[#222] border border-[#444] text-white flex items-center justify-center text-sm cursor-pointer hover:bg-[var(--accent-blue)] hover:border-[var(--accent-blue)] transition-colors shadow-sm" title="Assigner OTM">👤</button>
                                <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', false); }} className="w-9 h-9 rounded bg-[#333] border-none text-white flex items-center justify-center text-sm cursor-pointer hover:bg-[#555] transition-colors shadow-sm" title="Annuler le match">❌</button>
                                <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'forfeit', false); }} className="w-9 h-9 rounded bg-[var(--danger)] border-none text-white flex items-center justify-center text-sm cursor-pointer hover:bg-red-700 transition-colors shadow-sm" title="Déclarer Forfait">🏳️</button>
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