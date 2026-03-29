// DEBUT DE LA MODIFICATION - NOUVEAU FICHIER : src/components/TournamentStats.jsx

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

  const renderTop5 = (title, players, sortKey, displayKey, color, suffix = "") => {
    const top5 = [...players].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 5);
    return (
      <div className="stat-card" style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', flex: '1', minWidth: '280px', border: '1px solid #333' }}>
        <h3 style={{ color: color, textAlign: 'center', borderBottom: `2px solid ${color}`, paddingBottom: '10px', marginBottom: '15px', fontSize: '1.1rem' }}>{title}</h3>
        {top5.length === 0 ? <p style={{textAlign:'center', color:'#666', fontStyle: 'italic'}}>Aucune donnée disponible</p> : 
          top5.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid #222' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: i === 0 ? color : '#666', width: '20px', textAlign: 'right' }}>{i + 1}.</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold', color: i === 0 ? 'white' : '#ccc' }}>{p.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#888' }}>{p.teamName} • {p.gamesPlayed} match{p.gamesPlayed > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <strong style={{ color: 'white', fontSize: '1.2rem' }}>{p[displayKey]}</strong>
                <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '4px' }}>{suffix}</span>
              </div>
            </div>
          ))
        }
      </div>
    );
  };

  return (
    <div className="tm-panel glass-effect">
      <div className="tm-flex-between" style={{ marginBottom: '20px' }}>
        <h3>📈 Leaderboards du Tournoi</h3>
        <span style={{ fontSize: '0.8rem', color: '#888' }}>Statistiques basées sur les matchs terminés</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {renderTop5("🌟 MVP (Meilleure Évaluation)", playerStats, "eff", "eff", "var(--accent-orange)")}
        {renderTop5("🎯 Top Marqueurs (PTS)", playerStats, "points", "points", "#ff4444", "pts")}
        {renderTop5("🛡️ Top Rebondeurs", playerStats, "reb", "reb", "var(--accent-blue)", "reb")}
        {renderTop5("🤝 Top Passeurs", playerStats, "ast", "ast", "var(--success)", "ast")}
        {renderTop5("🥷 Top Intercepteurs", playerStats, "stl", "stl", "#f1c40f", "stl")}
        {renderTop5("🧱 Top Contreurs", playerStats, "blk", "blk", "var(--accent-purple)", "blk")}
        
        {renderTop5("🔥 Plus Adroit (Général)", playerStats.filter(p => p.fga >= 5), "fgPct", "fgPctDisplay", "#e74c3c")}
        {renderTop5("🎯 Sniper 2 Pts", playerStats.filter(p => p.fg2a >= 3), "fg2Pct", "fg2PctDisplay", "#2ecc71")}
        {renderTop5("🏹 Sniper 3 Pts", playerStats.filter(p => p.fg3a >= 3), "fg3Pct", "fg3PctDisplay", "#3498db")}
        {renderTop5("⚖️ Métronome Lancers Francs", playerStats.filter(p => p.fta >= 3), "ftPct", "ftPctDisplay", "#95a5a6")}
      </div>
    </div>
  );
}

// FIN DE LA MODIFICATION