import React from 'react';

// Composant Memoïsé pour la performance (il ne se recharge que si les joueurs changent)
const BoxscoreTable = React.memo(({ title, players, color }) => {
  const formatPlayerTime = (sec) => {
    const safeSec = Number(sec) || 0;
    return `${Math.floor(safeSec / 60).toString().padStart(2, '0')}:${(safeSec % 60).toString().padStart(2, '0')}`;
  };

  if (!players) return null;

  return (
    <div className="bg-[var(--bg-panel)] rounded-xl p-6 border border-[#2a2a30] shadow-md overflow-x-auto">
      <h3 className="text-2xl font-bold tracking-wider mb-4" style={{ color: color || 'white' }}>{title}</h3>
      <table className="w-full text-center font-sans text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">N°</th>
            <th className="text-left bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">JOUEUR</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">MIN</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">PTS</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">TIRS</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">3PT</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">LF</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">+/-</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">AST</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">OREB</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">DREB</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">REB</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">STL</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">BLK</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">TOV</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">FLS</th>
            <th className="bg-[#111115] text-[#A0A0A0] text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-[#2a2a30]">EFF</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => {
            const pts = p.points || 0;
            const fg2m = p.fg2m || 0; const fg2a = p.fg2a || 0;
            const fg3m = p.fg3m || 0; const fg3a = p.fg3a || 0;
            const ftm = p.ftm || 0;   const fta = p.fta || 0;
            const ast = p.ast || 0;
            const oreb = p.oreb || 0; const dreb = p.dreb || 0;
            const stl = p.stl || 0;   const blk = p.blk || 0; 
            const tov = p.tov || 0;   const fouls = p.fouls || 0;
            const pm = p.plusMinus || 0;

            const pmColor = pm > 0 ? 'text-[var(--success)]' : (pm < 0 ? 'text-[var(--danger)]' : 'text-[#A0A0A0]');
            const isExcluded = fouls >= 5 || (p.techFouls || 0) >= 2 || (p.antiFouls || 0) >= 2 || p.isDisqualified;
            const fgm = fg2m + fg3m; const fga = fg2a + fg3a;
            const reb = oreb + dreb;
            const missedFG = fga - fgm; const missedFT = fta - ftm;
            const eff = (pts + reb + ast + stl + blk) - (missedFG + missedFT + tov);

            return (
              <tr key={p.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                <td className="text-left p-3.5 border-b border-[#2a2a30]">{p.number}</td>
                <td className="text-left p-3.5 border-b border-[#2a2a30]">{p.name} {p.status === 'court' && <span className="text-[var(--accent-orange)]">*</span>}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{formatPlayerTime(p.timePlayed)}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30] font-bold text-[1.05rem] text-white">{pts}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{fgm}/{fga}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{fg3m}/{fg3a}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{ftm}/{fta}</td>
                <td className={`text-center p-3.5 border-b border-[#2a2a30] font-bold ${pmColor}`}>{pm > 0 ? `+${pm}` : pm}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{ast}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{oreb}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{dreb}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30] font-bold text-gray-300">{reb}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{stl}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{blk}</td>
                <td className="text-center p-3.5 border-b border-[#2a2a30]">{tov}</td>
                <td className={`text-center p-3.5 border-b border-[#2a2a30] ${isExcluded ? "text-[var(--danger)] font-bold" : ""}`}>{fouls}</td>
                <td className={`text-center p-3.5 border-b border-[#2a2a30] font-bold text-[1.05rem] ${eff >= 15 ? 'text-[var(--success)]' : (eff < 0 ? 'text-[var(--danger)]' : 'text-white')}`}>{eff}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default BoxscoreTable;