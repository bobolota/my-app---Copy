import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export default function PlayerProfileModal({
  selectedProfile,
  setSelectedProfile,
  myCaptainTeams,
  inviteTeamId,
  setInviteTeamId,
  handleInvitePlayer,
  managingTeam,
  removePlayer,
  allTournaments
}) {
  const [activeStatsTab, setActiveStatsTab] = useState('moyennes'); // 'moyennes', 'records', ou 'totaux'
  // 👇 NOUVEAU : Onglet pour le format (5x5, 3x3, 1v1)
  const [activeFormat, setActiveFormat] = useState(5); 

  const { session } = useAuth();

  // 👇 LE MOTEUR DE CALCUL DES STATS AVEC FILTRE PAR FORMAT 👇
  const computedStats = useMemo(() => {
    let gp = 0, pts = 0, reb = 0, ast = 0, stl = 0, blk = 0;
    let maxPts = 0, maxReb = 0, maxAst = 0, maxStl = 0, maxBlk = 0, maxEff = 0;
    let totalEff = 0;

    if (!selectedProfile || !selectedProfile.full_name || !allTournaments) return { gp: 0 };

    allTournaments.forEach(t => {
      // 👇 NOUVEAU : On ignore le tournoi s'il ne correspond pas au format actif
      const tFormat = t.matchsettings?.courtSize || 5; 
      if (tFormat !== activeFormat) return;

      const allMatches = [...(t.schedule || []), ...(t.playoffs?.matches || [])];
      
      allMatches.forEach(m => {
        if (m.status !== 'finished') return;

        let myStats = null;
        
        const pInA = m.savedStatsA?.find(p => p.name === selectedProfile.full_name);
        if (pInA) myStats = pInA;
        else {
            const pInB = m.savedStatsB?.find(p => p.name === selectedProfile.full_name);
            if (pInB) myStats = pInB;
        }

        if (myStats) {
            gp++;
            pts += myStats.points || 0;
            const matchReb = (myStats.oreb || 0) + (myStats.dreb || 0);
            reb += matchReb;
            ast += myStats.ast || 0;
            stl += myStats.stl || 0;
            blk += myStats.blk || 0;

            const missedShots = ((myStats.fta || 0) - (myStats.ftm || 0)) + ((myStats.fg2a || 0) - (myStats.fg2m || 0)) + ((myStats.fg3a || 0) - (myStats.fg3m || 0));
            const matchEff = (myStats.points || 0) + matchReb + (myStats.ast || 0) + (myStats.stl || 0) + (myStats.blk || 0) - (myStats.tov || 0) - missedShots - (myStats.fouls || 0);
            totalEff += matchEff;

            if ((myStats.points || 0) > maxPts) maxPts = myStats.points || 0;
            if (matchReb > maxReb) maxReb = matchReb;
            if ((myStats.ast || 0) > maxAst) maxAst = myStats.ast || 0;
            if ((myStats.stl || 0) > maxStl) maxStl = myStats.stl || 0;
            if ((myStats.blk || 0) > maxBlk) maxBlk = myStats.blk || 0;
            if (matchEff > maxEff) maxEff = matchEff;
        }
      });
    });

    return gp > 0 ? {
        gp, pts, reb, ast, stl, blk, maxPts, maxReb, maxAst, maxStl, maxBlk, maxEff,
        ptsAvg: (pts / gp).toFixed(1),
        rebAvg: (reb / gp).toFixed(1),
        astAvg: (ast / gp).toFixed(1),
        stlAvg: (stl / gp).toFixed(1),
        blkAvg: (blk / gp).toFixed(1),
        effAvg: (totalEff / gp).toFixed(1)
    } : { gp: 0 };
  }, [allTournaments, selectedProfile, activeFormat]); // 👈 Ne pas oublier activeFormat !

  if (!selectedProfile) return null;

  // COMPOSANT VISUEL PREMIUM POUR LES STATS
  const StatCard = ({ label, value, color }) => (
    <div className="bg-app-card p-4 rounded-2xl border border-muted-line flex-1 min-w-[90px] text-center shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all">
      <div className="absolute top-0 left-0 right-0 h-1 opacity-80" style={{ backgroundColor: color }}></div>
      <div className="text-[10px] text-muted mb-1.5 uppercase tracking-widest font-black group-hover:text-muted-light transition-colors">{label}</div>
      <div className="text-2xl font-black text-white drop-shadow-md">{value}</div>
    </div>
  );

  const isCaptainOfManagingTeam = managingTeam && managingTeam.captain_id === session.user.id;
  const isSelectedPlayerMe = selectedProfile.id === session.user.id;
  
  // NOTE: La logique de "hasReachedTeamLimit" devra être affinée dans le composant parent (Dashboard) 
  // car ici on ne connait pas le format de ses équipes, on sait juste qu'il en a N au total.
  // Pour l'instant, on laisse tel quel pour ne pas tout casser, mais il faudrait lui passer hasReached5x5 et hasReached3x3.
  const hasReachedTeamLimit = selectedProfile.playerTeams && selectedProfile.playerTeams.length >= 6; // On passe à 6 (max 3x 5v5 + 3x 3v3) en attendant

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[1000] backdrop-blur-sm p-4">
      <div className="bg-app-panel/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-muted-line w-full max-w-[700px] relative flex flex-col max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Lueur d'arrière-plan douce (Couleur du rôle) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-[80px] pointer-events-none"></div>

        <button 
          onClick={() => setSelectedProfile(null)} 
          className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-app-input border border-muted-line text-muted w-10 h-10 rounded-full flex items-center justify-center text-xl cursor-pointer z-20 hover:text-white hover:bg-white/10 transition-all shadow-inner"
        >
          ✕
        </button>
        
        {/* EN-TÊTE FIXE PREMIUM COMPACT */}
        <div className="shrink-0 mb-6 relative z-10 border-b border-muted-line pb-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-secondary-dark to-warning flex items-center justify-center text-3xl font-black text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-muted-line shrink-0">
                {selectedProfile.full_name.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex flex-col justify-center items-center sm:items-start flex-1 w-full">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="m-0 text-white text-2xl sm:text-3xl font-black tracking-wide drop-shadow-md">{selectedProfile.full_name}</h2>
                <span className="bg-secondary/10 text-secondary border border-secondary/20 font-black text-[9px] tracking-widest uppercase px-2 py-0.5 rounded w-fit">
                  {selectedProfile.role || 'Joueur'}
                </span>
              </div>
              
              {/* 👇 LES ONGLETS INTÉGRÉS SOUS LE NOM 👇 */}
              <div className="flex bg-app-input border border-muted-line rounded-xl overflow-hidden shadow-inner w-full sm:w-fit mt-1">
                {[
                  { val: 5, label: "5x5 CLASSIC" },
                  { val: 3, label: "3x3 STREET" },
                  { val: 1, label: "1v1 DUEL" }
                ].map(tab => (
                  <button
                    key={tab.val}
                    onClick={() => setActiveFormat(tab.val)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 font-black text-[9px] sm:text-[10px] tracking-widest transition-all ${
                      activeFormat === tab.val
                        ? 'bg-gradient-to-r from-secondary to-danger text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                        : 'text-muted hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
            </div>
          </div>

          {/* AFFICHAGE DES ÉQUIPES DU JOUEUR */}
          <div className="mt-4 flex gap-2 flex-wrap justify-center sm:justify-start">
            {selectedProfile.playerTeams && selectedProfile.playerTeams.length > 0 ? (
              selectedProfile.playerTeams.map((pt, i) => (
                <span key={i} className="bg-black/40 text-white px-3 py-1.5 rounded-lg text-[10px] sm:text-xs border border-muted-line font-bold shadow-inner tracking-wider flex items-center gap-1.5">
                  <span className="text-primary">🛡️</span> {pt.name}
                  <span className="bg-white/10 text-white font-black text-[8px] sm:text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/20 ml-1">
                    {pt.format || '5x5'}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-muted-dark text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-muted-line">
                Agent libre (Aucune équipe)
              </span>
            )}
          </div>
        </div>
        
        {/* ZONE AVEC DÉFILEMENT (STATS + ACTIONS) */}
        <div className="overflow-y-auto pr-2 flex-grow custom-scrollbar relative z-10">
          
          <div className="mt-2">
            {computedStats.gp === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-50 bg-app-input/50 rounded-2xl border border-muted-line">
                <span className="text-4xl mb-3 drop-shadow-md">📊</span>
                <p className="text-center text-muted font-bold text-xs uppercase tracking-wider m-0">Aucun match officiel en {activeFormat}x{activeFormat}</p>
              </div>
            ) : (
              <div className="bg-black/20 p-4 sm:p-5 rounded-2xl border border-muted-line shadow-inner">
                
                {/* BARRE D'ONGLETS POUR LES STATS */}
                <div className="flex bg-app-input rounded-xl p-1 mb-5 border border-muted-line shadow-inner">
                  <button 
                    onClick={() => setActiveStatsTab('moyennes')} 
                    className={`flex-1 py-2 px-2 rounded-lg font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all ${activeStatsTab === 'moyennes' ? 'bg-muted-dark text-white shadow-md border border-muted-line' : 'bg-transparent text-muted hover:text-muted-light'}`}
                  >
                    🎯 Moyennes
                  </button>
                  <button 
                    onClick={() => setActiveStatsTab('records')} 
                    className={`flex-1 py-2 px-2 rounded-lg font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all ${activeStatsTab === 'records' ? 'bg-muted-dark text-white shadow-md border border-muted-line' : 'bg-transparent text-muted hover:text-muted-light'}`}
                  >
                    🚀 Records
                  </button>
                  <button 
                    onClick={() => setActiveStatsTab('totaux')} 
                    className={`flex-1 py-2 px-2 rounded-lg font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all ${activeStatsTab === 'totaux' ? 'bg-muted-dark text-white shadow-md border border-muted-line' : 'bg-transparent text-muted hover:text-muted-light'}`}
                  >
                    📈 Totaux
                  </button>
                </div>

                {/* CONTENU CONDITIONNEL SELON L'ONGLET */}
                {activeStatsTab === 'moyennes' && (
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    <StatCard label="PTS / m" value={computedStats.ptsAvg} color="#ef4444" />
                    <StatCard label="REB / m" value={computedStats.rebAvg} color="#3b82f6" />
                    <StatCard label="AST / m" value={computedStats.astAvg} color="#10b981" />
                    <StatCard label="STL / m" value={computedStats.stlAvg} color="#f59e0b" />
                    <StatCard label="BLK / m" value={computedStats.blkAvg} color="#a855f7" />
                    <StatCard label="ÉVAL / m" value={computedStats.effAvg} color="#f97316" />
                  </div>
                )}

                {activeStatsTab === 'records' && (
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    <StatCard label="Max PTS" value={computedStats.maxPts} color="#ef4444" />
                    <StatCard label="Max REB" value={computedStats.maxReb} color="#3b82f6" />
                    <StatCard label="Max AST" value={computedStats.maxAst} color="#10b981" />
                    <StatCard label="Max STL" value={computedStats.maxStl} color="#f59e0b" />
                    <StatCard label="Max BLK" value={computedStats.maxBlk} color="#a855f7" />
                    <StatCard label="Max ÉVAL" value={computedStats.maxEff} color="#f97316" />
                  </div>
                )}

                {activeStatsTab === 'totaux' && (
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    <StatCard label="Matchs" value={computedStats.gp} color="#666" />
                    <StatCard label="Tot PTS" value={computedStats.pts} color="#ef4444" />
                    <StatCard label="Tot REB" value={computedStats.reb} color="#3b82f6" />
                    <StatCard label="Tot AST" value={computedStats.ast} color="#10b981" />
                    <StatCard label="Tot STL" value={computedStats.stl} color="#f59e0b" />
                    <StatCard label="Tot BLK" value={computedStats.blk} color="#a855f7" />
                  </div>
                )}

              </div>
            )}
          </div>
          
          {/* --- GESTION DU RECRUTEMENT / STATUT DANS L'ÉQUIPE --- */}
          {managingTeam ? (
            <div className="mt-6 pt-5 border-t border-muted-line">
              <h4 className="text-white m-0 mb-3 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <span className="text-lg">🤝</span> Statut avec {managingTeam.name}
              </h4>
              
              {selectedProfile.relationStatus === 'accepted' && (
                <div className="flex justify-between items-center bg-primary/10 p-3.5 rounded-xl border border-primary/20 shadow-inner">
                  <span className="text-primary text-xs font-black tracking-wide">✅ Membre de l'équipe</span>
                  {isCaptainOfManagingTeam && !isSelectedPlayerMe && (
                    <button 
                      onClick={() => { removePlayer(selectedProfile.id); setSelectedProfile(null); }} 
                      className="bg-danger/10 text-danger border border-danger/30 px-4 py-2 rounded-lg font-black text-[10px] tracking-widest cursor-pointer hover:bg-danger hover:text-white transition-all shadow-sm"
                    >
                      EXCLURE ❌
                    </button>
                  )}
                </div>
              )}

              {(selectedProfile.relationStatus === 'invited' || selectedProfile.relationStatus === 'pending') && (
                <div className="bg-secondary/10 p-3.5 rounded-xl border border-secondary/20 text-center text-secondary text-xs font-black tracking-wide shadow-inner">
                  ⏳ {selectedProfile.relationStatus === 'invited' ? 'Invitation envoyée (En attente)' : 'A postulé (En attente de validation)'}
                </div>
              )}

              {!selectedProfile.relationStatus && isCaptainOfManagingTeam && !isSelectedPlayerMe && (
                 hasReachedTeamLimit ? (
                   <div className="bg-danger/10 p-3.5 rounded-xl border border-danger/20 text-center text-danger font-black tracking-wide text-[10px] sm:text-xs shadow-inner">
                      🚫 Ce joueur a atteint la limite d'équipes actives.
                   </div>
                 ) : (
                   <button 
                    onClick={() => { handleInvitePlayer(selectedProfile.id); setSelectedProfile({...selectedProfile, relationStatus: 'invited'}); }} 
                    className="w-full bg-gradient-to-r from-action to-action-light text-white border-none py-3 rounded-xl font-black tracking-widest cursor-pointer text-xs hover:shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 transition-all shadow-lg"
                   >
                      INVITER CE JOUEUR ✉️
                   </button>
                 )
              )}
            </div>
          ) : (
            myCaptainTeams.length > 0 && !isSelectedPlayerMe && (
              <div className="mt-6 pt-5 border-t border-muted-line">
                {(() => {
                  // 1. On récupère les noms des équipes dans lesquelles le joueur est DÉJÀ
                  const playerTeamNames = (selectedProfile.playerTeams || []).map(pt => pt.name);
                  
                  // 2. On filtre TES équipes pour ne garder que celles où il n'est PAS encore
                  const availableCaptainTeams = myCaptainTeams.filter(t => !playerTeamNames.includes(t.name));

                  // 3. S'il est déjà dans TOUTES tes équipes
                  if (availableCaptainTeams.length === 0) {
                    return (
                      <div className="bg-primary/10 p-3.5 rounded-xl border border-primary/20 text-center text-primary font-black text-xs tracking-wide shadow-inner">
                        ✅ Ce joueur fait déjà partie de toutes vos équipes !
                      </div>
                    );
                  }

                  // 4. S'il a atteint la limite absolue d'équipes (6)
                  if (hasReachedTeamLimit) {
                    return (
                      <div className="bg-danger/10 p-3.5 rounded-xl border border-danger/20 text-center text-danger font-black text-xs tracking-wide shadow-inner">
                        🚫 Ce joueur a atteint la limite d'équipes actives. Vous ne pouvez pas le recruter.
                      </div>
                    );
                  }

                  // 5. S'il reste des équipes disponibles, on affiche le formulaire !
                  return (
                    <div className="bg-app-input p-4 rounded-xl border border-muted-line shadow-inner">
                      
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-action-light m-0 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <span className="text-sm">✉️</span> Recruter ce joueur
                        </h4>
                        {/* Petit badge discret si une invitation est déjà en cours dans l'une des équipes */}
                        {(selectedProfile.relationStatus === 'invited' || selectedProfile.relationStatus === 'pending') && (
                          <span className="text-[8px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded uppercase tracking-widest font-bold">
                            ⏳ Invité ailleurs
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-stretch">
                        
                        <div className="flex flex-col gap-2 flex-1 w-full max-h-[90px] overflow-y-auto custom-scrollbar pr-1">
                          {availableCaptainTeams.map(t => (
                            <label 
                              key={t.id} 
                              className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all shadow-sm ${inviteTeamId === t.id ? 'bg-action/10 border-action/30' : 'bg-app-panel border-muted-line hover:bg-white/5'}`}
                            >
                              <input 
                                type="radio" name="teamInvite" value={t.id} 
                                checked={inviteTeamId === t.id} 
                                onChange={(e) => setInviteTeamId(e.target.value)} 
                                className="cursor-pointer accent-action ml-1"
                              />
                              <div className="flex justify-between items-center flex-1 pr-2">
                                <span className={`text-xs font-black tracking-wide truncate max-w-[130px] sm:max-w-[180px] ${inviteTeamId === t.id ? 'text-white' : 'text-muted-light'}`}>
                                  {t.name}
                                </span>
                                <span className="text-[8px] uppercase tracking-widest font-bold text-muted bg-black/40 px-1.5 py-0.5 rounded border border-muted-line shrink-0">
                                  {t.format || '5x5'}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>

                        <button 
                          onClick={() => {
                            if(!inviteTeamId) return alert("Sélectionnez une équipe !");
                            handleInvitePlayer(selectedProfile.id);
                          }} 
                          className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-action to-action-light text-white border-none px-5 py-3 rounded-lg font-black tracking-widest uppercase cursor-pointer text-[10px] hover:shadow-[0_4px_15px_rgba(59,130,246,0.4)] transition-all shadow-md flex items-center justify-center"
                        >
                          ENVOYER 🚀
                        </button>
                      </div>

                    </div>
                  );
                })()}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}