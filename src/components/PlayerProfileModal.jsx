import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function PlayerProfileModal({
  selectedProfile,
  setSelectedProfile,
  myCaptainTeams,
  inviteTeamId,
  setInviteTeamId,
  handleInvitePlayer,
  managingTeam,
  removePlayer
}) {
  const [activeStatsTab, setActiveStatsTab] = useState('moyennes'); // 'moyennes', 'records', ou 'totaux'
  const { session } = useAuth();

  if (!selectedProfile) return null;

  const StatCard = ({ label, value, color }) => (
    <div className="bg-[#222] p-3 rounded-lg border-b-[3px] flex-1 min-w-[80px] text-center" style={{ borderBottomColor: color }}>
      <div className="text-[0.65rem] text-[#888] mb-1 uppercase tracking-widest font-bold">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );

  const isCaptainOfManagingTeam = managingTeam && managingTeam.captain_id === session.user.id;
  const isSelectedPlayerMe = selectedProfile.id === session.user.id;
  const hasReachedTeamLimit = selectedProfile.playerTeams && selectedProfile.playerTeams.length >= 3;

  return (
    <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-[1000] p-4">
      <div className="bg-[#1a1a1a] p-6 sm:p-8 rounded-xl border-2 border-[var(--accent-orange)] w-full max-w-[650px] relative flex flex-col max-h-[90vh] shadow-2xl">
        <button 
          onClick={() => setSelectedProfile(null)} 
          className="absolute top-4 right-4 bg-transparent border-none text-[#888] text-2xl cursor-pointer z-10 hover:text-white transition-colors"
        >
          ✕
        </button>
        
        {/* EN-TÊTE FIXE */}
        <div className="shrink-0 mb-4">
          <h2 className="mt-0 mb-1 text-white text-3xl font-black">{selectedProfile.full_name}</h2>
          <span className="text-[var(--accent-orange)] font-bold text-sm tracking-wider uppercase">{selectedProfile.role}</span>

          {/* AFFICHAGE DES ÉQUIPES DU JOUEUR */}
          <div className="mt-4">
            <div className="flex gap-2 flex-wrap">
              {selectedProfile.playerTeams && selectedProfile.playerTeams.length > 0 ? (
                selectedProfile.playerTeams.map((pt, i) => (
                  <span key={i} className="bg-[#333] text-white px-3 py-1 rounded-md text-[0.8rem] border border-[#555] font-bold shadow-sm">
                    🛡️ {pt.name}
                  </span>
                ))
              ) : (
                <span className="text-[#666] text-[0.85rem] italic">Agent libre (Aucune équipe)</span>
              )}
            </div>
          </div>
        </div>
        
        {/* ZONE AVEC DÉFILEMENT (STATS + ACTIONS) */}
        <div className="overflow-y-auto pr-2 flex-grow custom-scrollbar">
          
          <div className="mt-3">
            {selectedProfile.stats?.gp === 0 || !selectedProfile.stats ? (
              <p className="text-[#888] italic text-center py-8">Ce joueur n'a encore joué aucun match officiel.</p>
            ) : (
              <div className="bg-white/5 p-4 rounded-xl border border-[#333]">
                
                {/* BARRE D'ONGLETS */}
                <div className="flex gap-2 mb-5">
                  <button 
                    onClick={() => setActiveStatsTab('moyennes')} 
                    className={`flex-1 py-2 px-1 rounded-md font-bold text-[0.85rem] border transition-colors cursor-pointer ${activeStatsTab === 'moyennes' ? 'bg-[#333] text-white border-[#444]' : 'bg-transparent text-[#888] border-[#333] hover:text-white hover:bg-[#222]'}`}
                  >
                    🎯 Moyennes
                  </button>
                  <button 
                    onClick={() => setActiveStatsTab('records')} 
                    className={`flex-1 py-2 px-1 rounded-md font-bold text-[0.85rem] border transition-colors cursor-pointer ${activeStatsTab === 'records' ? 'bg-[#333] text-white border-[#444]' : 'bg-transparent text-[#888] border-[#333] hover:text-white hover:bg-[#222]'}`}
                  >
                    🚀 Records
                  </button>
                  <button 
                    onClick={() => setActiveStatsTab('totaux')} 
                    className={`flex-1 py-2 px-1 rounded-md font-bold text-[0.85rem] border transition-colors cursor-pointer ${activeStatsTab === 'totaux' ? 'bg-[#333] text-white border-[#444]' : 'bg-transparent text-[#888] border-[#333] hover:text-white hover:bg-[#222]'}`}
                  >
                    📈 Totaux
                  </button>
                </div>

                {/* CONTENU CONDITIONNEL SELON L'ONGLET */}
                {activeStatsTab === 'moyennes' && (
                  <div className="flex gap-2.5 flex-wrap">
                    <StatCard label="PTS / m" value={selectedProfile.stats.ptsAvg} color="#ff4444" />
                    <StatCard label="REB / m" value={selectedProfile.stats.rebAvg} color="var(--accent-blue)" />
                    <StatCard label="AST / m" value={selectedProfile.stats.astAvg} color="var(--success)" />
                    <StatCard label="STL / m" value={selectedProfile.stats.stlAvg} color="#f1c40f" />
                    <StatCard label="BLK / m" value={selectedProfile.stats.blkAvg} color="var(--accent-purple)" />
                    <StatCard label="ÉVAL / m" value={selectedProfile.stats.effAvg} color="var(--accent-orange)" />
                  </div>
                )}

                {activeStatsTab === 'records' && (
                  <div className="flex gap-2.5 flex-wrap">
                    <StatCard label="Max PTS" value={selectedProfile.stats.maxPts} color="#ff4444" />
                    <StatCard label="Max REB" value={selectedProfile.stats.maxReb} color="var(--accent-blue)" />
                    <StatCard label="Max AST" value={selectedProfile.stats.maxAst} color="var(--success)" />
                    <StatCard label="Max STL" value={selectedProfile.stats.maxStl} color="#f1c40f" />
                    <StatCard label="Max BLK" value={selectedProfile.stats.maxBlk} color="var(--accent-purple)" />
                    <StatCard label="Max ÉVAL" value={selectedProfile.stats.maxEff} color="var(--accent-orange)" />
                  </div>
                )}

                {activeStatsTab === 'totaux' && (
                  <div className="flex gap-2.5 flex-wrap">
                    <StatCard label="Matchs" value={selectedProfile.stats.gp} color="#666" />
                    <StatCard label="Tot PTS" value={selectedProfile.stats.pts} color="#ff4444" />
                    <StatCard label="Tot REB" value={selectedProfile.stats.reb} color="var(--accent-blue)" />
                    <StatCard label="Tot AST" value={selectedProfile.stats.ast} color="var(--success)" />
                    <StatCard label="Tot STL" value={selectedProfile.stats.stl} color="#f1c40f" />
                    <StatCard label="Tot BLK" value={selectedProfile.stats.blk} color="var(--accent-purple)" />
                  </div>
                )}

              </div>
            )}
          </div>
          
          {/* --- GESTION DU RECRUTEMENT / STATUT DANS L'ÉQUIPE --- */}
          {managingTeam ? (
            <div className="mt-8 pt-5 border-t border-[#333]">
              <h4 className="text-white m-0 mb-4 text-lg">Statut avec {managingTeam.name}</h4>
              
              {selectedProfile.relationStatus === 'accepted' && (
                <div className="flex justify-between items-center bg-[rgba(46,204,113,0.1)] p-4 rounded-lg border border-[var(--success)]">
                  <span className="text-[var(--success)] font-bold">✅ Membre de l'équipe</span>
                  {isCaptainOfManagingTeam && !isSelectedPlayerMe && (
                    <button 
                      onClick={() => {
                        removePlayer(selectedProfile.id);
                        setSelectedProfile(null);
                      }} 
                      className="bg-[var(--danger)] text-white border-none px-4 py-2 rounded-md font-bold cursor-pointer hover:bg-red-700 transition-colors"
                    >
                      EXCLURE ❌
                    </button>
                  )}
                </div>
              )}

              {(selectedProfile.relationStatus === 'invited' || selectedProfile.relationStatus === 'pending') && (
                <div className="bg-[rgba(255,165,0,0.1)] p-4 rounded-lg border border-[var(--accent-orange)] text-center text-[var(--accent-orange)] font-bold">
                  ⏳ {selectedProfile.relationStatus === 'invited' ? 'Invitation envoyée (en attente de réponse)' : 'A postulé (en attente de votre validation)'}
                </div>
              )}

              {!selectedProfile.relationStatus && isCaptainOfManagingTeam && !isSelectedPlayerMe && (
                 hasReachedTeamLimit ? (
                   <div className="bg-[rgba(255,68,68,0.1)] p-4 rounded-lg border border-[var(--danger)] text-center text-[var(--danger)] font-bold text-sm">
                      🚫 Ce joueur a déjà atteint la limite de 3 équipes actives. Il ne peut plus être recruté.
                   </div>
                 ) : (
                   <div className="flex">
                     <button 
                      onClick={() => {
                        handleInvitePlayer(selectedProfile.id);
                        setSelectedProfile({...selectedProfile, relationStatus: 'invited'});
                      }} 
                      className="flex-1 bg-[var(--accent-blue)] text-white border-none p-3 rounded-lg font-bold cursor-pointer text-base hover:bg-blue-600 transition-colors shadow-lg"
                     >
                       INVITER CE JOUEUR ✉️
                     </button>
                   </div>
                 )
              )}
            </div>
          ) : (
            myCaptainTeams.length > 0 && !isSelectedPlayerMe && (
              <div className="mt-8 pt-5 border-t border-[#333]">
                {selectedProfile.relationStatus === 'invited' || selectedProfile.relationStatus === 'pending' || selectedProfile.relationStatus === 'accepted' ? (
                  <div className="bg-[rgba(255,165,0,0.1)] p-4 rounded-lg border border-[var(--accent-orange)] text-center text-[var(--accent-orange)] font-bold text-sm">
                    {selectedProfile.relationStatus === 'accepted' ? '✅ Ce joueur fait déjà partie de votre équipe' : '✅ Invitation déjà envoyée (ou en attente)'}
                  </div>
                ) : hasReachedTeamLimit ? (
                  <div className="bg-[rgba(255,68,68,0.1)] p-4 rounded-lg border border-[var(--danger)] text-center text-[var(--danger)] font-bold text-sm">
                    🚫 Ce joueur a déjà atteint la limite de 3 équipes actives. Vous ne pouvez pas lui envoyer d'offre.
                  </div>
                ) : (
                  <>
                    <h4 className="text-[var(--accent-blue)] m-0 mb-3 text-lg font-bold">✉️ Recruter ce joueur</h4>
                    <div className="flex flex-col gap-3">
                      
                      {/* LA LISTE DES ÉQUIPES EN BOUTONS RADIO */}
                      <div className="flex flex-col gap-2">
                        {myCaptainTeams.map(t => (
                          <label 
                            key={t.id} 
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${inviteTeamId === t.id ? 'bg-[rgba(52,152,219,0.15)] border-[var(--accent-blue)]' : 'bg-[#222] border-[#444] hover:bg-[#333]'}`}
                          >
                            <input 
                              type="radio" 
                              name="teamInvite" 
                              value={t.id} 
                              checked={inviteTeamId === t.id} 
                              onChange={(e) => setInviteTeamId(e.target.value)} 
                              className="cursor-pointer scale-125 accent-[var(--accent-blue)]"
                            />
                            <span className={`text-base ${inviteTeamId === t.id ? 'text-white font-bold' : 'text-[#ccc]'}`}>
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
                        className="mt-1 bg-[var(--accent-blue)] text-white border-none p-3 rounded-lg font-bold cursor-pointer text-base hover:bg-blue-600 transition-colors shadow-lg"
                      >
                        ENVOYER L'INVITATION
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}