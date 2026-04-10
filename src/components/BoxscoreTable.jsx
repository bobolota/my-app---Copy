import React from 'react';

const BoxscoreTable = React.memo(({ title, players, color, courtSize = 5 }) => { 
  const formatPlayerTime = (sec) => {
    const safeSec = Number(sec) || 0;
    return `${Math.floor(safeSec / 60).toString().padStart(2, '0')}:${(safeSec % 60).toString().padStart(2, '0')}`;
  };

  if (!players) return null;

  return (
    // On met un fond très sombre avec une bordure subtile pour le contraste
    <div className="bg-[#1a1c23] rounded-xl border border-[#2d313f] shadow-xl overflow-hidden mb-8">
      
      {/* En-tête du tableau avec la couleur de l'équipe */}
      <div className="p-5 border-b border-[#2d313f] relative overflow-hidden">
        {/* Petite lueur colorée en fond si une couleur est fournie */}
        {color && (
            <div 
                className="absolute top-0 left-0 w-full h-1 opacity-80" 
                style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }}
            ></div>
        )}
        <h3 className="text-xl sm:text-2xl font-black tracking-wider text-white flex items-center gap-3 relative z-10 m-0">
          {/* Pastille de couleur (fallback orange si pas de couleur) */}
          <span 
            className="w-3 h-3 rounded-full inline-block shadow-md" 
            style={{ backgroundColor: color || '#f97316' }}
          ></span>
          {title}
        </h3>
      </div>

      <div className="overflow-x-auto custom-scrollbar pb-2">
        <table className="w-full text-center font-sans text-sm border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="text-left bg-[#252834] text-gray-300 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">N°</th>
              <th className="text-left bg-[#252834] text-gray-300 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23] sticky left-0 z-10">JOUEUR</th>
              <th className="bg-[#252834] text-gray-400 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">MIN</th>
              <th className="bg-[#2d313f] text-white text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">PTS</th>
              <th className="bg-[#252834] text-gray-400 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">TIRS</th>
              <th className="bg-[#252834] text-gray-400 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">3PT</th>
              <th className="bg-[#252834] text-gray-400 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">LF</th>
              {courtSize === 5 && <th className="bg-[#252834] text-gray-400 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">+/-</th>}
              {courtSize !== 1 && <th className="bg-[#252834] text-gray-300 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">AST</th>}
              <th className="bg-[#252834] text-gray-500 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">OREB</th>
              <th className="bg-[#252834] text-gray-500 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">DREB</th>
              <th className="bg-[#252834] text-gray-300 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">REB</th>
              <th className="bg-[#252834] text-gray-400 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">STL</th>
              <th className="bg-[#252834] text-gray-400 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">BLK</th>
              <th className="bg-[#252834] text-gray-400 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">TOV</th>
              <th className="bg-[#252834] text-gray-400 text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">FLS</th>
              <th className="bg-[#2d313f] text-white text-[0.7rem] sm:text-[0.8rem] tracking-widest font-black uppercase p-3 sm:p-4 border-b-2 border-[#1a1c23]">EFF</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, index) => {
              const pts = p.points || 0;
              const fg2m = p.fg2m || 0; const fg2a = p.fg2a || 0;
              const fg3m = p.fg3m || 0; const fg3a = p.fg3a || 0;
              const ftm = p.ftm || 0;   const fta = p.fta || 0;
              const ast = p.ast || 0;
              const oreb = p.oreb || 0; const dreb = p.dreb || 0;
              const stl = p.stl || 0;   const blk = p.blk || 0; 
              const tov = p.tov || 0;   const fouls = p.fouls || 0;
              const pm = p.plusMinus || 0;

              // Couleurs plus vives pour le +/-
              const pmColor = pm > 0 ? 'text-[#10b981]' : (pm < 0 ? 'text-[#ef4444]' : 'text-gray-500');
              const isExcluded = fouls >= 5 || (p.techFouls || 0) >= 2 || (p.antiFouls || 0) >= 2 || p.isDisqualified;
              const fgm = fg2m + fg3m; const fga = fg2a + fg3a;
              const reb = oreb + dreb;
              const missedFG = fga - fgm; const missedFT = fta - ftm;
              const eff = (pts + reb + ast + stl + blk) - (missedFG + missedFT + tov);

              // Alternance des lignes très subtile
              const rowClass = index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]';

              return (
                <tr key={p.id} className={`${rowClass} hover:bg-[#2d313f] transition-colors border-b border-[#252834]`}>
                  <td className="text-left p-3 sm:p-3.5 text-gray-400 font-bold">{p.number}</td>
                  
                  {/* Le nom reste affiché à gauche même si on scrolle sur mobile */}
                  <td className="text-left p-3 sm:p-3.5 font-bold text-gray-100 sticky left-0 z-10 bg-inherit whitespace-nowrap">
                    {p.name} 
                    {p.status === 'court' && <span className="text-[#f97316] font-black ml-1 text-xs align-top" title="Sur le terrain">*</span>}
                  </td>
                  
                  <td className="text-center p-3 sm:p-3.5 text-gray-400">{formatPlayerTime(p.timePlayed)}</td>
                  
                  {/* Colonne PTS en surbrillance constante */}
                  <td className="text-center p-3 sm:p-3.5 font-black text-[1.1rem] text-white bg-white/[0.03]">{pts}</td>
                  
                  <td className="text-center p-3 sm:p-3.5 text-gray-300">{fgm}/{fga}</td>
                  <td className="text-center p-3 sm:p-3.5 text-gray-300">{fg3m}/{fg3a}</td>
                  <td className="text-center p-3 sm:p-3.5 text-gray-300">{ftm}/{fta}</td>
                  
                  {courtSize === 5 && <td className={`text-center p-3 sm:p-3.5 font-black ${pmColor}`}>{pm > 0 ? `+${pm}` : pm}</td>}
                  {courtSize !== 1 && <td className="text-center p-3 sm:p-3.5 text-gray-200 font-bold">{ast}</td>}
                  
                  <td className="text-center p-3 sm:p-3.5 text-gray-500 text-xs">{oreb}</td>
                  <td className="text-center p-3 sm:p-3.5 text-gray-500 text-xs">{dreb}</td>
                  <td className="text-center p-3 sm:p-3.5 font-black text-gray-300">{reb}</td>
                  
                  <td className="text-center p-3 sm:p-3.5 text-gray-300">{stl}</td>
                  <td className="text-center p-3 sm:p-3.5 text-gray-300">{blk}</td>
                  <td className="text-center p-3 sm:p-3.5 text-gray-400">{tov}</td>
                  
                  <td className={`text-center p-3 sm:p-3.5 ${isExcluded ? "text-[#ef4444] font-black" : "text-gray-400"}`}>{fouls}</td>
                  
                  {/* Colonne EFF en surbrillance constante */}
                  <td className={`text-center p-3 sm:p-3.5 font-black text-[1.1rem] bg-white/[0.03] ${eff >= 15 ? 'text-[#f97316] drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : (eff < 0 ? 'text-[#ef4444]' : 'text-white')}`}>
                    {eff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default BoxscoreTable;