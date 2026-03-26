import React from 'react';

export default function PlayerProfileModal({
  selectedProfile,
  setSelectedProfile,
  session,
  myCaptainTeams,
  inviteTeamId,
  setInviteTeamId,
  handleInvitePlayer
}) {
  // Si aucun joueur n'est cliqué, on n'affiche rien
  if (!selectedProfile) return null;

  // Le petit composant pour les cases de statistiques
  const StatCard = ({ label, value, color }) => (
    <div style={{ background: '#222', padding: '15px', borderRadius: '8px', borderBottom: `3px solid ${color}`, flex: '1', minWidth: '100px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '100%', border: '2px solid var(--accent-orange)', position: 'relative' }}>
        <button onClick={() => setSelectedProfile(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        
        <h2 style={{ marginTop: 0, color: 'white', fontSize: '2rem', marginBottom: '5px' }}>{selectedProfile.full_name}</h2>
        <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedProfile.role}</span>
        
        <div style={{ marginTop: '25px' }}>
          {selectedProfile.stats.gp === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic' }}>Ce joueur n'a encore joué aucun match officiel.</p>
          ) : (
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <StatCard label="Matchs" value={selectedProfile.stats.gp} color="#666" />
              <StatCard label="PTS" value={selectedProfile.stats.pts} color="#ff4444" />
              <StatCard label="Moy." value={(selectedProfile.stats.pts / selectedProfile.stats.gp).toFixed(1)} color="#ff8844" />
              <StatCard label="Éval." value={selectedProfile.stats.eff} color="var(--accent-purple)" />
            </div>
          )}
        </div>
        
        {/* Recrutement pour les capitaines */}
        {myCaptainTeams.length > 0 && selectedProfile.id !== session.user.id && (
          <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
            <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 10px 0' }}>✉️ Recruter ce joueur</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={inviteTeamId} onChange={e => setInviteTeamId(e.target.value)} style={{ flex: 1, padding: '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '6px' }}>
                <option value="">-- Choisir mon équipe --</option>
                {myCaptainTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={() => handleInvitePlayer(selectedProfile.id)} style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>INVITER</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}