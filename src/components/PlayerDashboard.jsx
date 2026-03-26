import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function PlayerDashboard({ session, currentTab }) {
  const [myTeams, setMyTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCity, setNewTeamCity] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [careerStats, setCareerStats] = useState(null);
  const [allTournaments, setAllTournaments] = useState([]);

  const [managingTeam, setManagingTeam] = useState(null);
  const [roster, setRoster] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const [inviteTeamId, setInviteTeamId] = useState("");
  const [registerModalTourney, setRegisterModalTourney] = useState(null);
  const [selectedTeamToRegister, setSelectedTeamToRegister] = useState("");

  // NOUVEAU : LA RÈGLE DU CONTRAT EXCLUSIF 🏀
  // Vérifie si le joueur est actuellement validé dans au moins une équipe
  const hasTeam = myTeams.some(mt => mt.status === 'accepted');

  useEffect(() => {
    fetchData();
  }, []);

  const calculateStats = (playerId, tourneys) => {
    let stats = { gp: 0, pts: 0, reb: 0, ast: 0, blk: 0, stl: 0, tov: 0, fgm: 0, fga: 0, ftm: 0, fta: 0 };
    tourneys.forEach(tourney => {
      const matches = [...(tourney.schedule || []), ...(tourney.playoffs?.matches || [])];
      matches.forEach(m => {
        if (m.status === 'finished' && m.savedStatsA && m.savedStatsB) {
          const pStat = [...m.savedStatsA, ...m.savedStatsB].find(p => p.id === playerId);
          if (pStat && (pStat.timePlayed > 0 || pStat.points > 0 || pStat.fouls > 0)) {
            stats.gp += 1;
            stats.pts += (pStat.points || 0);
            stats.reb += ((pStat.oreb || 0) + (pStat.dreb || 0));
            stats.ast += (pStat.ast || 0);
            stats.blk += (pStat.blk || 0);
            stats.stl += (pStat.stl || 0);
            stats.tov += (pStat.tov || 0);
            stats.fgm += ((pStat.fg2m || 0) + (pStat.fg3m || 0));
            stats.fga += ((pStat.fg2a || 0) + (pStat.fg3a || 0));
            stats.ftm += (pStat.ftm || 0);
            stats.fta += (pStat.fta || 0);
          }
        }
      });
    });
    const missedFG = stats.fga - stats.fgm;
    const missedFT = stats.fta - stats.ftm;
    stats.eff = (stats.pts + stats.reb + stats.ast + stats.stl + stats.blk) - (missedFG + missedFT + stats.tov);
    return stats;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('status, global_teams (*)')
        .eq('player_id', session.user.id);
      if (memberError) throw memberError;
      setMyTeams(memberData || []);

      const { data: teamsData, error: teamsError } = await supabase
        .from('global_teams')
        .select('*')
        .order('created_at', { ascending: false });
      if (teamsError) throw teamsError;
      setAllTeams(teamsData || []);

      const { data: tourneysData, error: tourneysError } = await supabase
        .from('tournaments')
        .select('id, name, status, date, teams, schedule, playoffs');
      if (!tourneysError && tourneysData) {
        setAllTournaments(tourneysData);
        setCareerStats(calculateStats(session.user.id, tourneysData));
      }
    } catch (error) {
      console.error("Erreur :", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPlayer = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .ilike('full_name', `%${searchQuery}%`)
        .limit(10);
      if (!error) setSearchResults(data || []);
    } catch (error) {}
  };

  const viewPlayerProfile = (player) => {
    const pStats = calculateStats(player.id, allTournaments);
    setSelectedProfile({ ...player, stats: pStats });
    setInviteTeamId("");
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (hasTeam) return alert("Tu appartiens déjà à une équipe !"); // Sécurité
    if (!newTeamName.trim()) return;

    try {
      const { data: teamData, error: teamError } = await supabase
        .from('global_teams').insert([{ name: newTeamName, city: newTeamCity, captain_id: session.user.id }]).select().single();
      if (teamError) throw teamError;
      const { error: memberError } = await supabase
        .from('team_members').insert([{ team_id: teamData.id, player_id: session.user.id, status: 'accepted' }]);
      if (memberError) throw memberError;
      setNewTeamName(""); setNewTeamCity(""); fetchData(); 
      alert("Ton équipe a été créée avec succès !");
    } catch (error) { alert("Erreur : " + error.message); }
  };

  const handleJoinTeam = async (teamId) => {
    if (hasTeam) return alert("Tu es déjà engagé avec une autre équipe !"); // Sécurité
    
    try {
      const { error } = await supabase.from('team_members').insert([{ team_id: teamId, player_id: session.user.id, status: 'pending' }]);
      if (error && error.code === '23505') alert("Tu as déjà fait une demande pour cette équipe !");
      else if (!error) { alert("Demande envoyée !"); fetchData(); }
    } catch (error) {}
  };

  const handleInvitePlayer = async (playerId) => {
    if (!inviteTeamId) return alert("Sélectionne une équipe !");
    try {
      const { error } = await supabase.from('team_members').insert([{ team_id: inviteTeamId, player_id: playerId, status: 'invited' }]);
      if (error && error.code === '23505') alert("Ce joueur a déjà une interaction (invitation/candidature) avec cette équipe !");
      else if (!error) { alert("Offre envoyée !"); setSelectedProfile(null); }
    } catch (error) {}
  };

  const respondToInvite = async (teamId, accept) => {
    if (accept && hasTeam) return alert("Impossible d'accepter : tu es déjà dans une équipe !"); // Sécurité

    try {
      if (accept) {
        await supabase.from('team_members').update({ status: 'accepted' }).eq('team_id', teamId).eq('player_id', session.user.id);
        alert("Bienvenue dans l'équipe !");
      } else {
        await supabase.from('team_members').delete().eq('team_id', teamId).eq('player_id', session.user.id);
      }
      fetchData();
    } catch (error) {}
  };

  const openTeamManager = async (team) => {
    setManagingTeam(team);
    await loadRoster(team.id);
  };

  const loadRoster = async (teamId) => {
    try {
      const { data: members } = await supabase.from('team_members').select('status, player_id').eq('team_id', teamId);
      if (!members || members.length === 0) { setRoster([]); return; }
      const playerIds = members.map(m => m.player_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', playerIds);
      const fullRoster = members.map(m => {
        const profile = profiles.find(p => p.id === m.player_id);
        return { ...m, full_name: profile?.full_name || 'Joueur Inconnu' };
      });
      setRoster(fullRoster);
    } catch (error) {}
  };

  const acceptPlayer = async (playerId) => {
    await supabase.from('team_members').update({ status: 'accepted' }).eq('team_id', managingTeam.id).eq('player_id', playerId);
    setRoster(prev => prev.map(p => p.player_id === playerId ? { ...p, status: 'accepted' } : p));
  };

  const removePlayer = async (playerId, isSelfLeave = false) => {
    if (!window.confirm(isSelfLeave ? "Es-tu sûr de vouloir quitter cette équipe ?" : "Es-tu sûr de vouloir exclure ce joueur ?")) return;
    await supabase.from('team_members').delete().eq('team_id', managingTeam.id).eq('player_id', playerId);
    if (isSelfLeave) { setManagingTeam(null); fetchData(); } 
    else { setRoster(prev => prev.filter(p => p.player_id !== playerId)); }
  };

  const submitRegistration = async () => {
    if (!selectedTeamToRegister) return alert("Sélectionne une équipe !");
    try {
      const teamToReg = myTeams.find(mt => mt.global_teams.id === selectedTeamToRegister).global_teams;
      const { data: members } = await supabase.from('team_members').select('player_id').eq('team_id', selectedTeamToRegister).eq('status', 'accepted');
      let newPlayers = [];
      if (members && members.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', members.map(m => m.player_id));
        newPlayers = members.map((m, i) => ({
          id: m.player_id, name: profiles.find(p => p.id === m.player_id)?.full_name || "Joueur Inconnu",
          number: String(i + 4), licenseStatus: 'to_check', paid: 0, totalDue: 20
        }));
      }
      const newTeamObj = { id: "tm_" + Date.now(), global_id: teamToReg.id, name: teamToReg.name, players: newPlayers, groupId: null };
      await supabase.rpc('register_team_to_tournament', { t_id: registerModalTourney.id, new_team: newTeamObj });
      alert(`L'équipe ${teamToReg.name} est inscrite ! 🎉`);
      setRegisterModalTourney(null); setSelectedTeamToRegister(""); fetchData();
    } catch(err) {}
  };

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Chargement... 🏀</div>;

  const StatCard = ({ label, value, color }) => (
    <div style={{ background: '#222', padding: '15px', borderRadius: '8px', borderBottom: `3px solid ${color}`, flex: '1', minWidth: '100px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>{value}</div>
    </div>
  );

  const myTeamIds = myTeams.map(mt => mt.global_teams.id);
  const availableTeams = allTeams.filter(t => !myTeamIds.includes(t.id));
  const myCaptainTeams = myTeams.filter(mt => mt.global_teams.captain_id === session.user.id && mt.status === 'accepted').map(mt => mt.global_teams);
  
  const myAcceptedTeamIds = myTeams.filter(mt => mt.status === 'accepted').map(mt => mt.global_teams.id);
  const isRegisteredIn = (t) => t.teams && t.teams.some(team => myAcceptedTeamIds.includes(team.global_id));

  const publicTourneys = allTournaments.filter(t => t.status !== 'finished' && !isRegisteredIn(t));
  const registeredTourneys = allTournaments.filter(t => t.status !== 'finished' && isRegisteredIn(t));
  const finishedTourneys = allTournaments.filter(t => t.status === 'finished');

  // --- GESTION INTERNE D'UNE ÉQUIPE ---
  if (managingTeam) {
    const isCaptainView = managingTeam.captain_id === session.user.id;
    const pendingPlayers = roster.filter(p => p.status === 'pending');
    const acceptedPlayers = roster.filter(p => p.status === 'accepted');
    const invitedPlayers = roster.filter(p => p.status === 'invited');

    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
        <button onClick={() => { setManagingTeam(null); fetchData(); }} style={{ background: 'none', border: '1px solid #666', color: '#ccc', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px' }}>
          ⬅ RETOUR AU VESTIAIRE
        </button>
        <h1 style={{ color: 'var(--accent-blue)', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
          {isCaptainView ? '👑 Gestion' : '🏀 Équipe'} : {managingTeam.name}
        </h1>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '30px' }}>
          {isCaptainView && (
            <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#222', padding: '20px', borderRadius: '12px', border: '1px solid var(--accent-orange)' }}>
                <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-orange)' }}>⏳ Candidatures ({pendingPlayers.length})</h2>
                {pendingPlayers.length === 0 ? <p style={{ color: '#888', fontStyle: 'italic' }}>Aucune demande.</p> : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingPlayers.map(p => (
                    <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '12px', borderRadius: '6px' }}>
                      <strong>{p.full_name}</strong>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => acceptPlayer(p.player_id)} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>ACCEPTER</button>
                        <button onClick={() => removePlayer(p.player_id)} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>REFUSER</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div style={{ flex: '1', minWidth: '300px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
            <h2 style={{ margin: '0 0 20px 0', color: 'var(--success)' }}>✅ Effectif ({acceptedPlayers.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {acceptedPlayers.map(p => {
                const isMe = p.player_id === session.user.id;
                const isTheCaptain = p.player_id === managingTeam.captain_id;
                return (
                  <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '12px', borderRadius: '6px', borderLeft: '4px solid var(--success)' }}>
                    <strong style={{ color: isTheCaptain ? 'var(--accent-purple)' : 'white' }}>{p.full_name} {isTheCaptain && '👑'} {isMe && '(Toi)'}</strong>
                    {isCaptainView && !isTheCaptain && <button onClick={() => removePlayer(p.player_id)} style={{ background: 'transparent', color: '#888', border: '1px solid #444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Exclure</button>}
                    {!isCaptainView && isMe && <button onClick={() => removePlayer(p.player_id, true)} style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Quitter</button>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===============================================
  // AIGUILLAGE PRINCIPAL : SELON LE BOUTON DU MENU
  // ===============================================
  return (
    <div style={{ padding: '0px', maxWidth: '1200px', margin: '0 auto', color: 'white' }}>

      {/* --- ONGLET : VESTIAIRE --- */}
      {currentTab === 'vestiaire' && (
        <>
          <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>👟 Mon Vestiaire</h1>
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '30px' }}>
            
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333', marginBottom: '30px' }}>
                <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-blue)' }}>🛡️ Mes Équipes</h2>
                {myTeams.length === 0 ? (
                  <p style={{ color: '#888', fontStyle: 'italic' }}>Tu n'es dans aucune équipe.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {myTeams.map(mt => {
                      const team = mt.global_teams;
                      const isCaptain = team.captain_id === session.user.id;
                      
                      if (mt.status === 'invited') {
                        return (
                          <div key={team.id} style={{ background: '#222', padding: '15px', borderRadius: '8px', borderLeft: `4px solid var(--accent-purple)` }}>
                            <strong style={{ fontSize: '1.2rem', display: 'block' }}>{team.name}</strong>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-purple)' }}>✉️ Le capitaine t'invite !</span>
                            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                              <button 
                                onClick={() => respondToInvite(team.id, true)} 
                                disabled={hasTeam}
                                style={{ background: hasTeam ? '#444' : 'var(--success)', color: hasTeam ? '#888' : 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: hasTeam ? 'not-allowed' : 'pointer' }}
                              >
                                ACCEPTER
                              </button>
                              <button onClick={() => respondToInvite(team.id, false)} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>REFUSER</button>
                            </div>
                            {hasTeam && <span style={{ display: 'block', marginTop: '8px', fontSize: '0.75rem', color: 'var(--danger)' }}>Quitte d'abord ton équipe actuelle pour accepter.</span>}
                          </div>
                        );
                      }

                      const isPending = mt.status === 'pending';
                      return (
                        <div key={team.id} style={{ background: '#222', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${isPending ? 'var(--accent-orange)' : 'var(--success)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '1.2rem', display: 'block' }}>{team.name}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#888' }}>{team.city || 'Ville non renseignée'}</span>
                            </div>
                            {isCaptain && <span style={{ background: 'var(--accent-purple)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>CAPITAINE 👑</span>}
                          </div>
                          <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.85rem' }}>
                              {isPending ? <span style={{ color: 'var(--accent-orange)' }}>⏳ En attente...</span> : <span style={{ color: 'var(--success)' }}>✅ Validé</span>}
                            </div>
                            {!isPending && (
                              <button onClick={() => openTeamManager(team)} style={{ background: isCaptain ? 'var(--accent-blue)' : 'transparent', color: isCaptain ? 'white' : 'var(--accent-blue)', border: isCaptain ? 'none' : '1px solid var(--accent-blue)', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                {isCaptain ? "GÉRER" : "VOIR L'EFFECTIF"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: '1', minWidth: '300px' }}>
              {/* INTERDICTION DE CRÉER SI ON A DÉJÀ UNE ÉQUIPE */}
              {hasTeam ? (
                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px dashed var(--danger)', textAlign: 'center' }}>
                  <h2 style={{ margin: '0 0 10px 0', color: 'var(--danger)' }}>🚫 Contrat Exclusif</h2>
                  <p style={{ color: '#888', fontSize: '0.9rem' }}>Tu es actuellement engagé avec une franchise. Quitte ton équipe actuelle pour pouvoir en fonder une nouvelle.</p>
                </div>
              ) : (
                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px dashed #444' }}>
                  <h2 style={{ margin: '0 0 20px 0', color: 'white' }}>➕ Fonder une franchise</h2>
                  <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input type="text" placeholder="Nom de l'équipe (ex: Chicago Bulls)" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} />
                    <input type="text" placeholder="Ville (Optionnel)" value={newTeamCity} onChange={e => setNewTeamCity(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} />
                    <button type="submit" style={{ padding: '12px', borderRadius: '6px', background: 'var(--accent-orange)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>CRÉER MON ÉQUIPE</button>
                  </form>
                </div>
              )}
            </div>
            
          </div>
        </>
      )}

      {/* --- ONGLET : MERCATO --- */}
      {currentTab === 'mercato' && (
        <>
          <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>🤝 Le Mercato</h1>
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '30px' }}>
            
            <div style={{ flex: '1', minWidth: '300px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
              <h2 style={{ margin: '0 0 20px 0', color: 'var(--success)' }}>Chercher une équipe</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {availableTeams.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>Aucune équipe disponible.</p>
                ) : (
                  availableTeams.map(team => (
                    <div key={team.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '15px', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '1.1rem' }}>{team.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>{team.city}</span>
                      </div>
                      <button 
                        onClick={() => handleJoinTeam(team.id)} 
                        disabled={hasTeam}
                        style={{ 
                          background: hasTeam ? '#333' : 'transparent', 
                          border: `1px solid ${hasTeam ? '#444' : 'var(--success)'}`, 
                          color: hasTeam ? '#666' : 'var(--success)', 
                          padding: '6px 12px', borderRadius: '4px', cursor: hasTeam ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: '0.2s' 
                        }}
                      >
                        {hasTeam ? 'CONTRAT ACTIF' : 'POSTULER'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ flex: '1', minWidth: '300px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
              <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-purple)' }}>🔎 Scouter un joueur</h2>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input type="text" placeholder="Nom ou Prénom..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchPlayer()} style={{ flex: '1', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} />
                <button onClick={handleSearchPlayer} style={{ background: 'var(--accent-purple)', color: 'white', border: 'none', padding: '0 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>CHERCHER</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {searchResults.map(player => (
                  <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '12px', borderRadius: '6px' }}>
                    <strong style={{ color: 'white' }}>{player.full_name}</strong>
                    <button onClick={() => viewPlayerProfile(player)} style={{ background: 'transparent', color: 'var(--accent-purple)', border: '1px solid var(--accent-purple)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>VOIR LE PROFIL</button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}

      {/* --- ONGLET : CARRIÈRE --- */}
      {currentTab === 'carriere' && (
        <>
          <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>📊 Ma Carrière</h1>
          {careerStats && (
            <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid #333', marginTop: '30px' }}>
              {careerStats.gp === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic', margin: 0 }}>Joue ton premier match officiel pour voir tes stats s'afficher ici !</p>
              ) : (
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <StatCard label="Matchs" value={careerStats.gp} color="#666" />
                  <StatCard label="Total PTS" value={careerStats.pts} color="#ff4444" />
                  <StatCard label="Moy. PTS" value={(careerStats.pts / careerStats.gp).toFixed(1)} color="#ff8844" />
                  <StatCard label="Rebonds" value={careerStats.reb} color="var(--accent-blue)" />
                  <StatCard label="Passes" value={careerStats.ast} color="var(--success)" />
                  <StatCard label="MVP Éval." value={careerStats.eff} color="var(--accent-purple)" />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* --- ONGLET : EXPLORER --- */}
      {currentTab === 'explorer' && (
        <>
          <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>🌍 Explorer les tournois</h1>
          
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', marginTop: '30px', paddingBottom: '20px' }}>
            
            <div style={{ flex: '1', minWidth: '320px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
              <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-blue)', fontSize: '1.1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>🌍 Tournois Publics</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {publicTourneys.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun tournoi disponible.</p>
                ) : (
                  publicTourneys.map(t => (
                    <div key={t.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                      <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '15px' }}>📅 {t.date || 'Date non définie'}</span>
                      
                      {t.status === 'preparing' ? (
                        myCaptainTeams.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontStyle: 'italic' }}>Fonde une équipe pour t'inscrire.</span>
                        ) : (
                          <button onClick={() => setRegisterModalTourney(t)} style={{ width: '100%', background: 'transparent', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            S'INSCRIRE
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 'bold' }}>🏀 Tournoi en cours</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ flex: '1', minWidth: '320px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
              <h2 style={{ margin: '0 0 20px 0', color: 'var(--success)', fontSize: '1.1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>✅ Mes Tournois</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {registeredTourneys.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Tu n'es inscrit à aucun tournoi actif.</p>
                ) : (
                  registeredTourneys.map(t => (
                    <div key={t.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--success)' }}>
                      <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '15px' }}>📅 {t.date || 'Date non définie'}</span>
                      {t.status === 'ongoing' ? (
                         <span style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 'bold' }}>🔥 EN JEU</span>
                      ) : (
                         <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold' }}>🗓️ En attente du tirage</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ flex: '1', minWidth: '320px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#888', fontSize: '1.1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>🏁 Tournois Terminés</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {finishedTourneys.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun historique.</p>
                ) : (
                  finishedTourneys.map(t => {
                    const iParticipated = isRegisteredIn(t);
                    return (
                      <div key={t.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333', opacity: 0.8 }}>
                        <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '10px' }}>📅 {t.date || 'Date non définie'}</span>
                        {iParticipated && <span style={{ fontSize: '0.75rem', background: '#333', color: 'white', padding: '3px 8px', borderRadius: '4px' }}>Tu as participé</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </>
      )}

      {/* --- MODAL GLOBALES (VISIBLES PARTOUT) --- */}
      {selectedProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '100%', border: '2px solid var(--accent-orange)', position: 'relative' }}>
            <button onClick={() => setSelectedProfile(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0, color: 'white', fontSize: '2rem', marginBottom: '5px' }}>{selectedProfile.full_name}</h2>
            <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedProfile.role}</span>
            <div style={{ marginTop: '25px' }}>
              {selectedProfile.stats.gp === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic' }}>Ce joueur n'a encore joué aucun match officiel.</p>
              ) : (
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <StatCard label="Matchs" value={selectedProfile.stats.gp} color="#666" />
                  <StatCard label="PTS" value={selectedProfile.stats.pts} color="#ff4444" />
                  <StatCard label="Moy." value={(selectedProfile.stats.pts / selectedProfile.stats.gp).toFixed(1)} color="#ff8844" />
                  <StatCard label="Éval." value={selectedProfile.stats.eff} color="var(--accent-purple)" />
                </div>
              )}
            </div>
            {myCaptainTeams.length > 0 && selectedProfile.id !== session.user.id && (
              <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 10px 0' }}>✉️ Recruter ce joueur</h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={inviteTeamId} onChange={e => setInviteTeamId(e.target.value)} style={{ flex: 1, padding: '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '6px' }}>
                    <option value="">-- Choisir mon équipe --</option>
                    {myCaptainTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button onClick={() => handleInvitePlayer(selectedProfile.id)} style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>INVITER</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {registerModalTourney && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '12px', maxWidth: '500px', width: '100%', border: '2px solid var(--accent-blue)', position: 'relative' }}>
            <button onClick={() => { setRegisterModalTourney(null); setSelectedTeamToRegister(""); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0, color: 'white', fontSize: '1.5rem' }}>S'inscrire au tournoi</h2>
            <h3 style={{ color: 'var(--accent-blue)', marginTop: 0 }}>{registerModalTourney.name}</h3>
            <div style={{ marginTop: '25px' }}>
              <label style={{ display: 'block', marginBottom: '10px', color: '#aaa', fontSize: '0.9rem' }}>Sélectionne l'équipe :</label>
              <select value={selectedTeamToRegister} onChange={e => setSelectedTeamToRegister(e.target.value)} style={{ width: '100%', padding: '12px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '6px', marginBottom: '20px' }}>
                <option value="">-- Choisir une équipe --</option>
                {myCaptainTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={submitRegistration} style={{ width: '100%', background: 'var(--success)', color: 'white', border: 'none', padding: '15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>VALIDER L'INSCRIPTION ✅</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}