import React, { useMemo } from 'react';

export default function TournamentStats({ tourney }) {
  // 🚀 OPTIMISATION MAJEURE : On calcule les stats 1 SEULE FOIS pour tout l'onglet !
  const playerStats = useMemo(() => {
    const statsMap = {};
    const allMatches = [
      ...(tourney.schedule || []),
      ...(tourney.playoffs?.matches || [])
    ].filter(m => m.status === 'finished' && m.savedStatsA && m.savedStatsB);

    const processTeam = (players, teamName) => {
      if (!players) return;
      players.forEach(p => {
        const hasPlayed = p.timePlayed > 0 || p.points > 0 || p.fouls > 0 || p.ast > 0 || p.oreb > 0 || p.dreb > 0 || p.stl > 0 || p.blk > 0 || p.fg2a > 0 || p.fg3a > 0 || p.fta > 0 || p.tov > 0;
        
        if (hasPlayed) {
          if (!statsMap[p.id]) {
            statsMap[p.id] = {
              id: p.id, name: p.name, number: p.number, teamName: teamName,
              gamesPlayed: 0, points: 0, ast: 0, oreb: 0, dreb: 0, stl: 0, blk: 0, tov: 0, fouls: 0,
              fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0
            };
          }
          const s = statsMap[p.id];
          s.gamesPlayed += 1;
          s.points += (p.points || 0);
          s.ast += (p.ast || 0);
          s.oreb += (p.oreb || 0);
          s.dreb += (p.dreb || 0);
          s.stl += (p.stl || 0);
          s.blk += (p.blk || 0);
          s.tov += (p.tov || 0);
          s.fouls += (p.fouls || 0);
          s.fg2m += (p.fg2m || 0); s.fg2a += (p.fg2a || 0);
          s.fg3m += (p.fg3m || 0); s.fg3a += (p.fg3a || 0);
          s.ftm += (p.ftm || 0); s.fta += (p.fta || 0);
        }
      });
    };

    allMatches.forEach(match => {
      processTeam(match.savedStatsA, match.teamA?.name);
      processTeam(match.savedStatsB, match.teamB?.name);
    });

    return Object.values(statsMap).map(s => {
      s.reb = s.oreb + s.dreb;
      const fgm = s.fg2m + s.fg3m;
      const fga = s.fg2a + s.fg3a;
      const missedFG = fga - fgm;
      const missedFT = s.fta - s.ftm;
      
      s.eff = (s.points + s.reb + s.ast + s.stl + s.blk) - (missedFG + missedFT + s.tov);
      s.ptsAvg = (s.points / s.gamesPlayed).toFixed(1);
      s.rebAvg = (s.reb / s.gamesPlayed).toFixed(1);
      s.astAvg = (s.ast / s.gamesPlayed).toFixed(1);
      s.effAvg = (s.eff / s.gamesPlayed).toFixed(1);

      s.fgPct = fga > 0 ? parseFloat(((fgm / fga) * 100).toFixed(1)) : 0;
      s.fg2Pct = s.fg2a > 0 ? parseFloat(((s.fg2m / s.fg2a) * 100).toFixed(1)) : 0;
      s.fg3Pct = s.fg3a > 0 ? parseFloat(((s.fg3m / s.fg3a) * 100).toFixed(1)) : 0;
      s.ftPct = s.fta > 0 ? parseFloat(((s.ftm / s.fta) * 100).toFixed(1)) : 0;

      s.fgPctDisplay = s.fgPct > 0 ? `${s.fgPct}%` : '0%';
      s.fg2PctDisplay = s.fg2Pct > 0 ? `${s.fg2Pct}%` : '0%';
      s.fg3PctDisplay = s.fg3Pct > 0 ? `${s.fg3Pct}%` : '0%';
      s.ftPctDisplay = s.ftPct > 0 ? `${s.ftPct}%` : '0%';

      s.fga = fga;

      return s;
    });
  }, [tourney]); // Le calcul ne se refait que si l'objet 'tourney' change.

  // Fonction d'affichage des classements (Top 5)
  const renderTop5 = (title, players, sortKey, displayKey, color, suffix = "") => {
    const top5 = [...players].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 5);
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333] shadow-md flex-1 min-w-[280px] transition-transform hover:-translate-y-1">
        <h3 className="text-center pb-3 mb-4 text-lg font-bold" style={{ color: color, borderBottom: `2px solid ${color}` }}>
          {title}
        </h3>
        
        {top5.length === 0 ? (
          <p className="text-center text-[#666] italic py-4">Aucune donnée disponible</p>
        ) : (
          <div className="flex flex-col">
            {top5.map((p, i) => (
              <div key={p.id} className={`flex justify-between items-center py-2.5 ${i < 4 ? 'border-b border-[#222]' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg w-5 text-right" style={{ color: i === 0 ? color : '#666' }}>
                    {i + 1}.
                  </span>
                  <div className="flex flex-col">
                    <span className={`font-bold ${i === 0 ? 'text-white' : 'text-[#ccc]'}`}>
                      {p.name}
                    </span>
                    <span className="text-[0.7rem] text-[#888]">
                      {p.teamName} • {p.gamesPlayed} match{p.gamesPlayed > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-end">
                  <strong className="text-white text-xl leading-none">{p[displayKey]}</strong>
                  {suffix && <span className="text-xs text-[#888] ml-1 mb-0.5">{suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tm-panel glass-effect p-5 sm:p-8 bg-[#111] rounded-xl border border-[#222]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-2">
        <h3 className="text-2xl text-white font-bold m-0">📈 Leaderboards du Tournoi</h3>
        <span className="text-sm text-[#888] font-bold tracking-wider uppercase">Statistiques basées sur les matchs terminés</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {renderTop5("🌟 MVP (Meilleure Évaluation)", playerStats, "eff", "eff", "var(--accent-orange)")}
        {renderTop5("🎯 Top Marqueurs (PTS)", playerStats, "points", "points", "#ff4444", "pts")}
        {renderTop5("🛡️ Top Rebondeurs", playerStats, "reb", "reb", "var(--accent-blue)", "reb")}
        {renderTop5("🤝 Top Passeurs", playerStats, "ast", "ast", "var(--success)", "ast")}
        {renderTop5("🥷 Top Intercepteurs", playerStats, "stl", "stl", "#f1c40f", "stl")}
        {renderTop5("🧱 Top Contreurs", playerStats, "blk", "blk", "var(--accent-purple)", "blk")}
        
        {/* Les pourcentages (Seulement si un certain volume de tirs a été pris) */}
        {renderTop5("🔥 Plus Adroit (Général)", playerStats.filter(p => p.fga >= 5), "fgPct", "fgPctDisplay", "#e74c3c")}
        {renderTop5("🎯 Sniper 2 Pts", playerStats.filter(p => p.fg2a >= 3), "fg2Pct", "fg2PctDisplay", "#2ecc71")}
        {renderTop5("🏹 Sniper 3 Pts", playerStats.filter(p => p.fg3a >= 3), "fg3Pct", "fg3PctDisplay", "#3498db")}
        {renderTop5("⚖️ Métronome Lancers Francs", playerStats.filter(p => p.fta >= 3), "ftPct", "ftPctDisplay", "#95a5a6")}
      </div>
    </div>
  );
}