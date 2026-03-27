import React, { useState } from 'react';

export default function PlayerProfileModal({
  selectedProfile,
  setSelectedProfile,
  session,
  myCaptainTeams,
  inviteTeamId,
  setInviteTeamId,
  handleInvitePlayer,
  managingTeam,
  removePlayer
}) {
  // NOUVEAU : On gère l'onglet actif pour les statistiques
  const [activeStatsTab, setActiveStatsTab] = useState('moyennes'); // 'moyennes', 'records', ou 'totaux'

  if (!selectedProfile) return null;

  const StatCard = ({ label, value, color }) => (
    <div style={{ background: '#222', padding: '12px', borderRadius: '8px', borderBottom: `3px solid ${color}`, flex: '1', minWidth: '80px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>{value}</div>
    </div>
  );

  const isCaptainOfManagingTeam = managingTeam && managingTeam.captain_id === session.user.id;
  const isSelectedPlayerMe = selectedProfile.id === session.user.id;
  // NOUVEAU : On vérifie si le joueur a déjà 3 équipes actives
  const hasReachedTeamLimit = selectedProfile.playerTeams && selectedProfile.playerTeams.length >= 3;

  // Style pour les boutons d'onglets
  const tabStyle = (tabName) => ({
    flex: 1,
    background: activeStatsTab === tabName ? '#333' : 'transparent',
    color: activeStatsTab === tabName ? 'white' : '#888',
    border: '1px solid #333',
    padding: '8px 5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    borderRadius: '6px',
    transition: '0.2s'
  });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '12px', maxWidth: '650px', width: '100%', border: '2px solid var(--accent-orange)', position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <button onClick={() => setSelectedProfile(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10 }}>✕</button>
        
        {/* EN-TÊTE FIXE */}
        <div style={{ flexShrink: 0 }}>
          <h2 style={{ marginTop: 0, color: 'white', fontSize: '2rem', marginBottom: '5px' }}>{selectedProfile.full_name}</h2>
          <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedProfile.role}</span>

          {/* AFFICHAGE DES ÉQUIPES DU JOUEUR */}
          <div style={{ marginTop: '15px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {selectedProfile.playerTeams && selectedProfile.playerTeams.length > 0 ? (
                selectedProfile.playerTeams.map((pt, i) => (
                  <span key={i} style={{ background: '#333', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #555' }}>
                    🛡️ {pt.name}
                  </span>
                ))
              ) : (
                <span style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic' }}>Agent libre (Aucune équipe)</span>
              )}
            </div>
          </div>
        </div>
        
        {/* ZONE AVEC DÉFILEMENT (STATS + ACTIONS) */}
        <div style={{ overflowY: 'auto', paddingRight: '10px', marginTop: '15px', flexGrow: 1 }}>
          <div style={{ marginTop: '10px' }}>
            {selectedProfile.stats.gp === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>Ce joueur n'a encore joué aucun match officiel.</p>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid #333' }}>
                
                {/* NOUVEAU : LA BARRE D'ONGLETS */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button onClick={() => setActiveStatsTab('moyennes')} style={tabStyle('moyennes')}>🎯 Moyennes</button>
                  <button onClick={() => setActiveStatsTab('records')} style={tabStyle('records')}>🚀 Records</button>
                  <button onClick={() => setActiveStatsTab('totaux')} style={tabStyle('totaux')}>📈 Totaux</button>
                </div>

                {/* CONTENU CONDITIONNEL SELON L'ONGLET */}
                {activeStatsTab === 'moyennes' && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <StatCard label="PTS / m" value={selectedProfile.stats.ptsAvg} color="#ff4444" />
                    <StatCard label="REB / m" value={selectedProfile.stats.rebAvg} color="var(--accent-blue)" />
                    <StatCard label="AST / m" value={selectedProfile.stats.astAvg} color="var(--success)" />
                    <StatCard label="STL / m" value={selectedProfile.stats.stlAvg} color="#f1c40f" />
                    <StatCard label="BLK / m" value={selectedProfile.stats.blkAvg} color="var(--accent-purple)" />
                    <StatCard label="ÉVAL / m" value={selectedProfile.stats.effAvg} color="var(--accent-orange)" />
                  </div>
                )}

                {activeStatsTab === 'records' && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <StatCard label="Max PTS" value={selectedProfile.stats.maxPts} color="#ff4444" />
                    <StatCard label="Max REB" value={selectedProfile.stats.maxReb} color="var(--accent-blue)" />
                    <StatCard label="Max AST" value={selectedProfile.stats.maxAst} color="var(--success)" />
                    <StatCard label="Max STL" value={selectedProfile.stats.maxStl} color="#f1c40f" />
                    <StatCard label="Max BLK" value={selectedProfile.stats.maxBlk} color="var(--accent-purple)" />
                    <StatCard label="Max ÉVAL" value={selectedProfile.stats.maxEff} color="var(--accent-orange)" />
                  </div>
                )}

                {activeStatsTab === 'totaux' && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
          
          {/* --- GESTION DU RECRUTEMENT / STATUT DANS L'ÉQUIPE (INCHANGÉ) --- */}
          {managingTeam ? (
            <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
              <h4 style={{ color: 'white', margin: '0 0 15px 0' }}>Statut avec {managingTeam.name}</h4>
              
              {selectedProfile.relationStatus === 'accepted' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid var(--success)' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✅ Membre de l'équipe</span>
                  {isCaptainOfManagingTeam && !isSelectedPlayerMe && (
                    <button 
                      onClick={() => {
                        removePlayer(selectedProfile.id);
                        setSelectedProfile(null);
                      }} 
                      style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                    >
                      EXCLURE ❌
                    </button>
                  )}
                </div>
              )}

              {(selectedProfile.relationStatus === 'invited' || selectedProfile.relationStatus === 'pending') && (
                <div style={{ background: 'rgba(255, 165, 0, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid var(--accent-orange)', textAlign: 'center', color: 'var(--accent-orange)', fontWeight: 'bold' }}>
                  ⏳ {selectedProfile.relationStatus === 'invited' ? 'Invitation envoyée (en attente de réponse)' : 'A postulé (en attente de votre validation)'}
                </div>
              )}

              {!selectedProfile.relationStatus && isCaptainOfManagingTeam && !isSelectedPlayerMe && (
                 hasReachedTeamLimit ? (
                   <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid var(--danger)', textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold' }}>
                     🚫 Ce joueur a déjà atteint la limite de 3 équipes actives. Il ne peut plus être recruté.
                   </div>
                 ) : (
                   <div style={{ display: 'flex', gap: '10px' }}>
                     <button onClick={() => {
                        handleInvitePlayer(selectedProfile.id);
                        setSelectedProfile({...selectedProfile, relationStatus: 'invited'});
                     }} style={{ flex: 1, background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                       INVITER CE JOUEUR ✉️
                     </button>
                   </div>
                 )
              )}
            </div>
          ) : (
            myCaptainTeams.length > 0 && !isSelectedPlayerMe && (
              <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                {selectedProfile.relationStatus === 'invited' || selectedProfile.relationStatus === 'pending' || selectedProfile.relationStatus === 'accepted' ? (
                  <div style={{ background: 'rgba(255, 165, 0, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid var(--accent-orange)', textAlign: 'center', color: 'var(--accent-orange)', fontWeight: 'bold' }}>
                    {selectedProfile.relationStatus === 'accepted' ? '✅ Ce joueur fait déjà partie de votre équipe' : '✅ Invitation déjà envoyée (ou en attente)'}
                  </div>
                ) : hasReachedTeamLimit ? (
                  <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid var(--danger)', textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold' }}>
                    🚫 Ce joueur a déjà atteint la limite de 3 équipes actives. Vous ne pouvez pas lui envoyer d'offre.
                  </div>
                ) : (
                  <>
                    <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 10px 0' }}>✉️ Recruter ce joueur</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      
                      {/* LA LISTE DES ÉQUIPES EN BOUTONS RADIO */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {myCaptainTeams.map(t => (
                          <label 
                            key={t.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px', 
                              background: inviteTeamId === t.id ? 'rgba(52, 152, 219, 0.15)' : '#222', 
                              padding: '12px 15px', 
                              borderRadius: '8px', 
                              border: inviteTeamId === t.id ? '1px solid var(--accent-blue)' : '1px solid #444', 
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <input 
                              type="radio" 
                              name="teamInvite" 
                              value={t.id} 
                              checked={inviteTeamId === t.id} 
                              onChange={(e) => setInviteTeamId(e.target.value)} 
                              style={{ cursor: 'pointer', accentColor: 'var(--accent-blue)', transform: 'scale(1.2)' }}
                            />
                            <span style={{ color: inviteTeamId === t.id ? 'white' : '#ccc', fontWeight: inviteTeamId === t.id ? 'bold' : 'normal', fontSize: '1rem' }}>
                              {t.name}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* LE BOUTON DE VALIDATION */}
                      <button onClick={() => {
                        if(!inviteTeamId) return alert("Sélectionnez une équipe en cochant la case !");
                        handleInvitePlayer(selectedProfile.id);
                      }} style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', fontSize: '1rem' }}>
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