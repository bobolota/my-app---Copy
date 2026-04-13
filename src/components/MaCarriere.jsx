import React, { useMemo, useState, useEffect } from 'react';

export default function MaCarriere({ userProfile, tournaments }) {
  const currentUserName = userProfile?.full_name || "";
  const currentUserId = userProfile?.id;
  
  // 👉 ON DÉCLARE LE FORMAT ICI EN PREMIER ! (ET UNE SEULE FOIS)
  const [activeFormat, setActiveFormat] = useState(5); // 5 = 5x5, 3 = 3x3, 1 = 1x1

  // 📡 NOTRE RADAR DE DÉBOGAGE :
  console.log("🔍 Données reçues par MaCarriere :", { 
    id: currentUserId, 
    nom: currentUserName, 
    nbTournois: tournaments?.length 
  });

  // 🔬 AUDIT CHIRURGICAL : On regarde exactement pourquoi les matchs sont rejetés
  useEffect(() => {
    if (!tournaments || tournaments.length === 0) return;
    
    console.log("--- DÉBUT DE L'AUDIT ---");
    tournaments.forEach((t, index) => {
      console.log(`🏆 Tournoi ${index + 1} (${t.name || 'Sans nom'}) :`);
      
      // Test Piste 1
      console.log(`  👉 Format en BDD :`, t.matchsettings?.courtSize, `| Attendu :`, activeFormat);
      
      const matches = t.matches || t.schedule || [];
      console.log(`  👉 Nombre de matchs trouvés : ${matches.length}`);
      
      matches.forEach((m, mIndex) => {
        // Test Piste 2
        console.log(`    🏀 Match ${mIndex + 1} - Statut :`, m.status);
        
        // Test Piste 3
        console.log(`    📊 Structure Stats A :`, Array.isArray(m.saved_stats_a) ? 'Tableau OK' : typeof m.saved_stats_a, m.saved_stats_a);
      });
    });
    console.log("--- FIN DE L'AUDIT ---");
  }, [tournaments, activeFormat]);

  // ==========================================
  // 🧠 LE MOTEUR DE CALCUL DES STATS (AVEC FILTRE ET ALIAS)
  // ==========================================
  const { careerStats, matchHistory } = useMemo(() => {
    let gp = 0, pts = 0, reb = 0, ast = 0, stl = 0, blk = 0;
    let maxPts = 0, maxReb = 0, maxAst = 0, maxStl = 0, maxBlk = 0, maxEff = 0;
    let totalEff = 0;
    const history = [];

    // Sécurité : si on n'a pas les données de base, on renvoie du vide
    if (!tournaments || tournaments.length === 0 || !currentUserId) {
        return { careerStats: { gp: 0 }, matchHistory: [] };
    }

    // 1️⃣ LE SCANNER GLOBAL : On dresse la liste de TOUS tes noms
    const myAliases = [currentUserName]; 
    tournaments.forEach(t => {
        if (t.teams) {
            t.teams.forEach(team => {
                team.players?.forEach(p => {
                    // 🛡️ CORRECTION 1v1 : On regarde p.profile_id MAIS AUSSI p.id
                    if ((p.profile_id === currentUserId || p.id === currentUserId) && !myAliases.includes(p.name)) {
                        myAliases.push(p.name);
                    }
                });
            });
        }
    });

    // 2️⃣ LE CALCUL DES STATS : On filtre par format
    tournaments.forEach(t => {
      const tFormat = Number(t.matchsettings?.courtSize) || 5; 
      if (tFormat !== activeFormat) return;

      // 🛡️ LE BOUCLIER ANTI-FANTÔME (Adapté pour le 1v1)
      const isOfficiallyInTournament = t.teams?.some(team => 
        team.players?.some(p => p.profile_id === currentUserId || p.id === currentUserId)
      );
      
      if (!isOfficiallyInTournament) return;

      // 🛡️ CORRECTION 2 : Le râteau absolu (On prend la V1 ET la V2)
      const allMatches = [
        ...(t.matches || []), 
        ...(t.matches ? [] : (t.schedule || [])), // Si 'matches' existe, on ignore l'ancien 'schedule'
        ...(t.matches ? [] : (t.playoffs?.matches || []))
      ];
      
      // ... la suite de ta boucle allMatches.forEach ...
      
      allMatches.forEach(m => {
        if (m.status !== 'finished') return;

        let myTeam = null;
        let opponentTeam = null; // 👈 NOUVEAU : On prépare la place pour l'adversaire
        let myStats = null;
        let isWin = false;
        let finalScore = "";

        // 🧠 LE MOTEUR ULTIME : On cherche par ID ou par Alias
        // 🧠 LE MOTEUR ULTIME : Adapté pour le 1v1
        const findMe = (p) => p.profile_id === currentUserId || p.id === currentUserId || myAliases.includes(p.name);

        // 🛡️ SÉCURITÉ ABSOLUE : On convertit en vrais nombres. 
        const calcScoreA = (m.saved_stats_a || m.savedStatsA || []).reduce((sum, p) => sum + (p.points || 0), 0);
        const calcScoreB = (m.saved_stats_b || m.savedStatsB || []).reduce((sum, p) => sum + (p.points || 0), 0);
        
        const finalScoreA = Number(m.score_a ?? m.scoreA ?? calcScoreA);
        const finalScoreB = Number(m.score_b ?? m.scoreB ?? calcScoreB);

        // Le joueur est-il dans l'équipe A ?
        const pInA = m.savedStatsA?.find(findMe) || m.saved_stats_a?.find(findMe);
        if (pInA) {
            myTeam = m.teamA || m.team_a; 
            opponentTeam = m.teamB || m.team_b; // 👈 L'adversaire est la B
            myStats = pInA;
            isWin = finalScoreA > finalScoreB;
            finalScore = `${finalScoreA} - ${finalScoreB}`;
        } else {
            // Ou dans l'équipe B ?
            const pInB = m.savedStatsB?.find(findMe) || m.saved_stats_b?.find(findMe);
            if (pInB) {
                myTeam = m.teamB || m.team_b;
                opponentTeam = m.teamA || m.team_a; // 👈 L'adversaire est la A
                myStats = pInB;
                isWin = finalScoreB > finalScoreA;
                finalScore = `${finalScoreB} - ${finalScoreA}`;
            }
        }

        // Si le joueur a participé à ce match
        if (myStats) {
            gp++;
                        
            pts += myStats.points || 0;
            const matchReb = (myStats.oreb || 0) + (myStats.dreb || 0);
            reb += matchReb;
            ast += myStats.ast || 0;
            stl += myStats.stl || 0;
            blk += myStats.blk || 0;

            const missedShots = ((myStats.fta || 0) - (myStats.ftm || 0)) + ((myStats.fg2a || 0) - (myStats.fg2m || 0)) + ((myStats.fg3a || 0) - (myStats.fg3m || 0));
            const matchEff = (myStats.points || 0) + matchReb + (myStats.ast || 0) + (myStats.stl || 0) + (myStats.blk || 0) - (myStats.tov || 0) - missedShots - (myStats.fouls || 0);
            totalEff += matchEff;

            // Records (Career Highs)
            if ((myStats.points || 0) > maxPts) maxPts = myStats.points || 0;
            if (matchReb > maxReb) maxReb = matchReb;
            if ((myStats.ast || 0) > maxAst) maxAst = myStats.ast || 0;
            if ((myStats.stl || 0) > maxStl) maxStl = myStats.stl || 0;
            if ((myStats.blk || 0) > maxBlk) maxBlk = myStats.blk || 0;
            if (matchEff > maxEff) maxEff = matchEff;

            // Historique pour l'affichage
            history.push({
                id: m.id,
                tourneyName: t.name,
                teamName: opponentTeam?.name || 'Adversaire inconnu', // 👈 ICI on met l'adversaire !
                isWin,
                finalScore,
                pts: myStats.points || 0,
                reb: matchReb,
                ast: myStats.ast || 0,
                eff: matchEff
            });
        }
      });
    });

    // Calcul des moyennes (arrondies à 1 décimale)
    const stats = gp > 0 ? {
        gp, pts, reb, ast, stl, blk, maxPts, maxReb, maxAst, maxStl, maxBlk, maxEff,
        ptsAvg: (pts / gp).toFixed(1),
        rebAvg: (reb / gp).toFixed(1),
        astAvg: (ast / gp).toFixed(1),
        stlAvg: (stl / gp).toFixed(1),
        blkAvg: (blk / gp).toFixed(1),
        effAvg: (totalEff / gp).toFixed(1)
    } : { gp: 0 };

    return { careerStats: stats, matchHistory: history.reverse() }; 

  }, [tournaments, currentUserName, currentUserId, activeFormat]);

  // ==========================================
  // 🎨 PETITS COMPOSANTS VISUELS PREMIUM
  // ==========================================
  const StatCard = ({ label, value, color }) => (
    <div className="bg-app-card p-5 rounded-2xl border border-muted-line flex-1 min-w-[140px] text-center shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-1 opacity-80" style={{ backgroundColor: color }}></div>
      <div className="text-[10px] text-muted mb-2 uppercase tracking-widest font-black group-hover:text-muted-light transition-colors">{label}</div>
      <div className="text-4xl font-black text-white drop-shadow-md">{value}</div>
    </div>
  );

  const SectionHeader = ({ title, icon }) => (
    <h3 className="text-white border-b border-muted-line pb-3 mt-12 mb-6 text-lg font-black flex items-center gap-3 uppercase tracking-widest">
      <span className="text-2xl drop-shadow-md">{icon}</span> {title}
    </h3>
  );

  // ==========================================
  // 💻 RENDU DE LA PAGE
  // ==========================================
  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1400px] mx-auto relative">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-muted-line pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">📊</span>
          Ma Carrière
        </h1>
        <p className="mt-2 text-muted font-medium text-sm text-left">
          Retrouve l'intégralité de tes statistiques, tes records personnels et ton historique de matchs.
        </p>
      </div>
      
      <div className="bg-app-panel/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-muted-line shadow-2xl relative overflow-hidden flex-1 flex flex-col">
        
        {/* Un petit fond stylé */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 opacity-50 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex-1 flex flex-col">
            
          {/* L'en-tête du profil PREMIUM (VERSION COMPACTE) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 bg-app-card/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-muted-line shadow-xl relative overflow-hidden mb-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-[60px] pointer-events-none"></div>
              
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-secondary-dark to-warning flex items-center justify-center text-3xl font-black text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border-2 border-muted-line shrink-0 z-10">
                  {currentUserName.charAt(0).toUpperCase()}
              </div>
              
              <div className="text-center sm:text-left z-10 flex-1 w-full">
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 mb-3">
                    <h2 className="text-2xl sm:text-3xl font-black text-white m-0 tracking-wide">{currentUserName}</h2>
                    <span className="text-secondary font-black tracking-widest text-[9px] uppercase bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                      PROFIL OFFICIEL
                    </span>
                  </div>
                  
                  {/* LE SÉLECTEUR D'ONGLETS INTÉGRÉ AU PROFIL */}
                  <div className="flex bg-app-input border border-muted-line rounded-xl overflow-hidden shadow-inner w-full sm:w-fit mx-auto sm:mx-0">
                    {[
                      { val: 5, label: "5x5 CLASSIC" },
                      { val: 3, label: "3x3 STREET" },
                      { val: 1, label: "1v1 DUEL" }
                    ].map(tab => (
                      <button
                        key={tab.val}
                        onClick={() => setActiveFormat(tab.val)}
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 font-black text-[10px] sm:text-xs tracking-widest transition-all ${
                          activeFormat === tab.val
                            ? 'bg-gradient-to-r from-secondary to-danger text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                            : 'text-muted hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
              </div>
          </div>

          {/* CONTENU CONDITIONNEL : A-t-il des stats dans ce format ? */}
          {!careerStats || careerStats.gp === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 py-24 relative z-10 text-center flex-1">
              <span className="text-6xl mb-6 drop-shadow-2xl">👟</span>
              <h3 className="text-white text-2xl font-black mb-3 tracking-wide">Aucune statistique en {activeFormat}x{activeFormat}</h3>
              <p className="text-muted text-sm font-medium max-w-md leading-relaxed m-0">
                Joue ton premier match dans ce format et assure-toi que la table de marque enregistre les stats pour les voir ici !
              </p>
            </div>
          ) : (
            <>
              {/* Le petit résumé des totaux rapides */}
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start mt-6">
                  <span className="bg-app-input border border-muted-line px-4 py-2 rounded-xl text-xs font-black tracking-widest text-muted shadow-inner">
                    <span className="text-white text-sm mr-1">{careerStats.gp}</span> MATCHS JOUÉS
                  </span>
                  <span className="bg-app-input border border-muted-line px-4 py-2 rounded-xl text-xs font-black tracking-widest text-muted shadow-inner">
                    <span className="text-primary text-sm mr-1">{matchHistory.filter(m=>m.isWin).length}</span> VICTOIRES
                  </span>
              </div>

              {/* SECTION 1 : MOYENNES */}
              <SectionHeader title="Moyennes par match" icon="🎯" />
              <div className="flex flex-wrap gap-4">
                <StatCard label="PTS / m" value={careerStats.ptsAvg} color="#ef4444" />
                <StatCard label="REB / m" value={careerStats.rebAvg} color="#3b82f6" />
                <StatCard label="AST / m" value={careerStats.astAvg} color="#10b981" />
                <StatCard label="STL / m" value={careerStats.stlAvg} color="#f59e0b" />
                <StatCard label="BLK / m" value={careerStats.blkAvg} color="#a855f7" />
                <StatCard label="ÉVAL / m" value={careerStats.effAvg} color="#f97316" />
              </div>

              {/* SECTION 2 : RECORDS */}
              <SectionHeader title="Records sur 1 match (Career Highs)" icon="🚀" />
              <div className="flex flex-wrap gap-4">
                <StatCard label="Max PTS" value={careerStats.maxPts} color="#ef4444" />
                <StatCard label="Max REB" value={careerStats.maxReb} color="#3b82f6" />
                <StatCard label="Max AST" value={careerStats.maxAst} color="#10b981" />
                <StatCard label="Max STL" value={careerStats.maxStl} color="#f59e0b" />
                <StatCard label="Max BLK" value={careerStats.maxBlk} color="#a855f7" />
                <StatCard label="Max ÉVAL" value={careerStats.maxEff} color="#f97316" />
              </div>

              {/* SECTION 3 : HISTORIQUE DES MATCHS */}
              <SectionHeader title={`Derniers matchs joués (${activeFormat}x${activeFormat})`} icon="📅" />
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 pb-4">
                  {matchHistory.map((m, i) => (
                      <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-app-card border border-muted-line p-4 sm:p-5 rounded-2xl hover:border-muted transition-all gap-4 group hover:-translate-y-0.5 shadow-lg">
                          
                          <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md border border-muted-line shrink-0 ${m.isWin ? 'bg-gradient-to-tr from-primary to-primary-dark shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-tr from-danger to-danger-dark shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}>
                                  {m.isWin ? 'W' : 'L'}
                              </div>
                              <div className="flex flex-col">
                                  <div className="text-white font-black text-lg tracking-wide group-hover:text-secondary-light transition-colors">{m.teamName}</div>
                                  <div className="text-muted text-[10px] font-bold tracking-widest uppercase mt-1 flex flex-wrap items-center gap-2">
                                      <span>🏆 {m.tourneyName}</span>
                                      <span className="w-1 h-1 rounded-full bg-muted-dark hidden sm:block"></span>
                                      <span className="bg-app-input px-2 py-0.5 rounded border border-muted-line">Score: <b className="text-muted-light">{m.finalScore}</b></span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex gap-2 sm:gap-4 bg-app-input px-4 py-2.5 rounded-xl border border-muted-line w-full sm:w-auto justify-between sm:justify-start shadow-inner">
                              <div className="flex flex-col items-center min-w-[40px]">
                                  <span className="text-[10px] text-muted-dark font-black tracking-widest">PTS</span>
                                  <span className="text-white font-black text-sm">{m.pts}</span>
                              </div>
                              <div className="flex flex-col items-center min-w-[40px]">
                                  <span className="text-[10px] text-muted-dark font-black tracking-widest">REB</span>
                                  <span className="text-white font-black text-sm">{m.reb}</span>
                              </div>
                              <div className="flex flex-col items-center min-w-[40px]">
                                  <span className="text-[10px] text-muted-dark font-black tracking-widest">AST</span>
                                  <span className="text-white font-black text-sm">{m.ast}</span>
                              </div>
                              <div className="flex flex-col items-center min-w-[40px] pl-2 sm:pl-4 border-l border-muted-line">
                                  <span className="text-[10px] text-secondary font-black tracking-widest">ÉVAL</span>
                                  <span className="text-secondary font-black text-sm drop-shadow-md">{m.eff}</span>
                              </div>
                          </div>

                      </div>
                  ))}
              </div>
            </>
          )}
          
        </div>
      </div>
    </div>
  );
}