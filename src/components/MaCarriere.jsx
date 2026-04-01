import React from 'react';

export default function MaCarriere({ careerStats }) {
  // Le petit composant visuel pour les cartes
  const StatCard = ({ label, value, color }) => (
    <div 
      className="bg-[#222] p-4 rounded-lg border-b-[3px] flex-1 min-w-[120px] text-center"
      style={{ borderColor: color }} // 💡 La seule ligne inline restante, car la couleur est dynamique !
    >
      <div className="text-xs text-[#888] mb-1 uppercase tracking-widest font-bold">{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );

  // Un composant pour séparer les catégories proprement
  const SectionHeader = ({ title, icon }) => (
    <h3 className="text-white border-b border-[#333] pb-2 mt-8 mb-5 text-xl font-bold">
      {icon} {title}
    </h3>
  );

  return (
    <>
      <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1920px] mx-auto"></div>
      <h1 className="text-white border-b-2 border-[#333] pb-2 text-2xl font-bold">
        📊 Ma Carrière
      </h1>
      
      {careerStats && (
        // p-5 sur mobile, p-8 sur tablette/PC pour que ça respire
        <div className="bg-[#1a1a1a] p-5 sm:p-8 rounded-xl border border-[#333] mt-8">
          {careerStats.gp === 0 ? (
            <p className="text-[#888] italic m-0 text-center text-lg">
              Joue ton premier match officiel pour voir tes statistiques s'afficher ici ! 🏀
            </p>
          ) : (
            <>
              {/* SECTION 1 : MOYENNES */}
              <SectionHeader title="Moyennes par match" icon="🎯" />
              <div className="flex flex-wrap gap-4">
                <StatCard label="PTS / m" value={careerStats.ptsAvg} color="#ff4444" />
                <StatCard label="REB / m" value={careerStats.rebAvg} color="var(--accent-blue)" />
                <StatCard label="AST / m" value={careerStats.astAvg} color="var(--success)" />
                <StatCard label="STL / m" value={careerStats.stlAvg} color="#f1c40f" />
                <StatCard label="BLK / m" value={careerStats.blkAvg} color="var(--accent-purple)" />
                <StatCard label="ÉVAL / m" value={careerStats.effAvg} color="var(--accent-orange)" />
              </div>

              {/* SECTION 2 : RECORDS */}
              <SectionHeader title="Records sur 1 match" icon="🚀" />
              <div className="flex flex-wrap gap-4">
                <StatCard label="Max PTS" value={careerStats.maxPts} color="#ff4444" />
                <StatCard label="Max REB" value={careerStats.maxReb} color="var(--accent-blue)" />
                <StatCard label="Max AST" value={careerStats.maxAst} color="var(--success)" />
                <StatCard label="Max STL" value={careerStats.maxStl} color="#f1c40f" />
                <StatCard label="Max BLK" value={careerStats.maxBlk} color="var(--accent-purple)" />
                <StatCard label="Max ÉVAL" value={careerStats.maxEff} color="var(--accent-orange)" />
              </div>

              {/* SECTION 3 : TOTAUX */}
              <SectionHeader title="Totaux en carrière" icon="📈" />
              <div className="flex flex-wrap gap-4">
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