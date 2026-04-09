import React from 'react';

const BoxscoreTable = React.memo(({ title, players, color, courtSize = 5 }) => { 
  const formatPlayerTime = (sec) => {
    const safeSec = Number(sec) || 0;
    return `${Math.floor(safeSec / 60).toString().padStart(2, '0')}:${(safeSec % 60).toString().padStart(2, '0')}`;
  };

  if (!players) return null;

  return (
    <div className="bg-app-panel rounded-xl p-6 border border-muted-line shadow-md overflow-x-auto">
      <h3 className="text-2xl font-bold tracking-wider mb-4" style={{ color: color || 'white' }}>{title}</h3>
      <table className="w-full text-center font-sans text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">N°</th>
            <th className="text-left bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">JOUEUR</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">MIN</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">PTS</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">TIRS</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">3PT</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">LF</th>
            {courtSize === 5 && <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">+/-</th>}
            {courtSize !== 1 && <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">AST</th>}
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">OREB</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">DREB</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">REB</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">STL</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">BLK</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">TOV</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">FLS</th>
            <th className="bg-app-bg text-muted-light text-[0.85rem] tracking-widest font-semibold uppercase p-3 border-b border-muted-line">EFF</th>
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

            const pmColor = pm > 0 ? 'text-primary' : (pm < 0 ? 'text-danger' : 'text-muted-light');
            const isExcluded = fouls >= 5 || (p.techFouls || 0) >= 2 || (p.antiFouls || 0) >= 2 || p.isDisqualified;
            const fgm = fg2m + fg3m; const fga = fg2a + fg3a;
            const reb = oreb + dreb;
            const missedFG = fga - fgm; const missedFT = fta - ftm;
            const eff = (pts + reb + ast + stl + blk) - (missedFG + missedFT + tov);

            return (
              <tr key={p.id} className="hover:bg-white/5 transition-colors">
                <td className="text-left p-3.5 border-b border-muted-line">{p.number}</td>
                <td className="text-left p-3.5 border-b border-muted-line">{p.name} {p.status === 'court' && <span className="text-secondary font-black ml-1">*</span>}</td>
                <td className="text-center p-3.5 border-b border-muted-line">{formatPlayerTime(p.timePlayed)}</td>
                <td className="text-center p-3.5 border-b border-muted-line font-bold text-[1.05rem] text-white">{pts}</td>
                <td className="text-center p-3.5 border-b border-muted-line">{fgm}/{fga}</td>
                <td className="text-center p-3.5 border-b border-muted-line">{fg3m}/{fg3a}</td>
                <td className="text-center p-3.5 border-b border-muted-line">{ftm}/{fta}</td>
                {courtSize === 5 && <td className={`text-center p-3.5 border-b border-muted-line font-bold ${pmColor}`}>{pm > 0 ? `+${pm}` : pm}</td>}
                {courtSize !== 1 && <td className="text-center p-3.5 border-b border-muted-line">{ast}</td>}
                <td className="text-center p-3.5 border-b border-muted-line">{oreb}</td>
                <td className="text-center p-3.5 border-b border-muted-line">{dreb}</td>
                <td className="text-center p-3.5 border-b border-muted-line font-bold text-muted-light">{reb}</td>
                <td className="text-center p-3.5 border-b border-muted-line">{stl}</td>
                <td className="text-center p-3.5 border-b border-muted-line">{blk}</td>
                <td className="text-center p-3.5 border-b border-muted-line">{tov}</td>
                <td className={`text-center p-3.5 border-b border-muted-line ${isExcluded ? "text-danger font-bold" : ""}`}>{fouls}</td>
                <td className={`text-center p-3.5 border-b border-muted-line font-bold text-[1.05rem] ${eff >= 15 ? 'text-primary' : (eff < 0 ? 'text-danger' : 'text-white')}`}>{eff}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default BoxscoreTable;