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
import { useDashboardData } from '../hooks/useDashboardData';

// 👇 On importe notre nouveau composant !
import TeamManagerView from './TeamManagerView'; 

export default function PlayerDashboard() {
  const { session } = useAuth(); 
  const { myTeams, allTeams, allPlayers, allTournaments, userProfile, careerStats, loading, refetch } = useDashboardData(session);
  
  const { activeMenu: currentTab, setActiveTourneyId, setView } = useAppContext();
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCity, setNewTeamCity] = useState("");
  
  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const closeConfirm = () => setConfirmData(prev => ({ ...prev, isOpen: false }));

  const [promptData, setPromptData] = useState({ isOpen: false, title: '', message: '', placeholder: '', onConfirm: null });
  const closePrompt = () => setPromptData(prev => ({ ...prev, isOpen: false }));
  
  const [managingTeam, setManagingTeam] = useState(null);
  const [roster, setRoster] = useState([]);
  const [newGhostName, setNewGhostName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const [inviteTeamId, setInviteTeamId] = useState("");
  const [registerModalTourney, setRegisterModalTourney] = useState(null);
  const [selectedTeamToRegister, setSelectedTeamToRegister] = useState("");

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedNewCaptainId, setSelectedNewCaptainId] = useState("");

  const activeTeamCount = myTeams.filter(t => t.status === 'accepted' || t.status === 'pending').length;
  const hasTeam = activeTeamCount >= 3;

  useEffect(() => {
    setManagingTeam(null);
  }, [currentTab]);

  const handleSearchPlayer = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, role').ilike('full_name', `%${searchQuery}%`).limit(10);
      if (!error) setSearchResults(data || []);
    } catch (error) {}
  };

  const viewPlayerProfile = async (player) => {
    let relationStatus = null;
    
    if (managingTeam && roster.length > 0) {
      const rosterEntry = roster.find(r => r.player_id === player.id);
      if (rosterEntry) relationStatus = rosterEntry.status;
    } else if (myCaptainTeams && myCaptainTeams.length > 0) {
      const teamIds = myCaptainTeams.map(t => t.id);
      const { data } = await supabase.from('team_members').select('status').eq('player_id', player.id).in('team_id', teamIds).limit(1);
      if (data && data.length > 0) relationStatus = data[0].status;
    }

    let playerTeams = [];
    const { data: ptData } = await supabase.from('team_members').select('global_teams(name)').eq('player_id', player.id).eq('status', 'accepted');
    if (ptData) playerTeams = ptData.map(d => d.global_teams).filter(Boolean);

    setSelectedProfile({ ...player, stats: {}, relationStatus, playerTeams });
    setInviteTeamId("");
  };

  const handleCreateTeam = async (e) => {
    if (hasTeam) return toast.error("Tu as atteint la limite de 3 équipes !");
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamCity.trim()) return toast.error("Le nom ET la ville sont obligatoires !");

    try {
      const { data: teamData, error: teamError } = await supabase.from('global_teams').insert([{ name: newTeamName, city: newTeamCity, captain_id: session.user.id }]).select().single();
      if (teamError) throw teamError;
      const { error: memberError } = await supabase.from('team_members').insert([{ team_id: teamData.id, player_id: session.user.id, status: 'accepted' }]);
      if (memberError) throw memberError;
      setNewTeamName(""); setNewTeamCity(""); refetch(); 
      toast.success("Ton équipe a été créée avec succès ! 🎉");
    } catch (error) { toast.error("Erreur : " + error.message); }
  };

  const handleJoinTeam = async (teamId) => {
    if (hasTeam) return toast.error("Tu as atteint la limite de 3 équipes !");
    try {
      const { error } = await supabase.from('team_members').insert([{ team_id: teamId, player_id: session.user.id, status: 'pending' }]);
      if (error && error.code === '23505') toast.error("Tu as déjà fait une demande pour cette équipe !");
      else if (!error) { toast.success("Demande envoyée !"); refetch(); }
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
          refetch(); 
        } catch (error) { toast.error("Erreur lors de l'annulation."); }
      }
    });
  };

  const handleInvitePlayer = async (playerId) => {
    if (!inviteTeamId) return toast.error("Sélectionne une équipe !");
    try {
      const { error } = await supabase.from('team_members').insert([{ team_id: inviteTeamId, player_id: playerId, status: 'invited' }]);
      if (error && error.code === '23505') {
        toast.error("Ce joueur a déjà une interaction avec cette équipe !");
      } else if (!error) {
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
      refetch();
    } catch (error) {}
  };

  const openTeamManager = (team) => {
    setManagingTeam(team);
    localStorage.setItem('managingTeamId', team.id); 
    loadRoster(team.id); 
  };

  const loadRoster = async (teamId) => {
    try {
      const { data: members } = await supabase.from('team_members').select('id, status, player_id, manual_name').eq('team_id', teamId);
      if (!members || members.length === 0) { setRoster([]); return; }
      
      const playerIds = members.map(m => m.player_id).filter(Boolean);
      const { data: profiles } = playerIds.length > 0 ? await supabase.from('profiles').select('id, full_name').in('id', playerIds) : { data: [] };
      
      const fullRoster = members.map(m => {
        if (!m.player_id) return { ...m, full_name: m.manual_name || 'Joueur Manuel', isGhost: true };
        const profile = profiles?.find(p => p.id === m.player_id);
        return { ...m, full_name: profile?.full_name || 'Joueur Inconnu', isGhost: false };
      });
      setRoster(fullRoster);
    } catch (error) { console.error(error); }
  };

  const acceptPlayer = async (playerId) => {
    await supabase.from('team_members').update({ status: 'accepted' }).eq('team_id', managingTeam.id).eq('player_id', playerId);
    setRoster(prev => prev.map(p => p.player_id === playerId ? { ...p, status: 'accepted' } : p));
  };

  const removePlayer = (identifier, isGhost = false, isSelfLeave = false) => {
    setConfirmData({
      isOpen: true,
      title: isSelfLeave ? "Quitter l'équipe ? 🚪" : "Retirer le joueur ?",
      message: isSelfLeave 
        ? "Es-tu sûr de vouloir quitter cette équipe ?" 
        : "Es-tu sûr de vouloir retirer ce joueur (ou annuler son invitation) ?",
      isDanger: true,
      onConfirm: async () => {
        try {
          let query = supabase.from('team_members').delete().eq('team_id', managingTeam.id);
          if (isGhost) query = query.eq('manual_name', identifier).is('player_id', null);
          else query = query.eq('player_id', identifier);
          
          await query;
          toast.success(isSelfLeave ? "Tu as quitté l'équipe." : "Joueur retiré avec succès.");
          
          if (isSelfLeave) { 
            setManagingTeam(null); 
            refetch(); 
          } else { 
            setRoster(prev => prev.filter(p => p.isGhost ? p.manual_name !== identifier : p.player_id !== identifier)); 
          }
        } catch(err) { toast.error("Erreur lors de la suppression."); }
      }
    });
  };

  const handleAddGhostPlayer = async (e) => {
    e.preventDefault();
    const name = newGhostName.trim();
    if (!name) return;
    if (roster.filter(p => p.status === 'accepted').length >= 12) return toast.error("Effectif complet ! (12 max)");
    
    try {
      const { error } = await supabase.from('team_members').insert([{
        team_id: managingTeam.id,
        player_id: null,
        manual_name: name,
        status: 'accepted'
      }]);
      if (error) throw error;
      
      toast.success("Joueur ajouté !");
      setNewGhostName("");
      loadRoster(managingTeam.id);
    } catch(err) { 
      toast.error("Erreur Supabase : " + (err.message || err.details || "Regarde la console")); 
    }
  };

  const handleTransferCaptaincy = () => {
    if (!selectedNewCaptainId) return toast.error("Sélectionne un joueur dans la liste !");
    const newCap = roster.find(p => p.player_id === selectedNewCaptainId);
    setConfirmData({
      isOpen: true,
      title: "Transférer le brassard ? 👑",
      message: `Léguer le rôle de Capitaine à ${newCap.full_name} ?\nTu perdras tes droits de gestion sur l'équipe.`,
      isDanger: true, 
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('global_teams').update({ captain_id: selectedNewCaptainId }).eq('id', managingTeam.id);
          if (error) throw error;
          toast.success(`${newCap.full_name} est le nouveau Capitaine ! 👑`);
          setManagingTeam({ ...managingTeam, captain_id: selectedNewCaptainId });
          setTransferModalOpen(false);
          setSelectedNewCaptainId("");
          refetch();
        } catch (error) { toast.error("Erreur : " + error.message); }
      }
    });
  };

  const handleDeleteTeam = () => {
    setConfirmData({
      isOpen: true,
      title: "Dissoudre l'équipe ? 🚨",
      message: "ATTENTION : Es-tu sûr de vouloir DISSOUDRE définitivement cette équipe ?",
      isDanger: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('global_teams').delete().eq('id', managingTeam.id);
          if (error) throw error;
          toast.success("L'équipe a été dissoute avec succès. 💥");
          setManagingTeam(null);
          refetch();
        } catch (error) { toast.error("Erreur : " + error.message); }
      }
    });
  };

  const submitRegistration = async () => {
    if (!selectedTeamToRegister) return toast.error("Sélectionne une équipe !");
    try {
      const teamToReg = myTeams.find(mt => mt.global_teams.id === selectedTeamToRegister).global_teams;
      const { data: members } = await supabase.from('team_members').select('player_id, manual_name').eq('team_id', selectedTeamToRegister).eq('status', 'accepted');
      
      if (!members || members.length < 5) {
        return toast.error(`Effectif incomplet 🛑\n\nL'équipe "${teamToReg.name}" n'a que ${members?.length || 0} joueur(s) validé(s). Il en faut au minimum 5 pour s'inscrire à un tournoi !`);
      }

      let newPlayers = [];
      if (members && members.length > 0) {
        const playerIds = members.map(m => m.player_id).filter(Boolean);
        const { data: profiles } = playerIds.length > 0 ? await supabase.from('profiles').select('id, full_name').in('id', playerIds) : { data: [] };
        
        const existingTeams = registerModalTourney.teams || [];
        const alreadyRegisteredPlayerIds = new Set();
        existingTeams.forEach(t => {
            (t.players || []).forEach(p => alreadyRegisteredPlayerIds.add(p.id));
        });

        const overlappingMember = members.find(m => m.player_id && alreadyRegisteredPlayerIds.has(m.player_id));
        if (overlappingMember) {
            const badPlayerName = profiles?.find(p => p.id === overlappingMember.player_id)?.full_name || "Un joueur";
            toast.error(`Action impossible 🛑\n\n${badPlayerName} participe DÉJÀ à ce tournoi avec une autre équipe !`);
            return;
        }

        newPlayers = members.map((m, i) => ({
          id: m.player_id || `ghost_${Math.random()}`, 
          name: m.player_id ? (profiles.find(p => p.id === m.player_id)?.full_name || "Inconnu") : (m.manual_name || "Manuel"),
          number: String(i + 4), licenseStatus: 'to_check', paid: 0, totalDue: 20
        }));
      }

      const newTeamObj = { id: "tm_" + Date.now(), global_id: teamToReg.id, name: teamToReg.name, players: newPlayers, groupId: null };
      await supabase.rpc('register_team_to_tournament', { t_id: registerModalTourney.id, new_team: newTeamObj });
      
      toast.success(`L'équipe ${teamToReg.name} est inscrite ! 🎉`);
      setRegisterModalTourney(null); setSelectedTeamToRegister(""); refetch();

    } catch(err) {
      console.error(err);
      toast.error("Erreur lors de l'inscription.");
    }
  };

  const handleLeaveTournament = (tourney, teamGlobalId) => {
    if (tourney.status !== 'preparing') return toast.error("Impossible 🛑 : Le tournoi a déjà commencé !");

    const myGlobalTeam = myTeams.find(mt => mt.global_teams.id === teamGlobalId)?.global_teams;
    if (!myGlobalTeam || myGlobalTeam.captain_id !== session.user.id) {
      return toast.error("Seul le capitaine de l'équipe peut vous désinscrire ! 👑");
    }

    setConfirmData({
      isOpen: true,
      title: "Se désinscrire ? 🚪",
      message: `Es-tu sûr de vouloir retirer l'équipe "${myGlobalTeam.name}" de ce tournoi ?`,
      isDanger: true,
      onConfirm: async () => {
        const loadingToast = toast.loading("Désinscription en cours...");
        try {
          const { data: currentTourney, error: fetchError } = await supabase.from('tournaments').select('teams').eq('id', tourney.id).single();
          if (fetchError) throw fetchError;

          const currentTeams = currentTourney.teams || [];
          const updatedTeams = currentTeams.filter(t => t.global_id !== teamGlobalId);

          const { error: rpcError } = await supabase.rpc('update_tournament_teams', { t_id: tourney.id, new_teams: updatedTeams });
          if (rpcError) throw rpcError;

          toast.success("Ton équipe a été retirée du tournoi.", { id: loadingToast });
          refetch(); 
        } catch (error) {
          toast.error("Erreur lors de la désinscription.", { id: loadingToast });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto p-5">
        <div className="h-8 bg-[#333] rounded w-1/3 animate-pulse mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-[#111] p-5 rounded-xl border border-[#222]">
              <div className="h-6 bg-[#333] rounded w-3/5 animate-pulse mb-4"></div>
              <div className="h-4 bg-[#333] rounded w-full animate-pulse mb-2"></div>
              <div className="h-4 bg-[#333] rounded w-2/5 animate-pulse mb-5"></div>
              <div className="h-10 bg-[#333] rounded w-full animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const myTeamIds = myTeams.map(mt => mt.global_teams.id);
  const availableTeams = allTeams.filter(t => !myTeamIds.includes(t.id));
  const myCaptainTeams = myTeams.filter(mt => mt.global_teams.captain_id === session.user.id && mt.status === 'accepted').map(mt => mt.global_teams);

  // 👇 L'AFFICHAGE DE LA GESTION D'ÉQUIPE VIA NOTRE NOUVEAU COMPOSANT 👇
  if (managingTeam) {
    return (
      <>
        <TeamManagerView 
          session={session}
          managingTeam={managingTeam}
          setManagingTeam={setManagingTeam}
          roster={roster}
          acceptedPlayers={roster.filter(p => p.status === 'accepted')}
          pendingPlayers={roster.filter(p => p.status === 'pending')}
          invitedPlayers={roster.filter(p => p.status === 'invited')}
          isCaptainView={managingTeam.captain_id === session.user.id}
          setTransferModalOpen={setTransferModalOpen}
          handleDeleteTeam={handleDeleteTeam}
          viewPlayerProfile={viewPlayerProfile}
          acceptPlayer={acceptPlayer}
          removePlayer={removePlayer}
          handleAddGhostPlayer={handleAddGhostPlayer}
          newGhostName={newGhostName}
          setNewGhostName={setNewGhostName}
        />

        {/* La modale de transfert du capitanat reste ici car elle dépend de l'état du Dashboard */}
        {transferModalOpen && (
          <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-[9999] p-4">
            <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[var(--accent-orange)] w-full max-w-[400px]">
              <h3 className="mt-0 mb-4 text-[var(--accent-orange)] border-b border-[#333] pb-3 text-lg font-bold">👑 Nommer un nouveau Capitaine</h3>
              
              <label className="block mb-2 text-[#ccc] text-sm">Sélectionner le joueur :</label>
              <select
                value={selectedNewCaptainId}
                onChange={(e) => setSelectedNewCaptainId(e.target.value)}
                className="w-full mb-6 p-3 rounded-md bg-[#222] text-white border border-[#555] focus:outline-none focus:border-[var(--accent-orange)]"
              >
                <option value="">-- Choisir dans l'effectif --</option>
                {roster.filter(p => p.status === 'accepted' && p.player_id !== session.user.id && !p.isGhost).map(p => (
                  <option key={p.player_id} value={p.player_id}>{p.full_name}</option>
                ))}
              </select>

              <div className="flex gap-3 justify-end">
                <button onClick={() => { setTransferModalOpen(false); setSelectedNewCaptainId(""); }} className="bg-[#333] text-white px-4 py-2 rounded-md font-bold cursor-pointer hover:bg-[#444] transition-colors">Annuler</button>
                <button onClick={handleTransferCaptaincy} className="bg-[var(--accent-orange)] text-white px-5 py-2 rounded-md font-bold cursor-pointer hover:bg-orange-600 transition-colors">Valider</button>
              </div>
            </div>
          </div>
        )}

        {/* Les modales habituelles */}
        <PlayerProfileModal 
          selectedProfile={selectedProfile} setSelectedProfile={setSelectedProfile} myCaptainTeams={myCaptainTeams} inviteTeamId={inviteTeamId} setInviteTeamId={setInviteTeamId} handleInvitePlayer={handleInvitePlayer} managingTeam={managingTeam} removePlayer={removePlayer}
        />
        <ConfirmModal isOpen={confirmData.isOpen} title={confirmData.title} message={confirmData.message} onConfirm={() => { if (confirmData.onConfirm) confirmData.onConfirm(); closeConfirm(); }} onCancel={closeConfirm} isDanger={confirmData.isDanger} />
        <PromptModal isOpen={promptData.isOpen} title={promptData.title} message={promptData.message} placeholder={promptData.placeholder} onConfirm={(value) => { if (promptData.onConfirm) promptData.onConfirm(value); closePrompt(); }} onCancel={closePrompt} />
      </>
    );
  }

  return (
    <div className={`mx-auto text-white w-full ${currentTab === 'explorer' ? 'max-w-full' : 'max-w-[1200px]'}`}>
      {currentTab === 'vestiaire' && (
        <MonVestiaire          
          myTeams={myTeams} hasTeam={hasTeam} respondToInvite={respondToInvite} openTeamManager={openTeamManager} handleCreateTeam={handleCreateTeam} newTeamName={newTeamName} setNewTeamName={setNewTeamName} newTeamCity={newTeamCity} setNewTeamCity={setNewTeamCity} cancelPendingRequest={cancelPendingRequest}
        />
      )}

      {currentTab === 'mercato' && (
        <Mercato 
          availableTeams={availableTeams} hasTeam={hasTeam} handleJoinTeam={handleJoinTeam} allPlayers={allPlayers} searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearchPlayer={handleSearchPlayer} searchResults={searchResults} viewPlayerProfile={viewPlayerProfile}
        />
      )}

      {currentTab === 'carriere' && <MaCarriere careerStats={careerStats} />}

      {currentTab === 'explorer' && (
        <ExplorerTournois          
          allTournaments={allTournaments} myTeams={myTeams} setRegisterModalTourney={setRegisterModalTourney} setActiveTourneyId={setActiveTourneyId} setView={setView} handleLeaveTournament={handleLeaveTournament}
        />
      )}

      <PlayerProfileModal selectedProfile={selectedProfile} setSelectedProfile={setSelectedProfile} myCaptainTeams={myCaptainTeams} inviteTeamId={inviteTeamId} setInviteTeamId={setInviteTeamId} handleInvitePlayer={handleInvitePlayer} managingTeam={managingTeam} removePlayer={removePlayer} />
      <TournamentRegistrationModal registerModalTourney={registerModalTourney} setRegisterModalTourney={setRegisterModalTourney} selectedTeamToRegister={selectedTeamToRegister} setSelectedTeamToRegister={setSelectedTeamToRegister} myCaptainTeams={myCaptainTeams} submitRegistration={submitRegistration} />
      <ConfirmModal isOpen={confirmData.isOpen} title={confirmData.title} message={confirmData.message} onConfirm={() => { if (confirmData.onConfirm) confirmData.onConfirm(); closeConfirm(); }} onCancel={closeConfirm} isDanger={confirmData.isDanger} />
      <PromptModal isOpen={promptData.isOpen} title={promptData.title} message={promptData.message} placeholder={promptData.placeholder} onConfirm={(value) => { if (promptData.onConfirm) promptData.onConfirm(value); closePrompt(); }} onCancel={closePrompt} />
    </div>
  );
}