import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Notre Hook prend la "session" en paramètre pour savoir qui est connecté
export function useDashboardData(session) {
  // 1. On déclare toutes les variables d'état (Tes anciens useState)
  const [myTeams, setMyTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [careerStats, setCareerStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2. Ta grosse fonction de calcul de stats (inchangée)
  const calculateStats = (playerId, tourneys) => {
    let stats = { gp: 0, pts: 0, reb: 0, ast: 0, blk: 0, stl: 0, tov: 0, fgm: 0, fga: 0, ftm: 0, fta: 0, maxPts: 0, maxReb: 0, maxAst: 0, maxStl: 0, maxBlk: 0, maxEff: 0 };
    tourneys.forEach(tourney => {
      const matches = [...(tourney.schedule || []), ...(tourney.playoffs?.matches || [])];
      matches.forEach(m => {
        if (m.status === 'finished' && m.savedStatsA && m.savedStatsB) {
          const pStat = [...m.savedStatsA, ...m.savedStatsB].find(p => p.id === playerId);
          if (pStat && (pStat.timePlayed > 0 || pStat.points > 0 || pStat.fouls > 0)) {
            stats.gp += 1;
            stats.pts += (pStat.points || 0);
            const matchReb = (pStat.oreb || 0) + (pStat.dreb || 0);
            stats.reb += matchReb; stats.ast += (pStat.ast || 0); stats.blk += (pStat.blk || 0); stats.stl += (pStat.stl || 0); stats.tov += (pStat.tov || 0);
            const matchFgm = (pStat.fg2m || 0) + (pStat.fg3m || 0); const matchFga = (pStat.fg2a || 0) + (pStat.fg3a || 0);
            stats.fgm += matchFgm; stats.fga += matchFga; stats.ftm += (pStat.ftm || 0); stats.fta += (pStat.fta || 0);
            const matchMissedFG = matchFga - matchFgm; const matchMissedFT = (pStat.fta || 0) - (pStat.ftm || 0);
            const matchEff = ((pStat.points || 0) + matchReb + (pStat.ast || 0) + (pStat.stl || 0) + (pStat.blk || 0)) - (matchMissedFG + matchMissedFT + (pStat.tov || 0));
            if ((pStat.points || 0) > stats.maxPts) stats.maxPts = (pStat.points || 0); if (matchReb > stats.maxReb) stats.maxReb = matchReb;
            if ((pStat.ast || 0) > stats.maxAst) stats.maxAst = (pStat.ast || 0); if ((pStat.stl || 0) > stats.maxStl) stats.maxStl = (pStat.stl || 0);
            if ((pStat.blk || 0) > stats.maxBlk) stats.maxBlk = (pStat.blk || 0); if (matchEff > stats.maxEff) stats.maxEff = matchEff;
          }
        }
      });
    });
    const missedFG = stats.fga - stats.fgm; const missedFT = stats.fta - stats.ftm;
    stats.eff = (stats.pts + stats.reb + stats.ast + stats.stl + stats.blk) - (missedFG + missedFT + stats.tov);
    if (stats.gp > 0) {
      stats.ptsAvg = (stats.pts / stats.gp).toFixed(1); stats.rebAvg = (stats.reb / stats.gp).toFixed(1); stats.astAvg = (stats.ast / stats.gp).toFixed(1);
      stats.stlAvg = (stats.stl / stats.gp).toFixed(1); stats.blkAvg = (stats.blk / stats.gp).toFixed(1); stats.effAvg = (stats.eff / stats.gp).toFixed(1);
    } else {
      stats.ptsAvg = "0.0"; stats.rebAvg = "0.0"; stats.astAvg = "0.0"; stats.stlAvg = "0.0"; stats.blkAvg = "0.0"; stats.effAvg = "0.0";
    }
    return stats;
  };

  // 3. Ta grosse fonction de téléchargement (inchangée)
  const fetchData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profileData) setUserProfile(profileData);

      const { data: memberData, error: memberError } = await supabase.from('team_members').select('status, global_teams (*)').eq('player_id', session.user.id);
      if (memberError) throw memberError;
      setMyTeams(memberData || []);

      const { data: teamsData, error: teamsError } = await supabase.from('global_teams').select('*').order('created_at', { ascending: false });
      if (teamsError) throw teamsError;
      setAllTeams(teamsData || []);

      const { data: playersData, error: playersError } = await supabase.from('profiles').select('id, full_name, position, city').order('full_name');
      if (!playersError) setAllPlayers(playersData || []);

      const { data: tourneysData, error: tourneysError } = await supabase.from('tournaments')
        .select('id, name, status, date, teams, schedule, playoffs, organizer_id, otm_ids, pin_code, matchsettings')
        .in('status', ['preparing', 'ongoing', 'finished']);
      
      if (tourneysError) throw tourneysError;
      if (tourneysData) {
        setAllTournaments(tourneysData);
        setCareerStats(calculateStats(session.user.id, tourneysData));
      }
    } catch (error) {
      console.error("Erreur téléchargement :", error);
    } finally {
      setLoading(false);
    }
  };

  // 4. On lance la recherche au chargement
  useEffect(() => {
    fetchData();
  }, [session]);

  // 👇 L'ÉTAPE MAGIQUE : On renvoie toutes les données sous forme de "pack"
  // On renvoie aussi "fetchData" (qu'on renomme "refetch") pour pouvoir recharger la page si on s'inscrit à un tournoi !
  return { 
    myTeams, 
    allTeams, 
    allPlayers, 
    allTournaments, 
    userProfile, 
    careerStats, 
    loading, 
    refetch: fetchData // On exporte la fonction de téléchargement
  };
}