import React, { useMemo } from 'react';

export default function TournamentStats({ tourney }) {
  // 🚀 OPTIMISATION MAJEURE : On calcule les stats 1 SEULE FOIS pour tout l'onglet !
  const playerStats = useMemo(() => {
    const statsMap = {};
    // 🚀 V2 : On utilise le tableau unifié contenant poules ET playoffs
    const allMatches = (tourney.matches || []).filter(m => 
      m.status === 'finished' && 
      (m.saved_stats_a || m.savedStatsA) && 
      (m.saved_stats_b || m.savedStatsB)
    );

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
      const statsA = match.saved_stats_a || match.savedStatsA;
      const statsB = match.saved_stats_b || match.savedStatsB;
      const teamA = match.team_a || match.teamA;
      const teamB = match.team_b || match.teamB;

      processTeam(statsA, teamA?.name);
      processTeam(statsB, teamB?.name);
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

  // Fonction d'affichage des classements (Top 5) PREMIUM
  const renderTop5 = (title, players, sortKey, displayKey, color, suffix = "") => {
    const top5 = [...players].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 5);
    
    return (
      <div className="bg-app-panel/80 backdrop-blur-md rounded-2xl p-6 border border-muted-line shadow-xl relative overflow-hidden flex flex-col group hover:-translate-y-1 hover:border-muted transition-all duration-300">
        {/* Ligne lumineuse décorative utilisant la couleur passée en paramètre */}
        <div className="absolute top-0 left-0 right-0 h-1 opacity-90 shadow-sm" style={{ backgroundColor: color }}></div>
        
        <h3 className="m-0 mb-6 text-center text-sm font-black uppercase tracking-widest" style={{ color: color }}>
          {title}
        </h3>
        
        {top5.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 opacity-50 flex-1">
            <span className="text-3xl mb-3">📭</span>
            <p className="text-center text-muted font-bold text-xs uppercase tracking-wider m-0">Aucune donnée</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            {top5.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center py-3 border-b border-muted-line last:border-0 hover:bg-white/5 transition-colors -mx-2 px-2 rounded-lg">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="font-black text-lg w-5 text-right shrink-0" style={{ color: i === 0 ? color : '#888888' }}>
                    {i + 1}.
                  </span>
                  <div className="flex flex-col truncate">
                    <span className={`font-bold text-sm truncate ${i === 0 ? 'text-white' : 'text-muted-light'}`}>
                      {p.name}
                    </span>
                    <span className="text-[10px] text-muted font-bold tracking-wider uppercase truncate">
                      {p.teamName} • {p.gamesPlayed} match{p.gamesPlayed > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-end bg-app-input px-3 py-1.5 rounded-lg border border-muted-line shadow-inner shrink-0 ml-3">
                  <strong className="text-white text-xl leading-none font-black">{p[displayKey]}</strong>
                  {suffix && <span className="text-[10px] text-muted ml-1 mb-0.5 font-bold uppercase tracking-wider">{suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-4 w-full flex-1 flex flex-col box-border">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-muted-line pb-5 w-full text-left">
        <h2 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">📈</span> 
          Leaderboards
        </h2>
        <p className="mt-2 text-muted font-medium text-sm text-left">
          Classement général des meilleurs joueurs basé sur les statistiques des matchs terminés.
        </p>
      </div>

      {/* GRILLE DES STATS */}
      {/* ⚠️ J'ai remplacé les CSS variables par tes nouvelles couleurs du dictionnaire (valeurs HEX directes) car le composant s'attend à recevoir la couleur via un attribut `style` */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {renderTop5("🌟 MVP (Meilleure Éval)", playerStats, "eff", "eff", "#f97316")} {/* secondary */}
        {renderTop5("🎯 Top Marqueurs", playerStats, "points", "points", "#ef4444", "pts")} {/* danger */}
        {renderTop5("🛡️ Top Rebondeurs", playerStats, "reb", "reb", "#3b82f6", "reb")} {/* action */}
        {renderTop5("🤝 Top Passeurs", playerStats, "ast", "ast", "#10b981", "ast")} {/* primary */}
        {renderTop5("🥷 Top Intercepteurs", playerStats, "stl", "stl", "#eab308", "stl")} {/* warning */}
        {renderTop5("🧱 Top Contreurs", playerStats, "blk", "blk", "#a855f7", "blk")} {/* violet neutre */}
        
        {/* Les pourcentages (Seulement si un certain volume de tirs a été pris) */}
        {renderTop5("🔥 Plus Adroit (Général)", playerStats.filter(p => p.fga >= 5), "fgPct", "fgPctDisplay", "#f43f5e")}
        {renderTop5("🎯 Sniper 2 Pts", playerStats.filter(p => p.fg2a >= 3), "fg2Pct", "fg2PctDisplay", "#10b981")}
        {renderTop5("🏹 Sniper 3 Pts", playerStats.filter(p => p.fg3a >= 3), "fg3Pct", "fg3PctDisplay", "#0ea5e9")}
        {renderTop5("⚖️ Métronome LF", playerStats.filter(p => p.fta >= 3), "ftPct", "ftPctDisplay", "#94a3b8")}
      </div>
      
    </div>
  );
}