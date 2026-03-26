import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import MaCarriere from './MaCarriere';
import ExplorerTournois from './ExplorerTournois';
import MonVestiaire from './MonVestiaire';
import Mercato from './Mercato';
import PlayerProfileModal from './PlayerProfileModal';
import TournamentRegistrationModal from './TournamentRegistrationModal';

export default function PlayerDashboard({ session, currentTab, setActiveTourneyId, setView }) {
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

  // NOUVEAU : États pour la modale de changement de capitaine
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedNewCaptainId, setSelectedNewCaptainId] = useState("");

  const hasTeam = false; 

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setManagingTeam(null);
  }, [currentTab]);

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
    if (!newTeamName.trim() || !newTeamCity.trim()) {
      return alert("Le nom ET la ville de l'équipe sont obligatoires !");
    }

    try {
      const { data: teamData, error: teamError } = await supabase
        .from('global_teams').insert([{ name: newTeamName, city: newTeamCity, captain_id: session.user.id }]).select().single();
      if (teamError) throw teamError;
      const { error: memberError } = await supabase
        .from('team_members').insert([{ team_id: teamData.id, player_id: session.user.id, status: 'accepted' }]);
      if (memberError) throw memberError;
      setNewTeamName(""); setNewTeamCity(""); fetchData(); 
      alert("Ton équipe a été créée avec succès ! 🎉");
    } catch (error) { alert("Erreur : " + error.message); }
  };

  const handleJoinTeam = async (teamId) => {
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

  // --- MODIFIÉ : FONCTION TRANSFERT AVEC MODALE ---
  const handleTransferCaptaincy = async () => {
    if (!selectedNewCaptainId) return alert("Sélectionne un joueur dans la liste !");
    
    const newCap = roster.find(p => p.player_id === selectedNewCaptainId);
    if (!window.confirm(`Es-tu sûr de vouloir léguer le rôle de Capitaine à ${newCap.full_name} ?\nTu deviendras un simple joueur et n'auras plus accès à la gestion de l'équipe.`)) return;
    
    try {
      const { error } = await supabase.from('global_teams').update({ captain_id: selectedNewCaptainId }).eq('id', managingTeam.id);
      if (error) throw error;
      
      alert(`${newCap.full_name} est le nouveau Capitaine de l'équipe ! 👑`);
      setManagingTeam({ ...managingTeam, captain_id: selectedNewCaptainId });
      setTransferModalOpen(false);
      setSelectedNewCaptainId("");
      fetchData();
    } catch (error) {
      alert("Erreur lors du transfert : " + error.message);
    }
  };

  const handleDeleteTeam = async () => {
    if (!window.confirm("🚨 ATTENTION : Es-tu sûr de vouloir DISSOUDRE définitivement cette équipe ?\n\nCette action va renvoyer tous les joueurs dans la section Mercato. (L'historique dans les anciens tournois sera conservé).")) return;
    
    try {
      const { error } = await supabase.from('global_teams').delete().eq('id', managingTeam.id);
      if (error) throw error;
      
      alert("L'équipe a été dissoute avec succès. 💥");
      setManagingTeam(null);
      fetchData();
    } catch (error) {
      alert("Erreur lors de la dissolution : " + error.message);
    }
  };
  // ---------------------------------------------

  const submitRegistration = async () => {
    if (!selectedTeamToRegister) return alert("Sélectionne une équipe !");
    try {
      const teamToReg = myTeams.find(mt => mt.global_teams.id === selectedTeamToRegister).global_teams;
      
      const { data: members } = await supabase.from('team_members').select('player_id').eq('team_id', selectedTeamToRegister).eq('status', 'accepted');
      
      let newPlayers = [];
      if (members && members.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', members.map(m => m.player_id));
        
        const existingTeams = registerModalTourney.teams || [];
        const alreadyRegisteredPlayerIds = new Set();
        existingTeams.forEach(t => {
            (t.players || []).forEach(p => alreadyRegisteredPlayerIds.add(p.id));
        });

        const overlappingMember = members.find(m => alreadyRegisteredPlayerIds.has(m.player_id));
        if (overlappingMember) {
            const badPlayerName = profiles?.find(p => p.id === overlappingMember.player_id)?.full_name || "Un joueur";
            alert(`Action impossible 🛑\n\n${badPlayerName} participe DÉJÀ à ce tournoi avec une autre équipe ! Un joueur ne peut pas affronter sa propre équipe.`);
            return;
        }

        newPlayers = members.map((m, i) => ({
          id: m.player_id, name: profiles.find(p => p.id === m.player_id)?.full_name || "Joueur Inconnu",
          number: String(i + 4), licenseStatus: 'to_check', paid: 0, totalDue: 20
        }));
      }

      const newTeamObj = { id: "tm_" + Date.now(), global_id: teamToReg.id, name: teamToReg.name, players: newPlayers, groupId: null };
      await supabase.rpc('register_team_to_tournament', { t_id: registerModalTourney.id, new_team: newTeamObj });
      
      alert(`L'équipe ${teamToReg.name} est inscrite ! 🎉`);
      setRegisterModalTourney(null); setSelectedTeamToRegister(""); fetchData();

    } catch(err) {
      console.error(err);
      alert("Une erreur s'est produite lors de l'inscription.");
    }
  };

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Chargement... 🏀</div>;

  const myTeamIds = myTeams.map(mt => mt.global_teams.id);
  const availableTeams = allTeams.filter(t => !myTeamIds.includes(t.id));
  const myCaptainTeams = myTeams.filter(mt => mt.global_teams.captain_id === session.user.id && mt.status === 'accepted').map(mt => mt.global_teams);

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
        
        {/* EN-TÊTE DE LA GESTION D'ÉQUIPE (Modifié avec le bouton unique pour le Capitaine) */}
        <h1 style={{ color: 'var(--accent-blue)', borderBottom: '2px solid #333', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span>{isCaptainView ? '👑 Gestion' : '🏀 Équipe'} : {managingTeam.name}</span>
          {isCaptainView && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {acceptedPlayers.length > 1 && (
                <button onClick={() => setTransferModalOpen(true)} style={{ background: 'transparent', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)', padding: '8px 15px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
                  👑 CHANGER DE CAPITAINE
                </button>
              )}
              <button onClick={handleDeleteTeam} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
                DISSOUDRE 💥
              </button>
            </div>
          )}
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
                  <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '12px', borderRadius: '6px', borderLeft: '4px solid var(--success)', flexWrap: 'wrap', gap: '10px' }}>
                    <strong style={{ color: isTheCaptain ? 'var(--accent-purple)' : 'white' }}>{p.full_name} {isTheCaptain && '👑'} {isMe && '(Toi)'}</strong>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* On a enlevé le bouton individuel de Nommer Cap. ici ! */}
                      {isCaptainView && !isTheCaptain && (
                        <button onClick={() => removePlayer(p.player_id)} style={{ background: 'transparent', color: '#888', border: '1px solid #444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Exclure</button>
                      )}
                      {!isCaptainView && isMe && <button onClick={() => removePlayer(p.player_id, true)} style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Quitter</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MODALE POUR LE CHANGEMENT DE CAPITAINE */}
        {transferModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid var(--accent-orange)', width: '90%', maxWidth: '400px' }}>
              <h3 style={{ marginTop: 0, color: 'var(--accent-orange)', borderBottom: '1px solid #333', paddingBottom: '10px' }}>👑 Nommer un nouveau Capitaine</h3>
              
              <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '0.85rem' }}>Sélectionner le joueur :</label>
              <select
                value={selectedNewCaptainId}
                onChange={(e) => setSelectedNewCaptainId(e.target.value)}
                style={{ width: '100%', marginBottom: '25px', padding: '10px', borderRadius: '6px', background: '#222', color: 'white', border: '1px solid #555' }}
              >
                <option value="">-- Choisir dans l'effectif --</option>
                {acceptedPlayers.filter(p => p.player_id !== session.user.id).map(p => (
                  <option key={p.player_id} value={p.player_id}>{p.full_name}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => { setTransferModalOpen(false); setSelectedNewCaptainId(""); }} style={{ background: '#333', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Annuler</button>
                <button onClick={handleTransferCaptaincy} style={{ padding: '10px 20px', fontSize: '1rem', background: 'var(--accent-orange)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Valider</button>
              </div>
            </div>
          </div>
        )}

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
        <MonVestiaire 
          session={session}
          myTeams={myTeams}
          hasTeam={hasTeam}
          respondToInvite={respondToInvite}
          openTeamManager={openTeamManager}
          handleCreateTeam={handleCreateTeam}
          newTeamName={newTeamName}
          setNewTeamName={setNewTeamName}
          newTeamCity={newTeamCity}
          setNewTeamCity={setNewTeamCity}
        />
      )}

      {/* --- ONGLET : MERCATO --- */}
      {currentTab === 'mercato' && (
        <Mercato 
          availableTeams={availableTeams}
          hasTeam={hasTeam}
          handleJoinTeam={handleJoinTeam}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearchPlayer={handleSearchPlayer}
          searchResults={searchResults}
          viewPlayerProfile={viewPlayerProfile}
        />
      )}

      {/* --- ONGLET : CARRIÈRE --- */}
      {currentTab === 'carriere' && <MaCarriere careerStats={careerStats} />}

      {/* --- ONGLET : EXPLORER --- */}
      {currentTab === 'explorer' && (
        <ExplorerTournois 
          session={session} 
          allTournaments={allTournaments} 
          myTeams={myTeams} 
          setRegisterModalTourney={setRegisterModalTourney} 
          setActiveTourneyId={setActiveTourneyId}
          setView={setView}
        />
      )}

      {/* --- MODALS (FENÊTRES POP-UP) --- */}
      <PlayerProfileModal 
        selectedProfile={selectedProfile}
        setSelectedProfile={setSelectedProfile}
        session={session}
        myCaptainTeams={myCaptainTeams}
        inviteTeamId={inviteTeamId}
        setInviteTeamId={setInviteTeamId}
        handleInvitePlayer={handleInvitePlayer}
      />

      <TournamentRegistrationModal 
        registerModalTourney={registerModalTourney}
        setRegisterModalTourney={setRegisterModalTourney}
        selectedTeamToRegister={selectedTeamToRegister}
        setSelectedTeamToRegister={setSelectedTeamToRegister}
        myCaptainTeams={myCaptainTeams}
        submitRegistration={submitRegistration}
      />
    </div>
  );
}