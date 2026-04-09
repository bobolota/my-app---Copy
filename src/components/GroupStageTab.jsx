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
  const [isAllerRetour, setIsAllerRetour] = useState(false);

  // FONCTION DE TRI PAR DATE/HEURE
  const sortMatchesByDate = (a, b) => {
    if (a.datetime && !b.datetime) return -1;
    if (!a.datetime && b.datetime) return 1;
    if (a.datetime && b.datetime) {
      return new Date(a.datetime) - new Date(b.datetime);
    }
    return 0; // Si aucun n'a de date, on garde l'ordre de base
  };

  // NOUVEAU : États pour la saisie manuelle du score
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [tempScoreA, setTempScoreA] = useState(0);
  const [tempScoreB, setTempScoreB] = useState(0);

  // NOUVEAU : Fonction de sauvegarde manuelle
  const saveManualScore = (matchId) => {
    const newSchedule = tourney.schedule.map(x => {
      if (x.id === matchId) {
        return {
          ...x,
          scoreA: parseInt(tempScoreA) || 0,
          scoreB: parseInt(tempScoreB) || 0,
          status: 'finished', // On force le statut à "terminé"
          startersValidated: true // On force la validation pour éviter les blocages
        };
      }
      return x;
    });
    
    update({ schedule: newSchedule });
    setEditingScoreId(null);
    toast.success("Score validé manuellement ! ✅");
  };

  // ==========================================
  // 👥 VUE JOUEUR / SPECTATEUR
  // ==========================================
  if (!canEdit) {
    const myTeam = (tourney?.teams || []).find(t =>
      t.players && t.players.some(p => p.name === currentUserName)
    );
    const myTeamName = myTeam?.name;

    return (
      <div className="py-4 w-full flex-1 flex flex-col box-border">
        {savedGroupIds.length === 0 ? (
          <div className="bg-app-panel/60 backdrop-blur-md border border-muted-line rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden flex flex-col items-center mt-4">
            <span className="text-5xl mb-4 drop-shadow-2xl">📊</span>
            <h3 className="text-xl text-white font-black mb-2 tracking-wide">Phase de poules en attente</h3>
            <p className="text-muted text-sm font-medium m-0 max-w-sm leading-relaxed">
              Les poules n'ont pas encore été définies par les organisateurs. Reviens un peu plus tard !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {savedGroupIds.map(gNum => {
              const standings = getGroupStandings(gNum);
              const limit = getGroupLimit(tourney, gNum);
              
              // NOUVEAU FILTRE : On prend les matchs terminés ET les matchs en cours
              const groupMatches = (tourney.schedule || []).filter(m => 
                m.group === gNum && 
                (['finished', 'canceled', 'forfeit'].includes(m.status) || m.startersValidated || m.liveHistory?.length > 0)
              ).sort(sortMatchesByDate);

              return (
                <div key={gNum} className="bg-app-panel/80 backdrop-blur-md rounded-2xl p-6 border border-muted-line flex flex-col shadow-2xl relative overflow-hidden group">
                  {/* Ligne LED décorative */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-danger shadow-[0_0_15px_rgba(249,115,22,0.4)] opacity-80"></div>
                  
                  <h3 className="m-0 mb-6 text-secondary text-center text-sm uppercase tracking-widest font-black flex items-center justify-center gap-2">
                    <span className="text-lg">🏆</span> POULE {gNum}
                  </h3>

                  <div className="bg-black/20 rounded-xl border border-muted-line overflow-hidden mb-6">
                    <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-muted text-xs uppercase tracking-wider font-bold border-b border-muted-line bg-app-input">
                        <th className="py-3 px-4 text-left">Classement</th>
                        <th className="py-3 px-1 text-center" title="Victoires">V</th>
                        <th className="py-3 px-1 text-center" title="Défaites">D</th>
                        <th className="py-3 px-2 text-center text-muted-light">Pts</th>
                        <th className="py-3 px-4 text-right">+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, idx) => {
                        const isMyTeam = team.name === myTeamName;
                        const isQualified = idx < limit;
                        
                        return (
                          <tr key={team.id} className={`border-b border-muted-line transition-colors ${isMyTeam ? 'bg-secondary/10' : 'hover:bg-white/5'} ${isQualified ? 'text-white' : 'text-muted'}`}>
                            <td className={`py-3 px-4 truncate max-w-[140px] ${isMyTeam ? 'border-l-4 border-secondary font-bold' : 'border-l-4 border-transparent'}`}>
                              {idx + 1}. {team.name} {isQualified && <span className="ml-1 text-[10px]" title="Qualifié">⭐</span>}
                            </td>
                            <td className="text-center font-bold text-primary/90">{team.won || 0}</td>
                            <td className="text-center font-bold text-danger/90">{team.lost || 0}</td>
                            <td className="text-center font-black text-muted-light">{team.points}</td>
                            <td className={`text-right font-bold pr-4 ${team.diff > 0 ? 'text-primary' : (team.diff < 0 ? 'text-danger' : 'inherit')}`}>
                              {team.diff > 0 ? `+${team.diff}` : team.diff}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>

                  <div className="flex-1 mt-auto">
                    <h4 className="text-muted text-xs uppercase mb-4 tracking-widest font-black flex items-center gap-2">
                      <span className="w-full h-px bg-muted-line"></span>
                      <span className="shrink-0">Matchs & Résultats</span>
                      <span className="w-full h-px bg-muted-line"></span>
                    </h4>
                    
                    {groupMatches.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {groupMatches.map(m => {
                          const isFinished = m.status === 'finished';
                          const isCanceled = m.status === 'canceled';
                          const isForfeit = m.status === 'forfeit';
                          const isOngoing = !isFinished && !isCanceled && !isForfeit && (m.startersValidated || m.liveHistory?.length > 0);
                          const isAssignedOtm = currentUserName && m.otm && m.otm.includes(currentUserName);
                          const canLaunchThisMatch = canEdit || isAssignedOtm;
                          const isSpectator = !canLaunchThisMatch;

                          const canSpectateLive = isOngoing && tourney.isPublicScoreboard;
                          const canViewStats = isFinished;
                          const disableButton = isCanceled || isForfeit || (isSpectator && !canSpectateLive && !canViewStats);

                          return (
                            <div key={m.id} className="flex flex-col bg-app-card rounded-xl border border-muted-line overflow-hidden shadow-lg hover:border-white/10 transition-colors">
                              <div className="flex justify-between items-center px-4 py-3 text-sm font-bold">
                                <span className={`flex-1 text-right truncate ${m.scoreA > m.scoreB && isFinished ? 'text-primary font-black' : (isFinished ? 'text-muted' : 'text-white')}`}>
                                  {m.teamA?.name || 'TBD'}
                                </span>
                                
                                <div className={`mx-3 px-3 py-1 rounded-md text-xs font-black tracking-wider shadow-inner ${isOngoing ? 'bg-action/20 text-action border border-action/30' : 'bg-app-input text-white border border-muted-line'}`}>
                                  {isCanceled ? 'ANNULÉ' : `${m.scoreA || 0} - ${m.scoreB || 0}`}
                                </div>
                                
                                <span className={`flex-1 text-left truncate ${m.scoreB > m.scoreA && isFinished ? 'text-primary font-black' : (isFinished ? 'text-muted' : 'text-white')}`}>
                                  {m.teamB?.name || 'TBD'}
                                </span>
                              </div>

                              {!disableButton && (
                                <button
                                  onClick={() => handleLaunchMatch(m.id, canLaunchThisMatch)}
                                  className={`w-full py-2.5 text-xs font-black tracking-widest transition-all ${canLaunchThisMatch ? (isOngoing ? 'bg-gradient-to-r from-action to-action-light text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]') : (isFinished ? 'bg-app-input text-muted-light hover:bg-muted-dark hover:text-white border-t border-muted-line' : 'bg-danger/20 text-danger border-t border-danger/30 animate-pulse hover:bg-danger hover:text-white')}`}
                                >
                                  {isFinished ? "📊 VOIR LES STATS" : (canLaunchThisMatch ? (isOngoing ? "▶️ REPRENDRE LE MATCH" : "🚀 LANCER LE MATCH") : "🔴 SUIVRE LE DIRECT")}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 opacity-50">
                        <span className="text-2xl mb-1">📭</span>
                        <p className="text-center text-xs font-bold text-muted m-0">
                          Aucun match joué pour le moment.
                        </p>
                      </div>
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
    <div className="flex flex-col xl:flex-row gap-8 items-start w-full mt-4">
      
      {/* COLONNE GAUCHE : CONFIGURATION (1 & 2) */}
      <div className="flex flex-col gap-8 w-full xl:w-[420px] shrink-0">
        
        {/* 1. ÉQUIPES ET LICENCES */}
        <div className="bg-app-panel/80 backdrop-blur-md p-6 rounded-2xl border border-muted-line shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-light"></div>
          <h3 className="text-sm tracking-widest font-black text-primary mt-0 mb-6 uppercase flex items-center gap-2">
            <span className="text-lg">1.</span> Équipes et Licences
          </h3>
          
          {canEdit && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <input 
                  className="flex-1 p-3 rounded-xl bg-app-input border border-muted-line text-white placeholder:text-muted-dark focus:outline-none focus:border-primary transition-colors text-sm shadow-inner" 
                  placeholder="Nom manuel..." 
                  value={teamName} 
                  onChange={(e) => setTeamName(e.target.value)} 
                />
                <button 
                  onClick={addTeam} 
                  className="bg-primary/20 text-primary border border-primary/30 px-5 py-3 rounded-xl font-black tracking-wider cursor-pointer hover:bg-primary hover:text-white transition-all shadow-md text-xs"
                >
                  AJOUTER
                </button>
              </div>

              <div className="relative">
                <input 
                  className="w-full p-3 rounded-xl bg-app-input border border-muted-line text-white placeholder:text-muted-dark focus:outline-none focus:border-action transition-colors text-sm shadow-inner" 
                  placeholder="🔍 Chercher une équipe réseau..." 
                  value={teamSearchQuery} 
                  onChange={(e) => setTeamSearchQuery(e.target.value)} 
                />
                {teamSearchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-app-card border border-muted-line z-50 max-h-[200px] overflow-y-auto shadow-2xl rounded-xl custom-scrollbar">
                    {globalTeams.filter(t => t.name.toLowerCase().includes(teamSearchQuery.toLowerCase())).map(gt => (
                      <div 
                        key={gt.id} 
                        onClick={() => handleDirectImport(gt)} 
                        className="p-4 cursor-pointer border-b border-muted-line text-sm text-white hover:bg-action-dark transition-colors flex items-center gap-2 font-bold"
                      >
                        <span>🏀</span> {gt.name} <span className="text-muted-light text-xs font-normal ml-auto">({gt.city || '...'})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* GRILLE D'ÉQUIPES LIMITÉE À 6 (AVEC PAGINATION) */}
          <div className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[160px]">
              {(tourney.teams || [])
                .slice(teamPage * teamsPerPage, (teamPage + 1) * teamsPerPage)
                .map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setEditId(t.id)} 
                  className="relative p-3.5 cursor-pointer border border-muted-line bg-black/20 rounded-xl transition-all hover:border-primary/50 hover:bg-black/40 group shadow-sm flex flex-col justify-center"
                >
                  {t.global_id && <div className="absolute -top-2 -right-2 bg-action rounded-full w-5 h-5 flex justify-center items-center text-[0.6rem] text-white shadow-md border border-app-bg">🌐</div>}
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col max-w-[85%]">
                      <b className="text-sm text-white truncate group-hover:text-primary-light transition-colors">{t.name}</b>
                      <span className="text-xs font-bold text-muted mt-1 bg-white/5 w-fit px-2 py-0.5 rounded">
                          {t.players.filter(p => p.licenseStatus === 'validated').length}/{t.players.length} OK
                      </span>
                    </div>
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); deleteTeam(t.id); }} className="bg-transparent border-none text-muted-dark cursor-pointer text-lg opacity-0 group-hover:opacity-100 hover:text-danger transition-all">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* BOUTONS DE PAGINATION */}
            {tourney.teams?.length > teamsPerPage && (
              <div className="flex justify-between items-center mt-6 p-1.5 bg-app-input rounded-xl border border-muted-line shadow-inner">
                <button disabled={teamPage === 0} onClick={() => setTeamPage(p => p - 1)} className={`bg-transparent border-none rounded-lg px-4 py-2 text-xs font-black ${teamPage === 0 ? 'text-muted-dark cursor-default' : 'text-white cursor-pointer hover:bg-white/10 transition-colors'}`}>◀ PRÉC</button>
                <span className="text-[10px] text-muted font-black tracking-widest bg-black/50 px-3 py-1 rounded-md border border-muted-line">PAGE {teamPage + 1} / {Math.ceil(tourney.teams.length / teamsPerPage)}</span>
                <button disabled={(teamPage + 1) * teamsPerPage >= tourney.teams?.length} onClick={() => setTeamPage(p => p + 1)} className={`bg-transparent border-none rounded-lg px-4 py-2 text-xs font-black ${(teamPage + 1) * teamsPerPage >= tourney.teams?.length ? 'text-muted-dark cursor-default' : 'text-white cursor-pointer hover:bg-white/10 transition-colors'}`}>SUIV ▶</button>
              </div>
            )}
          </div>
        </div>

        

        {/* 2. PLANNING & GROUPES */}
        <div className="bg-app-panel/80 backdrop-blur-md p-6 rounded-2xl border border-muted-line shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-danger"></div>
          <h3 className="text-sm tracking-widest font-black text-secondary mt-0 mb-6 uppercase flex items-center gap-2">
            <span className="text-lg">2.</span> Planning & Groupes
          </h3>

          {/* OPTION ALLER-RETOUR */}
        <div className="flex items-center justify-between bg-app-panel/80 border border-muted-line p-4 rounded-xl mb-4 shadow-inner">
          <div className="flex flex-col">
            <span className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
            🔄 Matchs Aller-Retour
            </span>
            <span className="text-muted-dark text-[10px] font-bold uppercase mt-1">
            Chaque équipe s'affrontera deux fois
            </span>
          </div>
  
        {/* Switch / Toggle CSS */}
        <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={isAllerRetour}
          onChange={(e) => setIsAllerRetour(e.target.checked)}
          />
        <div className="w-11 h-6 bg-app-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary border border-muted-line shadow-inner"></div>
        </label>
      </div>

          {canEdit && (
            <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between bg-app-input p-4 rounded-xl border border-muted-line shadow-inner">
                  <label className="text-xs text-muted font-black tracking-widest uppercase">Nombre de poules</label>
                  <input type="number" min="1" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} className="w-16 p-2 rounded-lg bg-app-card border border-muted-line text-white text-center font-bold focus:outline-none focus:border-secondary transition-colors shadow-inner" />
                </div>
                <button 
  onClick={() => generateMatches(isAllerRetour)} 
  className="w-full p-4 bg-gradient-to-r from-secondary to-danger text-white font-black tracking-widest rounded-xl text-xs transition-all shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.5)] hover:-translate-y-0.5 cursor-pointer"
>
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
              <div key={gNum} className="bg-app-panel/80 backdrop-blur-md p-5 rounded-2xl border border-muted-line shadow-xl min-w-0 flex flex-col">
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-muted-line">
                  <h4 className="m-0 text-base font-black text-secondary tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    POULE {gNum}
                  </h4>
                  <div className="text-[10px] flex items-center gap-2 text-muted font-black tracking-widest bg-app-input px-2 py-1.5 rounded-lg border border-muted-line">
                    <span>QUALIFIÉS:</span>
                    <input type="number" disabled={!canEdit} value={tourney.qualifiedSettings?.[gNum] ?? 2} onChange={(e) => update({ qualifiedSettings: { ...(tourney.qualifiedSettings || {}), [gNum]: parseInt(e.target.value) || 0 } })} className="w-8 p-0.5 text-center bg-transparent border-b border-muted-dark text-white font-bold focus:outline-none focus:border-secondary disabled:opacity-100 disabled:border-transparent" />
                  </div>
                </div>
                
                <table className="w-full text-xs mb-6 border-collapse">
                  <thead>
                    <tr className="text-muted-dark uppercase tracking-wider font-bold">
                      <th className="text-left pb-3 px-2">Nom</th>
                      <th className="text-center pb-3 px-1" title="Victoires">V</th>
                      <th className="text-center pb-3 px-1" title="Défaites">D</th>
                      <th className="text-center pb-3 px-1 text-muted-light">Pts</th>
                      <th className="text-right pb-3 px-2">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, idx) => (
                      <tr key={team.id} className={`border-t border-muted-line ${idx < limit ? 'text-white' : 'text-muted-dark'}`}>
                        <td className="py-3 px-2 truncate max-w-[120px] font-bold">
                          {idx + 1}. {team.name} {idx < limit && <span className="ml-1 text-[9px]" title="Qualifié">⭐</span>}
                        </td>
                        <td className="text-center font-bold text-primary/90">{team.won || 0}</td>
                        <td className="text-center font-bold text-danger/90">{team.lost || 0}</td>
                        <td className="text-center font-black text-muted-light">{team.points}</td>
                        <td className={`text-right font-bold px-2 ${team.diff > 0 ? 'text-primary' : (team.diff < 0 ? 'text-danger' : 'text-muted-dark')}`}>
                          {team.diff > 0 ? `+${team.diff}` : team.diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex flex-col gap-3 mt-auto">
                  {(tourney.schedule || []).filter(m => m.group === gNum).sort(sortMatchesByDate).map(m => {
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
                    const canClick = isReady || isFinished;
                    const isAssignedOtm = currentUserName && m.otm && m.otm.includes(currentUserName);
                    const canLaunchThisMatch = canEdit || isAssignedOtm;

                    // Classe des bordures pour chaque état de match
                    let borderClass = 'border-l-[4px] border-l-danger'; // Défaut (pas prêt)
                    if (isOngoing) borderClass = 'border-l-[4px] border-l-action';
                    else if (isCanceled || isForfeit) borderClass = 'border-l-[4px] border-l-muted-dark';
                    else if (canClick) borderClass = 'border-l-[4px] border-l-primary';

                    return (
                      <div 
                        key={m.id} 
                        className={`bg-app-card p-4 rounded-xl relative transition-all border border-muted-line shadow-lg ${borderClass} ${draggedMatchId === m.id ? 'opacity-50 scale-95 border-dashed border-secondary' : 'opacity-100 scale-100 hover:border-white/20'} ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                        
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
                          {canEdit && <div className="absolute top-2.5 right-3 text-muted-dark text-lg hover:text-white cursor-grab transition-colors" title="Glisser pour déplacer">⠿</div>}
                          
                          {/* RUBANS VISUELS */}
                          {isOngoing && <div className="absolute -top-2 -left-2 bg-action text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">EN COURS</div>}
                          {isFinished && <div className="absolute -top-2 -left-2 bg-muted-dark text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">TERMINÉ</div>}
                          {isCanceled && <div className="absolute -top-2 -left-2 bg-muted-dark text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">ANNULÉ</div>}
                          {isForfeit && <div className="absolute -top-2 -left-2 bg-danger-dark text-white text-[0.6rem] font-black tracking-widest px-2.5 py-1 rounded shadow-md z-10 border border-app-bg">FORFAIT</div>}
                          
                          {/* NOMS DES ÉQUIPES ET SCORES */}
                          {editingScoreId === m.id ? (
                            // MODE ÉDITION MANUELLE
                            <div className="flex flex-col gap-2 mt-3 bg-app-input p-3 rounded-xl border border-muted-line shadow-inner">
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
                            // AFFICHAGE NORMAL
                            <div className="flex flex-col gap-2 pr-6 mt-3">
                              <div className="flex justify-between items-center">
                                  <span className={`text-sm truncate ${isFinished ? (m.scoreA > m.scoreB ? 'text-primary font-black' : 'text-muted-dark font-bold') : 'text-white font-black'}`}>{m.teamA?.name || 'Équipe A'}</span>
                                  {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-app-input px-2.5 py-1 rounded border border-muted-line">{m.scoreA}</b>}
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className={`text-sm truncate ${isFinished ? (m.scoreB > m.scoreA ? 'text-primary font-black' : 'text-muted-dark font-bold') : 'text-white font-black'}`}>{m.teamB?.name || 'Équipe B'}</span>
                                  {(isFinished || isCanceled || isForfeit) && <b className="text-white text-xs ml-2 bg-app-input px-2.5 py-1 rounded border border-muted-line">{m.scoreB}</b>}
                              </div>
                              {m.otm && <div className="text-[0.65rem] font-bold text-muted mt-2 truncate bg-black/30 border border-muted-line inline-block px-2.5 py-1 rounded-md w-fit">📋 OTM: <span className="text-action">{m.otm}</span></div>}
                            </div>
                          )}

                          {/* SAISIE HORAIRE ET TERRAIN */}
                          {(canEdit && !isFinished && !isCanceled && !isForfeit) && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-muted-line">
                              
                              {/* SÉLECTEUR DE DATE ET HEURE (SÉPARÉS) */}
                              <div className="flex gap-2 flex-[3]">
                                <input
                                  type="date"
                                  value={m.datetime ? m.datetime.split('T')[0] : ''}
                                  onChange={(e) => {
                                    const d = e.target.value;
                                    const t = m.datetime ? (m.datetime.split('T')[1] || '00:00') : '00:00';
                                    const newSchedule = tourney.schedule.map(x => 
                                      x.id === m.id ? { ...x, datetime: d ? `${d}T${t}` : '' } : x
                                    );
                                    update({ schedule: newSchedule });
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
                                    const newSchedule = tourney.schedule.map(x => 
                                      x.id === m.id ? { ...x, datetime: `${d}T${t}` } : x
                                    );
                                    update({ schedule: newSchedule });
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
                                  const newSchedule = tourney.schedule.map(x => 
                                    x.id === m.id ? { ...x, court: e.target.value } : x
                                  );
                                  update({ schedule: newSchedule });
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
                                          
                          {/* BOUTONS D'ACTION (Vue Admin) */}
                          <div className="flex gap-2 mt-4 h-10">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canClick && !['canceled', 'forfeit'].includes(m.status)) { 
                                 toast.error("Impossible de lancer : il manque des joueurs.");
                                 return; 
                               }
                                if (!['canceled', 'forfeit'].includes(m.status)) handleLaunchMatch(m.id, canLaunchThisMatch);
                              }}
                              className={`flex-1 rounded-lg font-black tracking-widest text-[0.65rem] transition-all shadow-md ${canClick ? 'text-white cursor-pointer hover:-translate-y-0.5' : 'text-muted-dark bg-app-input cursor-not-allowed border border-muted-line'} ${isOngoing ? 'bg-gradient-to-r from-action to-action-light hover:shadow-[0_4px_10px_rgba(59,130,246,0.4)]' : ((isCanceled || isForfeit) ? 'bg-app-card text-muted-dark shadow-none' : (canClick && !isFinished ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-[0_4px_10px_rgba(16,185,129,0.4)]' : ''))} ${isFinished ? 'bg-muted-dark hover:bg-muted border border-muted-line shadow-none text-muted-light' : ''}`} 
                              disabled={isCanceled || isForfeit}
                            >
                               {isCanceled ? "ANNULÉ" : isForfeit ? "FORFAIT" : (isFinished ? "📊 STATS" : (canLaunchThisMatch ? (isOngoing ? "▶️ REPRENDRE" : "🚀 LANCER MATCH") : "🔴 DIRECT"))}
                            </button>
                            
                            {(canEdit && !isCanceled && !isForfeit) && (
                              <div className="flex gap-1.5 shrink-0">
                                
                                {/* LE BOUTON CRAYON : Visible même quand le match est terminé ! */}
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
                                
                                {/* LES AUTRES BOUTONS : Cachés si le match est terminé */}
                                {!isFinished && (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, false); }} className="w-10 h-10 rounded-lg bg-app-input border border-muted-line text-white flex items-center justify-center text-sm cursor-pointer hover:bg-action-dark hover:border-action transition-colors shadow-sm" title="Assigner OTM">👤</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', false); }} className="w-10 h-10 rounded-lg bg-white/5 border border-muted-line text-white flex items-center justify-center text-sm cursor-pointer hover:bg-muted-dark transition-colors shadow-sm" title="Annuler le match">❌</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'forfeit', false); }} className="w-10 h-10 rounded-lg bg-danger/20 border border-danger/30 text-danger flex items-center justify-center text-sm cursor-pointer hover:bg-danger hover:text-white transition-colors shadow-sm" title="Déclarer Forfait">🏳️</button>
                                  </>
                                )}
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