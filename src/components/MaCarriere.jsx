import React from 'react';

export default function MaCarriere({ careerStats }) {
  // Le petit composant visuel pour les cartes
  const StatCard = ({ label, value, color }) => (
    <div style={{ background: '#222', padding: '15px', borderRadius: '8px', borderBottom: `3px solid ${color}`, flex: '1', minWidth: '120px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>{value}</div>
    </div>
  );

  // Un composant pour séparer les catégories proprement
  const SectionHeader = ({ title, icon }) => (
    <h3 style={{ color: 'white', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: '30px', marginBottom: '20px', fontSize: '1.2rem' }}>
      {icon} {title}
    </h3>
  );

  return (
    <>
      <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>📊 Ma Carrière</h1>
      {careerStats && (
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '12px', border: '1px solid #333', marginTop: '30px' }}>
          {careerStats.gp === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', margin: 0, textAlign: 'center', fontSize: '1.1rem' }}>
              Joue ton premier match officiel pour voir tes statistiques s'afficher ici ! 🏀
            </p>
          ) : (
            <>
              {/* SECTION 1 : MOYENNES */}
              <SectionHeader title="Moyennes par match" icon="🎯" />
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <StatCard label="PTS / m" value={careerStats.ptsAvg} color="#ff4444" />
                <StatCard label="REB / m" value={careerStats.rebAvg} color="var(--accent-blue)" />
                <StatCard label="AST / m" value={careerStats.astAvg} color="var(--success)" />
                <StatCard label="STL / m" value={careerStats.stlAvg} color="#f1c40f" />
                <StatCard label="BLK / m" value={careerStats.blkAvg} color="var(--accent-purple)" />
                <StatCard label="ÉVAL / m" value={careerStats.effAvg} color="var(--accent-orange)" />
              </div>

              {/* SECTION 2 : RECORDS */}
              <SectionHeader title="Records sur 1 match" icon="🚀" />
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <StatCard label="Max PTS" value={careerStats.maxPts} color="#ff4444" />
                <StatCard label="Max REB" value={careerStats.maxReb} color="var(--accent-blue)" />
                <StatCard label="Max AST" value={careerStats.maxAst} color="var(--success)" />
                <StatCard label="Max STL" value={careerStats.maxStl} color="#f1c40f" />
                <StatCard label="Max BLK" value={careerStats.maxBlk} color="var(--accent-purple)" />
                <StatCard label="Max ÉVAL" value={careerStats.maxEff} color="var(--accent-orange)" />
              </div>

              {/* SECTION 3 : TOTAUX */}
              <SectionHeader title="Totaux en carrière" icon="📈" />
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <StatCard label="Matchs" value={careerStats.gp} color="#666" />
                <StatCard label="Total PTS" value={careerStats.pts} color="#ff4444" />
                <StatCard label="Total REB" value={careerStats.reb} color="var(--accent-blue)" />
                <StatCard label="Total AST" value={careerStats.ast} color="var(--success)" />
                <StatCard label="Total STL" value={careerStats.stl} color="#f1c40f" />
                <StatCard label="Total BLK" value={careerStats.blk} color="var(--accent-purple)" />              
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}