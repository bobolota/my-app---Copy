import React from 'react';

export default function MaCarriere({ careerStats }) {
  // Le petit composant visuel juste pour cette page
  const StatCard = ({ label, value, color }) => (
    <div style={{ background: '#222', padding: '15px', borderRadius: '8px', borderBottom: `3px solid ${color}`, flex: '1', minWidth: '100px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>{value}</div>
    </div>
  );

  return (
    <>
      <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>📊 Ma Carrière</h1>
      {careerStats && (
        <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid #333', marginTop: '30px' }}>
          {careerStats.gp === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', margin: 0 }}>Joue ton premier match officiel pour voir tes stats s'afficher ici !</p>
          ) : (
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <StatCard label="Matchs" value={careerStats.gp} color="#666" />
              <StatCard label="Total PTS" value={careerStats.pts} color="#ff4444" />
              <StatCard label="Moy. PTS" value={(careerStats.pts / careerStats.gp).toFixed(1)} color="#ff8844" />
              <StatCard label="Rebonds" value={careerStats.reb} color="var(--accent-blue)" />
              <StatCard label="Passes" value={careerStats.ast} color="var(--success)" />
              <StatCard label="MVP Éval." value={careerStats.eff} color="var(--accent-purple)" />
            </div>
          )}
        </div>
      )}
    </>
  );
}