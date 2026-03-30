import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import MaCarriere from './MaCarriere';
import ExplorerTournois from './ExplorerTournois';
import MonVestiaire from './MonVestiaire';
import Mercato from './Mercato';
import PlayerProfileModal from './PlayerProfileModal';
import TournamentRegistrationModal from './TournamentRegistrationModal';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';

export default function PlayerDashboard() {
  const [myTeams, setMyTeams] = useState([]);
  const { session } = useAuth(); // Ça, c'est ce qu'on a fait tout à l'heure
  
  // 👇 NOUVEAU : On récupère les variables du Nuage Central
  const { activeMenu: currentTab, setActiveTourneyId, setView } = useAppContext();
  const [allTeams, setAllTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCity, setNewTeamCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [allPlayers, setAllPlayers] = useState([]); // NOUVEAU : La liste de tous les joueurs

  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const closeConfirm = () => setConfirmData(prev => ({ ...prev, isOpen: false }));

  const [promptData, setPromptData] = useState({ isOpen: false, title: '', message: '', placeholder: '', onConfirm: null });
  const closePrompt = () => setPromptData(prev => ({ ...prev, isOpen: false }));
  
  const [careerStats, setCareerStats] = useState(null);
  const [allTournaments, setAllTournaments] = useState([]);

  const [managingTeam, setManagingTeam] = useState(null);
  const [roster, setRoster] = useState([]);

  // --- NOUVEAU : On stocke le profil de l'utilisateur (dont son abonnement) ---
  const [userProfile, setUserProfile] = useState(null);
  // -------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const [inviteTeamId, setInviteTeamId] = useState("");
  const [registerModalTourney, setRegisterModalTourney] = useState(null);
  const [selectedTeamToRegister, setSelectedTeamToRegister] = useState("");

  // NOUVEAU : États pour la modale de changement de capitaine
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedNewCaptainId, setSelectedNewCaptainId] = useState("");

  // On compte dans combien d'équipes le joueur est déjà impliqué (accepté ou en attente)
  const activeTeamCount = myTeams.filter(t => t.status === 'accepted' || t.status === 'pending').length;
  // S'il atteint 3, la variable passe à TRUE et bloquera automatiquement les boutons "Postuler" et "Créer"
  const hasTeam = activeTeamCount >= 3;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setManagingTeam(null);
  }, [currentTab]);

  const calculateStats = (playerId, tourneys) => {
    let stats = { 
      gp: 0, pts: 0, reb: 0, ast: 0, blk: 0, stl: 0, tov: 0, fgm: 0, fga: 0, ftm: 0, fta: 0,
      maxPts: 0, maxReb: 0, maxAst: 0, maxStl: 0, maxBlk: 0, maxEff: 0 // Les records
    };
    
    tourneys.forEach(tourney => {
      const matches = [...(tourney.schedule || []), ...(tourney.playoffs?.matches || [])];
      matches.forEach(m => {
        if (m.status === 'finished' && m.savedStatsA && m.savedStatsB) {
          const pStat = [...m.savedStatsA, ...m.savedStatsB].find(p => p.id === playerId);
          if (pStat && (pStat.timePlayed > 0 || pStat.points > 0 || pStat.fouls > 0)) {
            stats.gp += 1;
            stats.pts += (pStat.points || 0);
            
            const matchReb = (pStat.oreb || 0) + (pStat.dreb || 0);
            stats.reb += matchReb;
            stats.ast += (pStat.ast || 0);
            stats.blk += (pStat.blk || 0);
            stats.stl += (pStat.stl || 0);
            stats.tov += (pStat.tov || 0);
            
            const matchFgm = (pStat.fg2m || 0) + (pStat.fg3m || 0);
            const matchFga = (pStat.fg2a || 0) + (pStat.fg3a || 0);
            stats.fgm += matchFgm;
            stats.fga += matchFga;
            
            stats.ftm += (pStat.ftm || 0);
            stats.fta += (pStat.fta || 0);

            // NOUVEAU : Traque des records sur 1 match !
            const matchMissedFG = matchFga - matchFgm;
            const matchMissedFT = (pStat.fta || 0) - (pStat.ftm || 0);
            const matchEff = ((pStat.points || 0) + matchReb + (pStat.ast || 0) + (pStat.stl || 0) + (pStat.blk || 0)) - (matchMissedFG + matchMissedFT + (pStat.tov || 0));

            if ((pStat.points || 0) > stats.maxPts) stats.maxPts = (pStat.points || 0);
            if (matchReb > stats.maxReb) stats.maxReb = matchReb;
            if ((pStat.ast || 0) > stats.maxAst) stats.maxAst = (pStat.ast || 0);
            if ((pStat.stl || 0) > stats.maxStl) stats.maxStl = (pStat.stl || 0);
            if ((pStat.blk || 0) > stats.maxBlk) stats.maxBlk = (pStat.blk || 0);
            if (matchEff > stats.maxEff) stats.maxEff = matchEff;
          }
        }
      });
    });
    
    const missedFG = stats.fga - stats.fgm;
    const missedFT = stats.fta - stats.ftm;
    stats.eff = (stats.pts + stats.reb + stats.ast + stats.stl + stats.blk) - (missedFG + missedFT + stats.tov);
    
    // NOUVEAU : Pré-calcul des moyennes
    if (stats.gp > 0) {
      stats.ptsAvg = (stats.pts / stats.gp).toFixed(1);
      stats.rebAvg = (stats.reb / stats.gp).toFixed(1);
      stats.astAvg = (stats.ast / stats.gp).toFixed(1);
      stats.stlAvg = (stats.stl / stats.gp).toFixed(1);
      stats.blkAvg = (stats.blk / stats.gp).toFixed(1);
      stats.effAvg = (stats.eff / stats.gp).toFixed(1);
    } else {
      stats.ptsAvg = "0.0"; stats.rebAvg = "0.0"; stats.astAvg = "0.0"; 
      stats.stlAvg = "0.0"; stats.blkAvg = "0.0"; stats.effAvg = "0.0";
    }

    return stats;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. On récupère le profil (pour vérifier s'il est PRO ou FREE)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (profileData) setUserProfile(profileData);

      // 2. On récupère les équipes de l'utilisateur
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('status, global_teams (*)')
        .eq('player_id', session.user.id);
      if (memberError) throw memberError;
      setMyTeams(memberData || []);

      // 👇 NOUVEAU : RESTAURATION DE L'ÉQUIPE OUVERTE APRÈS UN REFRESH 👇
      const savedTeamId = localStorage.getItem('managingTeamId');
      if (savedTeamId && memberData) {
        const savedTeam = memberData.find(mt => mt.global_teams && mt.global_teams.id === savedTeamId);
        if (savedTeam) {
          setManagingTeam(savedTeam.global_teams);
          loadRoster(savedTeam.global_teams.id); // <--- LA LIGNE MAGIQUE EST ICI !
        }
      }
      // 👆 ------------------------------------------------------------- 👆

      // 3. On récupère toutes les équipes globales
      const { data: teamsData, error: teamsError } = await supabase
        .from('global_teams')
        .select('*')
        .order('created_at', { ascending: false });
      if (teamsError) throw teamsError;
      setAllTeams(teamsData || []);

      // ---------------------------------------------------------
      // 👇 C'EST ICI QU'ON LE MET (L'ÉTAPE 3.5) 👇
      // ---------------------------------------------------------
      const { data: playersData, error: playersError } = await supabase
        .from('profiles')
        .select('id, full_name, position, city') /* 🛠️ CORRIGÉ ICI */
        .order('full_name');
      if (!playersError) setAllPlayers(playersData || []);
      // ---------------------------------------------------------

      // 4. On récupère les tournois pour l'onglet "Explorer"
      
      // 4. On récupère les tournois pour l'onglet "Explorer"
      const { data: tourneysData, error: tourneysError } = await supabase
        .from('tournaments')
        .select('id, name, status, date, teams, schedule, playoffs, organizer_id, otm_ids, pin_code')
        .in('status', ['preparing', 'ongoing', 'finished']); // 🛡️ ON NE PREND QUE CEUX-LÀ !
      
      if (tourneysError) throw tourneysError;
      
      if (tourneysData) {
        setAllTournaments(tourneysData);
        setCareerStats(calculateStats(session.user.id, tourneysData));
      }
      
    } catch (error) {
      console.error("Erreur lors du téléchargement des données :", error);
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

  const viewPlayerProfile = async (player) => {
    const pStats = calculateStats(player.id, allTournaments);
    
    let relationStatus = null;
    if (managingTeam && roster.length > 0) {
      const rosterEntry = roster.find(r => r.player_id === player.id);
      if (rosterEntry) relationStatus = rosterEntry.status;
    } else if (myCaptainTeams && myCaptainTeams.length > 0) {
      const teamIds = myCaptainTeams.map(t => t.id);
      const { data } = await supabase
        .from('team_members')
        .select('status')
        .eq('player_id', player.id)
        .in('team_id', teamIds)
        .limit(1);
        
      if (data && data.length > 0) relationStatus = data[0].status;
    }

    // 👇 NOUVEAU : On récupère la liste des équipes de CE joueur
    let playerTeams = [];
    const { data: ptData } = await supabase
      .from('team_members')
      .select('global_teams(name)')
      .eq('player_id', player.id)
      .eq('status', 'accepted');

    if (ptData) {
      playerTeams = ptData.map(d => d.global_teams).filter(Boolean); // On nettoie les données
    }
    // 👆 ----------------------------------------------------

    setSelectedProfile({ ...player, stats: pStats, relationStatus, playerTeams });
    setInviteTeamId("");
  };

  const handleCreateTeam = async (e) => {

if (hasTeam) return toast.error("Tu as atteint la limite de 3 équipes !");

    e.preventDefault();
    if (!newTeamName.trim() || !newTeamCity.trim()) {
      return toast.error("Le nom ET la ville de l'équipe sont obligatoires !");
    }

    try {
      const { data: teamData, error: teamError } = await supabase
        .from('global_teams').insert([{ name: newTeamName, city: newTeamCity, captain_id: session.user.id }]).select().single();
      if (teamError) throw teamError;
      const { error: memberError } = await supabase
        .from('team_members').insert([{ team_id: teamData.id, player_id: session.user.id, status: 'accepted' }]);
      if (memberError) throw memberError;
      setNewTeamName(""); setNewTeamCity(""); fetchData(); 
      toast.success("Ton équipe a été créée avec succès ! 🎉");
    } catch (error) { toast.error("Erreur : " + error.message); }
  };

  const handleJoinTeam = async (teamId) => {

    if (hasTeam) return toast.error("Tu as atteint la limite de 3 équipes !");

    try {
      const { error } = await supabase.from('team_members').insert([{ team_id: teamId, player_id: session.user.id, status: 'pending' }]);
      if (error && error.code === '23505') toast.error("Tu as déjà fait une demande pour cette équipe !");
      else if (!error) { toast.success("Demande envoyée !"); fetchData(); }
    } catch (error) {}
  };

  const cancelPendingRequest = (teamId) => {
    setConfirmData({
      isOpen: true,
      title: "Annuler la candidature ?",
      message: "Veux-tu vraiment annuler ta candidature pour cette équipe ?",
      isDanger: true,
      onConfirm: async () => {
        try {
          await supabase.from('team_members').delete().eq('team_id', teamId).eq('player_id', session.user.id);
          toast.success("Candidature annulée.");
          fetchData(); // On rafraîchit la page pour faire disparaître la carte
        } catch (error) {
          toast.error("Erreur lors de l'annulation.");
        }
      }
    });
  };

  const handleInvitePlayer = async (playerId) => {
    if (!inviteTeamId) return toast.error("Sélectionne une équipe !");
    try {
      const { error } = await supabase.from('team_members').insert([{ team_id: inviteTeamId, player_id: playerId, status: 'invited' }]);
      if (error && error.code === '23505') {
        toast.error("Ce joueur a déjà une interaction (invitation/candidature) avec cette équipe !");
      } else if (!error) {
        // NOUVEAU : On ne ferme plus la modale ! On met à jour l'affichage en direct.
        setSelectedProfile(prev => ({ ...prev, relationStatus: 'invited' }));
      }
    } catch (error) {}
  };
  const respondToInvite = async (teamId, accept) => {

if (hasTeam) return toast.error("Tu as atteint la limite de 3 équipes !");

    try {
      if (accept) {
        await supabase.from('team_members').update({ status: 'accepted' }).eq('team_id', teamId).eq('player_id', session.user.id);
        toast.success("Bienvenue dans l'équipe !");
      } else {
        await supabase.from('team_members').delete().eq('team_id', teamId).eq('player_id', session.user.id);
      }
      fetchData();
    } catch (error) {}
  };

  const openTeamManager = (team) => {
    setManagingTeam(team);
    localStorage.setItem('managingTeamId', team.id); // NOUVEAU : On sauvegarde l'ID en mémoire !
    loadRoster(team.id); // <--- L'AUTRE LIGNE MAGIQUE !
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

  const removePlayer = (playerId, isSelfLeave = false) => {
    setConfirmData({
      isOpen: true,
      title: isSelfLeave ? "Quitter l'équipe ? 🚪" : "Retirer le joueur ?",
      message: isSelfLeave 
        ? "Es-tu sûr de vouloir quitter cette équipe ?" 
        : "Es-tu sûr de vouloir retirer ce joueur (ou annuler son invitation) ?",
      isDanger: true,
      onConfirm: async () => {
        await supabase.from('team_members').delete().eq('team_id', managingTeam.id).eq('player_id', playerId);
        
        toast.success(isSelfLeave ? "Tu as quitté l'équipe." : "Joueur retiré avec succès.");
        
        if (isSelfLeave) { 
          setManagingTeam(null); 
          fetchData(); 
        } else { 
          setRoster(prev => prev.filter(p => p.player_id !== playerId)); 
        }
      }
    });
  };

  // --- MODIFIÉ : FONCTION TRANSFERT AVEC MODALE ---
  const handleTransferCaptaincy = () => {
    if (!selectedNewCaptainId) return toast.error("Sélectionne un joueur dans la liste !");
    
    const newCap = roster.find(p => p.player_id === selectedNewCaptainId);
    
    setConfirmData({
      isOpen: true,
      title: "Transférer le brassard ? 👑",
      message: `Es-tu sûr de vouloir léguer le rôle de Capitaine à ${newCap.full_name} ?\n\nTu deviendras un simple joueur et n'auras plus accès à la gestion de l'équipe.`,
      isDanger: true, // Rouge, car on perd ses droits de capitaine !
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('global_teams').update({ captain_id: selectedNewCaptainId }).eq('id', managingTeam.id);
          if (error) throw error;
          
          toast.success(`${newCap.full_name} est le nouveau Capitaine de l'équipe ! 👑`);
          setManagingTeam({ ...managingTeam, captain_id: selectedNewCaptainId });
          setTransferModalOpen(false);
          setSelectedNewCaptainId("");
          fetchData();
        } catch (error) {
          toast.error("Erreur lors du transfert : " + error.message);
        }
      }
    });
  };

  const handleDeleteTeam = () => {
    setConfirmData({
      isOpen: true,
      title: "Dissoudre l'équipe ? 🚨",
      message: "ATTENTION : Es-tu sûr de vouloir DISSOUDRE définitivement cette équipe ?\n\nCette action va renvoyer tous les joueurs dans la section Mercato. (L'historique dans les anciens tournois sera conservé).",
      isDanger: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('global_teams').delete().eq('id', managingTeam.id);
          if (error) throw error;
          
          toast.success("L'équipe a été dissoute avec succès. 💥");
          setManagingTeam(null);
          fetchData();
        } catch (error) {
          toast.error("Erreur lors de la dissolution : " + error.message);
        }
      }
    });
  };
  // ---------------------------------------------

  const submitRegistration = async () => {
    if (!selectedTeamToRegister) return toast.error("Sélectionne une équipe !");
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
            toast.error(`Action impossible 🛑\n\n${badPlayerName} participe DÉJÀ à ce tournoi avec une autre équipe ! Un joueur ne peut pas affronter sa propre équipe.`);
            return;
        }

        newPlayers = members.map((m, i) => ({
          id: m.player_id, name: profiles.find(p => p.id === m.player_id)?.full_name || "Joueur Inconnu",
          number: String(i + 4), licenseStatus: 'to_check', paid: 0, totalDue: 20
        }));
      }

      const newTeamObj = { id: "tm_" + Date.now(), global_id: teamToReg.id, name: teamToReg.name, players: newPlayers, groupId: null };
      await supabase.rpc('register_team_to_tournament', { t_id: registerModalTourney.id, new_team: newTeamObj });
      
      toast.success(`L'équipe ${teamToReg.name} est inscrite ! 🎉`);
      setRegisterModalTourney(null); setSelectedTeamToRegister(""); fetchData();

    } catch(err) {
      console.error(err);
      toast.error("Une erreur s'est produite lors de l'inscription.");
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
        <button onClick={() => { 
  setManagingTeam(null); 
  localStorage.removeItem('managingTeamId'); // NOUVEAU : On vide la mémoire en partant !
}} className="ton-nom-de-classe-actuel-si-tu-en-as-une">
  ⬅ RETOUR
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
              
              {/* BOÎTE EXISTANTE : CANDIDATURES */}
              <div style={{ background: '#222', padding: '20px', borderRadius: '12px', border: '1px solid var(--accent-orange)' }}>
                <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-orange)' }}>⏳ Candidatures ({pendingPlayers.length})</h2>
                {pendingPlayers.length === 0 ? <p style={{ color: '#888', fontStyle: 'italic' }}>Aucune demande.</p> : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingPlayers.map(p => (
                    <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '12px', borderRadius: '6px' }}>
                      <strong onClick={() => viewPlayerProfile({ id: p.player_id, full_name: p.full_name })} className="mercato-player-name-interactive" title="Voir le profil de ce joueur">{p.full_name}</strong>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => acceptPlayer(p.player_id)} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>ACCEPTER</button>
                        <button onClick={() => removePlayer(p.player_id)} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>REFUSER</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NOUVELLE BOÎTE : INVITATIONS ENVOYÉES */}
              <div style={{ background: '#222', padding: '20px', borderRadius: '12px', border: '1px dashed var(--accent-blue)' }}>
                <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-blue)' }}>✉️ Invitations envoyées ({invitedPlayers.length})</h2>
                {invitedPlayers.length === 0 ? <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>Aucune invitation en attente.</p> : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {invitedPlayers.map(p => (
                    <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '12px', borderRadius: '6px', borderLeft: '3px solid var(--accent-blue)' }}>
                      <strong onClick={() => viewPlayerProfile({ id: p.player_id, full_name: p.full_name })} className="mercato-player-name-interactive" title="Voir le profil de ce joueur">{p.full_name}</strong>
                      <button onClick={() => removePlayer(p.player_id)} style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Annuler</button>
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
                    <strong 
  onClick={() => viewPlayerProfile({ id: p.player_id, full_name: p.full_name })}
  className="mercato-player-name-interactive"
  style={{ color: isTheCaptain ? 'var(--accent-purple)' : 'white' }}
  title="Voir le profil de ce joueur"
>
  {p.full_name} {isTheCaptain && '👑'} {isMe && '(Toi)'}
</strong>
                    <div style={{ display: 'flex', gap: '8px' }}>
  {/* On ne garde que le bouton pour quitter sa propre équipe */}
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
{/* MODALE INJECTÉE DANS LE VESTIAIRE */}
        <PlayerProfileModal 
          selectedProfile={selectedProfile}
          setSelectedProfile={setSelectedProfile}          
          myCaptainTeams={myCaptainTeams}
          inviteTeamId={inviteTeamId}
          setInviteTeamId={setInviteTeamId}
          handleInvitePlayer={handleInvitePlayer}
          
          // 👇 CES DEUX LIGNES SONT INDISPENSABLES POUR ACTIVER LE MODE VESTIAIRE 👇
          managingTeam={managingTeam}
          removePlayer={removePlayer}
        />

        <ConfirmModal 
          isOpen={confirmData.isOpen}
          title={confirmData.title}
          message={confirmData.message}
          onConfirm={() => {
            if (confirmData.onConfirm) confirmData.onConfirm();
            closeConfirm();
          }}
          onCancel={closeConfirm}
          isDanger={confirmData.isDanger}
        />

        <PromptModal 
          isOpen={promptData.isOpen}
          title={promptData.title}
          message={promptData.message}
          placeholder={promptData.placeholder}
          onConfirm={(value) => {
            if (promptData.onConfirm) promptData.onConfirm(value);
            closePrompt();
          }}
          onCancel={closePrompt}
        />

      </div>
    );
  }
  // ===============================================
  // AIGUILLAGE PRINCIPAL : SELON LE BOUTON DU MENU
  // ===============================================
  return (
    <div style={{ 
      padding: '0px', 
      /* 🛠️ C'EST ICI QU'ON DÉVERROUILLE LA LARGEUR ! */
      maxWidth: currentTab === 'explorer' ? '100%' : '1200px', 
      margin: '0 auto', 
      color: 'white',
      width: '100%' /* 👈 Assure que ça pousse bien jusqu'au bout */
    }}>
      {/* --- ONGLET : VESTIAIRE --- */}
      {currentTab === 'vestiaire' && (
        <MonVestiaire          
          myTeams={myTeams}
          hasTeam={hasTeam}
          respondToInvite={respondToInvite}
          openTeamManager={openTeamManager}
          handleCreateTeam={handleCreateTeam}
          newTeamName={newTeamName}
          setNewTeamName={setNewTeamName}
          newTeamCity={newTeamCity}
          setNewTeamCity={setNewTeamCity}
          cancelPendingRequest={cancelPendingRequest} // <--- NOUVELLE LIGNE ICI
        />
      )}

      {/* --- ONGLET : MERCATO --- */}
      {currentTab === 'mercato' && (
        <Mercato 
          availableTeams={availableTeams}
          hasTeam={hasTeam}
          handleJoinTeam={handleJoinTeam}
          allPlayers={allPlayers} // <--- NOUVELLE LIGNE ICI
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearchPlayer={handleSearchPlayer} // (On va la garder pour éviter de casser les props, même si on ne s'en sert plus vraiment)
          searchResults={searchResults}
          viewPlayerProfile={viewPlayerProfile}
        />
      )}

      {/* --- ONGLET : CARRIÈRE --- */}
      {currentTab === 'carriere' && <MaCarriere careerStats={careerStats} />}

      {/* --- ONGLET : EXPLORER --- */}
      {currentTab === 'explorer' && (
        <ExplorerTournois           
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
        myCaptainTeams={myCaptainTeams}
        inviteTeamId={inviteTeamId}
        setInviteTeamId={setInviteTeamId}
        handleInvitePlayer={handleInvitePlayer}
        // NOUVELLES PROPS POUR LA GESTION :
        managingTeam={managingTeam}
        removePlayer={removePlayer}
      />

      <TournamentRegistrationModal 
        registerModalTourney={registerModalTourney}
        setRegisterModalTourney={setRegisterModalTourney}
        selectedTeamToRegister={selectedTeamToRegister}
        setSelectedTeamToRegister={setSelectedTeamToRegister}
        myCaptainTeams={myCaptainTeams}
        submitRegistration={submitRegistration}
      />

      <ConfirmModal 
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        onConfirm={() => {
          if (confirmData.onConfirm) confirmData.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
        isDanger={confirmData.isDanger}
      />

      <PromptModal 
        isOpen={promptData.isOpen}
        title={promptData.title}
        message={promptData.message}
        placeholder={promptData.placeholder}
        onConfirm={(value) => {
          if (promptData.onConfirm) promptData.onConfirm(value);
          closePrompt();
        }}
        onCancel={closePrompt}
      />
      
    </div>
  );
}