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
  allTournaments // 👈 1. ON RÉCUPÈRE LES TOURNOIS ICI
}) {
  const [activeStatsTab, setActiveStatsTab] = useState('moyennes'); // 'moyennes', 'records', ou 'totaux'
  const { session } = useAuth();

  // 👇 2. LE MOTEUR DE CALCUL DES STATS EN TEMPS RÉEL 👇
  const computedStats = useMemo(() => {
    let gp = 0, pts = 0, reb = 0, ast = 0, stl = 0, blk = 0;
    let maxPts = 0, maxReb = 0, maxAst = 0, maxStl = 0, maxBlk = 0, maxEff = 0;
    let totalEff = 0;

    if (!selectedProfile || !selectedProfile.full_name || !allTournaments) return { gp: 0 };

    allTournaments.forEach(t => {
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
  }, [allTournaments, selectedProfile]);

  if (!selectedProfile) return null;

  // COMPOSANT VISUEL PREMIUM POUR LES STATS
  const StatCard = ({ label, value, color }) => (
    <div className="bg-[#1e1e2a] p-4 rounded-2xl border border-white/5 flex-1 min-w-[90px] text-center shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all">
      <div className="absolute top-0 left-0 right-0 h-1 opacity-80" style={{ backgroundColor: color }}></div>
      <div className="text-[10px] text-[#888] mb-1.5 uppercase tracking-widest font-black group-hover:text-[#aaa] transition-colors">{label}</div>
      <div className="text-2xl font-black text-white drop-shadow-md">{value}</div>
    </div>
  );

  const isCaptainOfManagingTeam = managingTeam && managingTeam.captain_id === session.user.id;
  const isSelectedPlayerMe = selectedProfile.id === session.user.id;
  const hasReachedTeamLimit = selectedProfile.playerTeams && selectedProfile.playerTeams.length >= 3;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[1000] backdrop-blur-sm p-4">
      <div className="bg-[#15151e]/95 backdrop-blur-xl p-8 rounded-3xl border border-white/10 w-full max-w-[700px] relative flex flex-col max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Lueur d'arrière-plan douce (Couleur du rôle) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] pointer-events-none"></div>

        <button 
          onClick={() => setSelectedProfile(null)} 
          className="absolute top-6 right-6 bg-black/40 border border-white/10 text-[#888] w-10 h-10 rounded-full flex items-center justify-center text-xl cursor-pointer z-20 hover:text-white hover:bg-white/10 transition-all shadow-inner"
        >
          ✕
        </button>
        
        {/* EN-TÊTE FIXE PREMIUM */}
        <div className="shrink-0 mb-6 relative z-10 border-b border-white/10 pb-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-600 to-yellow-500 flex items-center justify-center text-3xl font-black text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-white/20 shrink-0">
                {selectedProfile.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="mt-0 mb-1 text-white text-3xl sm:text-4xl font-black tracking-wide drop-shadow-md">{selectedProfile.full_name}</h2>
              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 font-black text-[10px] tracking-widest uppercase px-2.5 py-1 rounded w-fit">
                {selectedProfile.role || 'Joueur'}
              </span>
            </div>
          </div>

          {/* AFFICHAGE DES ÉQUIPES DU JOUEUR */}
          <div className="mt-5">
            <div className="flex gap-2 flex-wrap">
              {selectedProfile.playerTeams && selectedProfile.playerTeams.length > 0 ? (
                selectedProfile.playerTeams.map((pt, i) => (
                  <span key={i} className="bg-black/40 text-white px-3 py-1.5 rounded-lg text-xs border border-white/10 font-bold shadow-inner tracking-wider flex items-center gap-1.5">
                    <span className="text-emerald-400">🛡️</span> {pt.name}
                  </span>
                ))
              ) : (
                <span className="text-[#666] text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  Agent libre (Aucune équipe)
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* ZONE AVEC DÉFILEMENT (STATS + ACTIONS) */}
        <div className="overflow-y-auto pr-2 flex-grow custom-scrollbar relative z-10">
          
          <div className="mt-2">
            {/* 👇 3. ON UTILISE computedStats AU LIEU DE selectedProfile.stats 👇 */}
            {computedStats.gp === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-4xl mb-3 drop-shadow-md">📊</span>
                <p className="text-center text-[#888] font-bold text-xs uppercase tracking-wider m-0">Aucun match officiel joué</p>
              </div>
            ) : (
              <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-inner">
                
                {/* BARRE D'ONGLETS PREMIUM */}
                <div className="flex bg-black/40 rounded-xl p-1.5 mb-6 border border-white/5 shadow-inner">
                  <button 
                    onClick={() => setActiveStatsTab('moyennes')} 
                    className={`flex-1 py-2.5 px-2 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all ${activeStatsTab === 'moyennes' ? 'bg-[#333] text-white shadow-md border border-white/10' : 'bg-transparent text-[#666] hover:text-[#aaa]'}`}
                  >
                    🎯 Moyennes
                  </button>
                  <button 
                    onClick={() => setActiveStatsTab('records')} 
                    className={`flex-1 py-2.5 px-2 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all ${activeStatsTab === 'records' ? 'bg-[#333] text-white shadow-md border border-white/10' : 'bg-transparent text-[#666] hover:text-[#aaa]'}`}
                  >
                    🚀 Records
                  </button>
                  <button 
                    onClick={() => setActiveStatsTab('totaux')} 
                    className={`flex-1 py-2.5 px-2 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all ${activeStatsTab === 'totaux' ? 'bg-[#333] text-white shadow-md border border-white/10' : 'bg-transparent text-[#666] hover:text-[#aaa]'}`}
                  >
                    📈 Totaux
                  </button>
                </div>

                {/* CONTENU CONDITIONNEL SELON L'ONGLET */}
                {activeStatsTab === 'moyennes' && (
                  <div className="flex gap-3 flex-wrap">
                    <StatCard label="PTS / m" value={computedStats.ptsAvg} color="#ef4444" />
                    <StatCard label="REB / m" value={computedStats.rebAvg} color="#3b82f6" />
                    <StatCard label="AST / m" value={computedStats.astAvg} color="#10b981" />
                    <StatCard label="STL / m" value={computedStats.stlAvg} color="#f59e0b" />
                    <StatCard label="BLK / m" value={computedStats.blkAvg} color="#a855f7" />
                    <StatCard label="ÉVAL / m" value={computedStats.effAvg} color="#f97316" />
                  </div>
                )}

                {activeStatsTab === 'records' && (
                  <div className="flex gap-3 flex-wrap">
                    <StatCard label="Max PTS" value={computedStats.maxPts} color="#ef4444" />
                    <StatCard label="Max REB" value={computedStats.maxReb} color="#3b82f6" />
                    <StatCard label="Max AST" value={computedStats.maxAst} color="#10b981" />
                    <StatCard label="Max STL" value={computedStats.maxStl} color="#f59e0b" />
                    <StatCard label="Max BLK" value={computedStats.maxBlk} color="#a855f7" />
                    <StatCard label="Max ÉVAL" value={computedStats.maxEff} color="#f97316" />
                  </div>
                )}

                {activeStatsTab === 'totaux' && (
                  <div className="flex gap-3 flex-wrap">
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
            <div className="mt-8 pt-6 border-t border-white/5">
              <h4 className="text-white m-0 mb-4 text-base font-black uppercase tracking-widest flex items-center gap-2">
                <span className="text-xl">🤝</span> Statut avec {managingTeam.name}
              </h4>
              
              {selectedProfile.relationStatus === 'accepted' && (
                <div className="flex justify-between items-center bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 shadow-inner">
                  <span className="text-emerald-400 font-black tracking-wide">✅ Membre de l'équipe</span>
                  {isCaptainOfManagingTeam && !isSelectedPlayerMe && (
                    <button 
                      onClick={() => {
                        removePlayer(selectedProfile.id);
                        setSelectedProfile(null);
                      }} 
                      className="bg-red-500/10 text-red-400 border border-red-500/30 px-5 py-2.5 rounded-xl font-black text-xs tracking-widest cursor-pointer hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      EXCLURE ❌
                    </button>
                  )}
                </div>
              )}

              {(selectedProfile.relationStatus === 'invited' || selectedProfile.relationStatus === 'pending') && (
                <div className="bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20 text-center text-orange-400 font-black tracking-wide shadow-inner">
                  ⏳ {selectedProfile.relationStatus === 'invited' ? 'Invitation envoyée (En attente)' : 'A postulé (En attente de validation)'}
                </div>
              )}

              {!selectedProfile.relationStatus && isCaptainOfManagingTeam && !isSelectedPlayerMe && (
                 hasReachedTeamLimit ? (
                   <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 text-center text-red-400 font-black tracking-wide text-sm shadow-inner">
                      🚫 Ce joueur a déjà atteint la limite de 3 équipes actives. Il ne peut plus être recruté.
                   </div>
                 ) : (
                   <div className="flex">
                     <button 
                      onClick={() => {
                        handleInvitePlayer(selectedProfile.id);
                        setSelectedProfile({...selectedProfile, relationStatus: 'invited'});
                      }} 
                      className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-none p-4 rounded-xl font-black tracking-widest cursor-pointer text-sm hover:shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 transition-all shadow-lg"
                     >
                        INVITER CE JOUEUR ✉️
                     </button>
                   </div>
                 )
              )}
            </div>
          ) : (
            myCaptainTeams.length > 0 && !isSelectedPlayerMe && (
              <div className="mt-8 pt-6 border-t border-white/5">
                {selectedProfile.relationStatus === 'invited' || selectedProfile.relationStatus === 'pending' || selectedProfile.relationStatus === 'accepted' ? (
                  <div className="bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20 text-center text-orange-400 font-black text-sm tracking-wide shadow-inner">
                    {selectedProfile.relationStatus === 'accepted' ? '✅ Ce joueur fait déjà partie de votre équipe' : '✅ Invitation déjà envoyée (ou en attente)'}
                  </div>
                ) : hasReachedTeamLimit ? (
                  <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 text-center text-red-400 font-black text-sm tracking-wide shadow-inner">
                    🚫 Ce joueur a déjà atteint la limite de 3 équipes actives. Vous ne pouvez pas lui envoyer d'offre.
                  </div>
                ) : (
                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-blue-400 m-0 mb-4 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <span className="text-lg">✉️</span> Recruter ce joueur
                    </h4>
                    <div className="flex flex-col gap-4">
                      
                      {/* LA LISTE DES ÉQUIPES EN BOUTONS RADIO PREMIUM */}
                      <div className="flex flex-col gap-3">
                        {myCaptainTeams.map(t => (
                          <label 
                            key={t.id} 
                            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${inviteTeamId === t.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/40 border-white/10 hover:bg-white/5'}`}
                          >
                            <input 
                              type="radio" 
                              name="teamInvite" 
                              value={t.id} 
                              checked={inviteTeamId === t.id} 
                              onChange={(e) => setInviteTeamId(e.target.value)} 
                              className="cursor-pointer scale-125 accent-blue-500"
                            />
                            <span className={`text-base font-black tracking-wide ${inviteTeamId === t.id ? 'text-white' : 'text-[#888]'}`}>
                              {t.name}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* LE BOUTON DE VALIDATION */}
                      <button 
                        onClick={() => {
                          if(!inviteTeamId) return alert("Sélectionnez une équipe en cochant la case !");
                          handleInvitePlayer(selectedProfile.id);
                        }} 
                        className="mt-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-none p-4 rounded-xl font-black tracking-widest uppercase cursor-pointer text-xs hover:shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 transition-all shadow-lg"
                      >
                        ENVOYER L'INVITATION 🚀
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}