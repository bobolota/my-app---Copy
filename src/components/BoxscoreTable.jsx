import React from 'react';

const BoxscoreTable = React.memo(({ title, players, color, courtSize = 5 }) => { 
  const formatPlayerTime = (sec) => {
    const safeSec = Number(sec) || 0;
    return `${Math.floor(safeSec / 60).toString().padStart(2, '0')}:${(safeSec % 60).toString().padStart(2, '0')}`;
  };

  if (!players) return null;

  return (
    <div className="bg-app-panel/95 backdrop-blur-xl rounded-2xl p-6 border border-muted-line shadow-xl overflow-x-auto">
      <h3 className="text-2xl font-bold tracking-wider mb-6 uppercase" style={{ color: color || '#f3f4f6' }}>
        {title}
      </h3>
      
      <table className="w-full text-center font-sans text-sm border-collapse">
        <thead>
          <tr className="bg-black/20">
            <th className="text-left text-gray-200 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60 rounded-tl-xl">N°</th>
            <th className="text-left text-gray-200 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60">JOUEUR</th>
            <th className="text-gray-400 text-[0.75rem] tracking-widest font-semibold uppercase p-4 border-b border-muted-line/60">MIN</th>
            <th className="text-gray-200 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60">PTS</th>
            <th className="text-gray-400 text-[0.75rem] tracking-widest font-semibold uppercase p-4 border-b border-muted-line/60">TIRS</th>
            <th className="text-gray-400 text-[0.75rem] tracking-widest font-semibold uppercase p-4 border-b border-muted-line/60">3PT</th>
            <th className="text-gray-400 text-[0.75rem] tracking-widest font-semibold uppercase p-4 border-b border-muted-line/60">LF</th>
            {courtSize === 5 && <th className="text-gray-200 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60">+/-</th>}
            {courtSize !== 1 && <th className="text-gray-200 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60">AST</th>}
            <th className="text-gray-400 text-[0.75rem] tracking-widest font-semibold uppercase p-4 border-b border-muted-line/60">OREB</th>
            <th className="text-gray-400 text-[0.75rem] tracking-widest font-semibold uppercase p-4 border-b border-muted-line/60">DREB</th>
            <th className="text-gray-200 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60">REB</th>
            <th className="text-gray-200 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60">STL</th>
            <th className="text-gray-200 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60">BLK</th>
            <th className="text-gray-400 text-[0.75rem] tracking-widest font-semibold uppercase p-4 border-b border-muted-line/60">TOV</th>
            <th className="text-rose-400/90 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60">FLS</th>
            <th className="text-emerald-400/90 text-[0.75rem] tracking-widest font-bold uppercase p-4 border-b border-muted-line/60 rounded-tr-xl">EFF</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const pts = p.points || 0;
            const fg2m = p.fg2m || 0; const fg2a = p.fg2a || 0;
            const fg3m = p.fg3m || 0; const fg3a = p.fg3a || 0;
            const ftm = p.ftm || 0;   const fta = p.fta || 0;
            const ast = p.ast || 0;
            const oreb = p.oreb || 0; const dreb = p.dreb || 0;
            const stl = p.stl || 0;   const blk = p.blk || 0; 
            const tov = p.tov || 0;   const fouls = p.fouls || 0;
            const pm = p.plusMinus || 0;

            const isExcluded = fouls >= 5 || (p.techFouls || 0) >= 2 || (p.antiFouls || 0) >= 2 || p.isDisqualified;
            const fgm = fg2m + fg3m; const fga = fg2a + fg3a;
            const reb = oreb + dreb;
            const missedFG = fga - fgm; const missedFT = fta - ftm;
            const eff = (pts + reb + ast + stl + blk) - (missedFG + missedFT + tov);

            // 🎨 Couleurs adoucies
            const pmColor = pm > 0 ? 'text-emerald-400/90' : (pm < 0 ? 'text-rose-400/90' : 'text-gray-400');
            const effColor = eff >= 15 ? 'text-emerald-400/90' : (eff < 0 ? 'text-rose-400/90' : 'text-gray-100');
            
            // 🦓 Zébrage très subtil
            const rowBg = idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]';

            return (
              <tr key={p.id} className={`${rowBg} hover:bg-white/5 transition-colors`}>
                <td className="text-left p-3.5 border-b border-muted-line/40 text-gray-400 font-semibold">{p.number}</td>
                <td className="text-left p-3.5 border-b border-muted-line/40 font-bold text-gray-100">
                  {p.name} {p.status === 'court' && <span className="text-secondary/80 ml-1" title="Sur le terrain">*</span>}
                </td>
                <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-400 font-mono text-xs">{formatPlayerTime(p.timePlayed)}</td>
                
                {/* PTS adoucis : text-gray-100 et text-base au lieu d'un gros titre */}
                <td className="text-center p-3.5 border-b border-muted-line/40 font-bold text-base text-gray-100">{pts}</td>
                
                <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-500 text-[0.8rem]">{fgm}/{fga}</td>
                <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-500 text-[0.8rem]">{fg3m}/{fg3a}</td>
                <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-500 text-[0.8rem]">{ftm}/{fta}</td>
                
                {courtSize === 5 && <td className={`text-center p-3.5 border-b border-muted-line/40 font-semibold ${pmColor}`}>{pm > 0 ? `+${pm}` : pm}</td>}
                {courtSize !== 1 && <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-200 font-semibold">{ast}</td>}
                
                <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-500 text-[0.8rem]">{oreb}</td>
                <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-500 text-[0.8rem]">{dreb}</td>
                
                <td className="text-center p-3.5 border-b border-muted-line/40 font-semibold text-gray-200">{reb}</td>
                <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-200 font-semibold">{stl}</td>
                <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-200 font-semibold">{blk}</td>
                
                <td className="text-center p-3.5 border-b border-muted-line/40 text-gray-400">{tov}</td>
                <td className={`text-center p-3.5 border-b border-muted-line/40 ${isExcluded ? "text-rose-400 font-bold" : "text-gray-400"}`}>{fouls}</td>
                <td className={`text-center p-3.5 border-b border-muted-line/40 font-bold text-base ${effColor}`}>{eff}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default BoxscoreTable;