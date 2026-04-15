import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TournamentStats from './TournamentStats';
import PlayoffsTab from './PlayoffsTab';
import GroupStageTab from './GroupStageTab';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import ChoiceModal from './ChoiceModal';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import TeamEditor from './TeamEditor';
import PlanningTab from './PlanningTab';
import InfoTab from './InfoTab';

// 👇 Nouveaux composants importés 👇
import TournamentHeader from './TournamentHeader';
import OtmAssignModal from './OtmAssignModal';


export default function TournamentManager() {
  const { session } = useAuth();
  const { currentTourney: tourney, setTournaments, userRole, launchMatch: onLaunchMatch, fetchTournaments } = useAppContext();
  
  const isOwner = tourney.organizer_id === session?.user?.id;
  const isInvitedOtm = tourney.otm_ids?.includes(session?.user?.id);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamPage, setTeamPage] = useState(0);
  const teamsPerPage = 6;

  const canEdit = userRole === 'ADMIN' || isOwner;
  const canManageMatch = canEdit || isInvitedOtm; 

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('tm_active_tab') || "poules");

  useEffect(() => {
    if (!tourney?.id) return;
    const realtimeChannel = supabase
      .channel(`tourney-updates-${tourney.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${tourney.id}` },
        (payload) => {
          console.log("⚡ Mise à jour en direct reçue !");
          setTournaments(prev => prev.map(t => t.id === tourney.id ? { ...t, ...payload.new } : t));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(realtimeChannel); };
  }, [tourney?.id, setTournaments]);

  useEffect(() => {
    localStorage.setItem('tm_active_tab', activeTab);
  }, [activeTab]);

  const [teamName, setTeamName] = useState("");
  const [editId, setEditId] = useState(null);
  
  const [groupCount, setGroupCount] = useState(1);
    
  const [globalTeams, setGlobalTeams] = useState([]);
  const [selectedGlobalTeamId, setSelectedGlobalTeamId] = useState("");
  const [choiceData, setChoiceData] = useState({ isOpen: false, title: '', message: '', optionA: '', optionB: '', onChoose: null });
  const closeChoice = () => setChoiceData(prev => ({ ...prev, isOpen: false }));

  const [otmProfiles, setOtmProfiles] = useState([]);
  const [otmModal, setOtmModal] = useState(null);
  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const closeConfirm = () => setConfirmData(prev => ({ ...prev, isOpen: false }));
  const [promptData, setPromptData] = useState({ isOpen: false, title: '', message: '', placeholder: '', onConfirm: null });
  const closePrompt = () => setPromptData(prev => ({ ...prev, isOpen: false }));

  const [currentUserName, setCurrentUserName] = useState("");

  useEffect(() => {
    const fetchMyName = async () => {
      if (session?.user?.id) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
        if (data) setCurrentUserName(data.full_name);
      }
    };
    fetchMyName();
  }, [session]);

  useEffect(() => {
    if (!canEdit) return;
    const fetchOtms = async () => {
      if (!tourney.otm_ids || tourney.otm_ids.length === 0) {
        setOtmProfiles([]);
        return;
      }
      
      const validOtmIds = tourney.otm_ids.filter(Boolean);
      if (validOtmIds.length === 0) return;

      const { data } = await supabase.from('profiles').select('id, full_name').in('id', validOtmIds);
      if (data) setOtmProfiles(data);
    };
    fetchOtms();
  }, [tourney.otm_ids, canEdit]);

  useEffect(() => {
    if (!canEdit) return;
    const fetchGlobalTeams = async () => {
      const { data } = await supabase.from('global_teams').select('*').order('name');
      if (data) setGlobalTeams(data);
    };
    fetchGlobalTeams();
  }, [canEdit]);

  const update = async (data) => {
    if (!canEdit) return; 

    setTournaments(prev => prev.map(t => t.id === tourney.id ? { ...t, ...data } : t));

    // 1. On ne garde que les vraies données du tournoi
    const safePayload = {
      ...data,
      teams: data.teams !== undefined ? data.teams : tourney.teams
    };

    // 2. 🛡️ LE BOUCLIER ABSOLU : On détruit toute trace des anciens systèmes
    delete safePayload.matches;
    delete safePayload.schedule;
    delete safePayload.playoffs;

    const { data: updatedRows, error } = await supabase
      .from('tournaments')
      .update(safePayload)
      .eq('id', tourney.id)
      .select();

    if (error) {
      console.error("Erreur de sauvegarde Supabase :", error);
      toast.error("Erreur de synchronisation avec le cloud.");
    } else if (!updatedRows || updatedRows.length === 0) {
      toast.error("Blocage silencieux Supabase (Problème de droits RLS).", { duration: 6000 });
    } else {
      toast.success("Sauvegardé", { position: 'bottom-right', duration: 1500, style: { fontSize: '0.8rem', padding: '4px 8px' }});
    }
  };


  const getGroupLimit = (t, gNum) => {
    const val = t?.qualifiedSettings?.[gNum];
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 2 : Math.max(0, parsed);
  };

  const getGroupStandings = (gNum) => {
    const groupTeams = (tourney.teams || []).filter(t => t.groupId === gNum);
    return groupTeams.map(team => {
      let points = 0, diff = 0;
      let won = 0, lost = 0;

      // 👇 V2 : On utilise tourney.matches et on filtre sur le type 'pool'
      (tourney.matches || []).filter(m => m.type === 'pool' && m.group === gNum && (m.status === 'finished' || m.status === 'forfeit') && (m.teamA?.id === team.id || m.teamB?.id === team.id)).forEach(m => {
        const isA = m.teamA?.id === team.id;
        const s = isA ? m.scoreA : m.scoreB; 
        const o = isA ? m.scoreB : m.scoreA;
        
        if (m.status === 'forfeit') {
          if (s > o) { points += 2; won += 1; }
          else { points += 0; lost += 1; }
        } else {
          if (s > o) { points += 2; won += 1; }
          else { points += 1; lost += 1; }
        }
        diff += (s - o);
      });
      
      return { ...team, points, diff, won, lost }; 
    }).sort((a,b) => b.points - a.points || b.diff - a.diff);
  };

  const getStandings = (groupId) => {
    const groupTeams = (tourney.teams || []).filter(t => t.groupId === groupId);
    const standings = groupTeams.map(team => {
      const matches = (tourney.matches || []).filter(m => 
        (m.teamA?.id === team.id || m.teamB?.id === team.id) && m.status === 'finished'
      );
      
      let points = 0;
      let won = 0;
      let lost = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;

      matches.forEach(m => {
        const isTeamA = m.teamA?.id === team.id;
        const myScore = isTeamA ? m.scoreA : m.scoreB;
        const theirScore = isTeamA ? m.scoreB : m.scoreA;
        
        pointsFor += myScore;
        pointsAgainst += theirScore;

        if (myScore > theirScore) {
          points += 2; 
          won += 1;
        } else {
          points += 1; 
          lost += 1;
        }
      });

      const forfeits = (tourney.schedule || []).filter(m => 
        (m.teamA?.id === team.id || m.teamB?.id === team.id) && m.status === 'forfeit'
      );
      forfeits.forEach(m => {
        const isTeamA = m.teamA?.id === team.id;
        const myScore = isTeamA ? m.scoreA : m.scoreB;
        if(myScore > 0) {
            points += 2;
            won += 1;
            pointsFor += 20; 
        } else {
            lost += 1;
            pointsAgainst += 20;
        }
      });

      return {
        ...team,
        points,
        played: won + lost,
        won,
        lost,
        diff: pointsFor - pointsAgainst
      };
    });

    return standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.diff - a.diff;
    });
  };

  
  const handleLaunchMatch = (matchId, canLaunchThisMatch) => {
    // V2 : Recherche simplifiée
    const match = (tourney.matches || []).find(m => m.id === matchId);
    
    if (match) {
      // 🛡️ LE TRADUCTEUR : Transforme l'ID brut en vraie équipe avec SES JOUEURS
      const getTeam = (teamData) => {
        if (!teamData) return null;
        if (typeof teamData === 'object' && teamData.name) return teamData;
        return tourney.teams?.find(t => String(t.id) === String(teamData)) || null;
      };

      // 🚀 L'INJECTION MAGIQUE : On donne les objets complets au match
      match.teamA = getTeam(match.teamA || match.team_a);
      match.teamB = getTeam(match.teamB || match.team_b);
      match.team_a = match.teamA; // On sécurise les deux orthographes
      match.team_b = match.teamB;

      // 💾 TA LOGIQUE D'ORIGINE QUI OUVRE LE SCOREBOARD
      localStorage.setItem(`canEdit_match_${matchId}`, canLaunchThisMatch ? "true" : "false");
      onLaunchMatch(matchId);
    }
  };

  const handleMatchException = (matchId, actionType) => {
    if (!canEdit) return;
    
    // V2 : On cherche directement dans la liste unifiée des matchs
    const match = (tourney.matches || []).find(m => m.id === matchId);
    if (!match) return;

    // 🛡️ NOUVEAU : LE TRADUCTEUR BLINDÉ
    const getTeam = (teamData) => {
      if (!teamData) return null;
      if (typeof teamData === 'object' && teamData.name) return teamData;
      // Sécurité : on force en texte (String) pour être sûr que "123" === "123"
      return tourney.teams?.find(t => String(t.id) === String(teamData)) || null;
    };

    const teamA = getTeam(match.teamA || match.team_a);
    const teamB = getTeam(match.teamB || match.team_b);

    const nameA = teamA?.name || "Équipe A";
    const nameB = teamB?.name || "Équipe B";
    // ------------------------------------------------
    
    if (actionType === 'cancel') {
       setConfirmData({
         isOpen: true,
         title: "Annuler ce match ?",
         message: "Ce match sera considéré comme nul (0-0) et ne rapportera aucun point au classement.",
         isDanger: true,
         onConfirm: async () => {
           updateMatchState(matchId, false, 'canceled', 0, 0); 
           toast.success("Match annulé");
           if (fetchTournaments) fetchTournaments(); // Ajouté ici aussi !
         }
       });
    } else if (actionType === 'forfeit') {
       setChoiceData({
         isOpen: true,
         title: "Déclarer un Forfait 🏳️",
         message: `Quelle équipe a déclaré forfait entre ${nameA} et ${nameB} ?`,
         optionA: nameA,
         optionB: nameB,
         onChoose: async (choice) => {
           if (choice === 'A') {
             updateMatchState(matchId, false, 'forfeit', 0, 20);
             toast.success(`Forfait de ${nameA} enregistré`);
           } else if (choice === 'B') {
             updateMatchState(matchId, false, 'forfeit', 20, 0);
             toast.success(`Forfait de ${nameB} enregistré`);
           }

           if (fetchTournaments) fetchTournaments();
         }
       });
    }
  };


  // V2 : Mise à jour directe, légère, AVEC PROPAGATION DU GAGNANT (MÉTHODE INFAILLIBLE)
  const updateMatchState = async (matchId, isPlayoff, status, scoreA, scoreB) => {
    // 1. Sauvegarde cloud ultra-rapide
    await supabase.from('matches').update({ 
      status: status, 
      score_a: scoreA, 
      score_b: scoreB 
    }).eq('id', matchId);

    // 🚀 2. TÉLÉPORTATION DU GAGNANT SI FORFAIT EN PLAYOFFS
    const match = (tourney.matches || []).find(m => m.id === matchId);
    let winnerId = null;
    const getTeamId = (t) => t ? (typeof t === 'object' ? t.id : t) : null;
    
    // 💡 L'ADRESSE DE DESTINATION (Comme dans PlayoffsTab et le Scoreboard)
    const nextMatchId = match?.nextMatchId || match?.metadata?.nextMatchId;
    const nextSlot = match?.nextSlot || match?.metadata?.nextSlot;
    
    // Celui qui gagne par forfait a automatiquement 20 points
    if (status === 'forfeit' && nextMatchId) {
        if (scoreA === 20) winnerId = getTeamId(match.teamA || match.team_a);
        else if (scoreB === 20) winnerId = getTeamId(match.teamB || match.team_b);
        
        if (winnerId) {
            const nextSlotDb = nextSlot === 'teamA' ? 'team_a' : 'team_b';
            await supabase.from('matches').update({ [nextSlotDb]: String(winnerId) }).eq('id', nextMatchId);
        }
    }

    // 3. Optimistic UI : Mise à jour immédiate à l'écran sans recharger !
    setTournaments(prev => prev.map(t => {
      if (t.id === tourney.id) {
         const newMatches = [...(t.matches || [])];
         
         // A. Mettre à jour le statut (forfait)
         const mIdx = newMatches.findIndex(m => m.id === matchId);
         if (mIdx > -1) newMatches[mIdx] = { ...newMatches[mIdx], status, scoreA, scoreB };

         // B. Afficher le gagnant dans la case suivante
         if (winnerId && nextMatchId) {
             const nIdx = newMatches.findIndex(m => m.id === nextMatchId);
             if (nIdx > -1) {
                 const nextSlotDb = nextSlot === 'teamA' ? 'team_a' : 'team_b';
                 newMatches[nIdx] = { ...newMatches[nIdx], [nextSlotDb]: String(winnerId), [nextSlot]: String(winnerId) };
             }
         }
         return { ...t, matches: newMatches };
      }
      return t;
    }));
  };

  const handleAssignOtm = (matchId, isPlayoff) => {
    if (!canEdit) return;
    // V2 : Recherche simplifiée
    const match = (tourney.matches || []).find(m => m.id === matchId);
    if (match) {
      setOtmModal({ matchId, isPlayoff, currentOtm: match.otm || "" });
    }
  };


  const generateDrawAndSchedule = async (isAllerRetour = false) => {
    if (!canEdit) return;
    
    setConfirmData({
      isOpen: true,
      title: "Générer le planning ?",
      message: "⚠️ Attention, cela va écraser les poules et le planning actuels. Voulez-vous continuer ?",
      isDanger: true,
      onConfirm: async () => {
        // 🚀 OPTIMISTIC UI : On vide TOUS les matchs de l'écran instantanément
        setTournaments(prev => prev.map(t => 
          t.id === tourney.id ? { ...t, matches: [] } : t // 👈 On met un tableau vide au lieu de filtrer
        ));

        const n = parseInt(groupCount);
        if (isNaN(n) || n < 1) return;

        const shuffled = [...tourney.teams].sort(() => Math.random() - 0.5);
        const updatedTeams = shuffled.map((t, i) => ({ ...t, groupId: (i % n) + 1 }));

        const newMatchesToInsert = [];
        
        for (let g = 1; g <= n; g++) {
          const gTeams = updatedTeams.filter(t => t.groupId === g);
          for (let i = 0; i < gTeams.length; i++) {
            for (let j = i + 1; j < gTeams.length; j++) {
              newMatchesToInsert.push({ 
                id: `m_${Date.now()}_g${g}_${i}${j}_aller`,
                tournament_id: tourney.id,
                type: 'pool',
                metadata: { group: g }, // 👈 Injection propre des métadonnées !
                team_a: gTeams[i], 
                team_b: gTeams[j], 
                status: 'pending', 
                score_a: 0, 
                score_b: 0 
              });
            }
          }
        }

        if (isAllerRetour) {
          const returnMatches = newMatchesToInsert.map(match => ({
            ...match,
            id: match.id.replace('_aller', '_retour'), 
            team_a: match.team_b, 
            team_b: match.team_a, 
          }));
          newMatchesToInsert.push(...returnMatches);
        }

        // 1. On nettoie le vieux JSON du tournoi
        update({ 
          teams: updatedTeams, 
          qualifiedSettings: Object.fromEntries(Array.from({length:n}, (_,i)=>[i+1,2])),
        });

        // 2. V2 : On supprime TOUS les vieux matchs (Poules ET Playoffs) de la BDD !
        await supabase.from('matches').delete().eq('tournament_id', tourney.id);

        // 3. BULK INSERT : On insère tous les nouveaux matchs de poule
        const { error } = await supabase.from('matches').insert(newMatchesToInsert);

        if (error) {
          console.error("Erreur de génération :", error);
          toast.error("Erreur d'insertion des matchs dans la base de données.");
        } else {
          toast.success("Planning généré avec succès !");
          // L'interface se mettra à jour automatiquement via Realtime
        }
      }
    });
  };

  const addTeam = () => {
    if (!canEdit || !teamName.trim()) return;
    update({ teams: [...tourney.teams, { id: "tm_" + Date.now(), name: teamName, players: [], groupId: null }] });
    setTeamName("");
  };

  const handleDirectImport = async (gTeam) => {
    if (!canEdit || !gTeam) return;
    if (tourney.teams.some(t => t.global_id === gTeam.id)) {
      toast.error("Cette équipe a déjà été importée !");
      return;
    }
    try {
      const { data: members } = await supabase.from('team_members').select('player_id, manual_name').eq('team_id', gTeam.id).eq('status', 'accepted');
      
      let newPlayers = [];
      if (members && members.length > 0) {
        const validPlayerIds = members.map(m => m.player_id).filter(Boolean);
        const { data: profiles } = validPlayerIds.length > 0 ? await supabase.from('profiles').select('id, full_name').in('id', validPlayerIds) : { data: [] };

        newPlayers = members.map((m, i) => {
          const prof = profiles?.find(p => p.id === m.player_id);
          return { 
            id: m.player_id || `ghost_${Math.random()}`, 
            name: prof?.full_name || m.manual_name || "Joueur Manuel", 
            number: String(i + 4), 
            licenseStatus: 'to_check', 
            paid: 0, totalDue: 20 
          };
        });
      }

      let conflictingPlayer = null; let conflictingTeam = null;
      for (const newPlayer of newPlayers) {
        for (const team of tourney.teams) {
          if (team.players.some(p => p.id === newPlayer.id && !newPlayer.id.startsWith('ghost_'))) { conflictingPlayer = newPlayer; conflictingTeam = team; break; }
        }
        if (conflictingPlayer) break;
      }

      if (conflictingPlayer) return toast.error(`"${conflictingPlayer.name}" joue déjà pour l'équipe "${conflictingTeam.name}".`);

      update({ teams: [...tourney.teams, { id: "tm_" + Date.now(), global_id: gTeam.id, name: gTeam.name, players: newPlayers, groupId: null }] });
      setTeamSearchQuery("");
    } catch (error) { toast.error("Erreur d'import : " + error.message); }
  };

  const importGlobalTeam = () => {
    
  };

  
  const deleteTeam = (teamId) => {
    if (!canEdit) return;
    setConfirmData({
      isOpen: true,
      title: "Supprimer l'équipe ?",
      message: "Voulez-vous supprimer définitivement cette équipe du tournoi et ses matchs associés ?",
      isDanger: true,
      onConfirm: async () => {
        // 1. On retire l'équipe de la liste JSON
        const newTeams = tourney.teams.filter(t => t.id !== teamId);
        update({ teams: newTeams }); 

        // 2. 🧹 NETTOYAGE SQL DANS LA TABLE MATCHES
        const { data: allMatches } = await supabase.from('matches').select('id, type, team_a, team_b').eq('tournament_id', tourney.id);
        
        if (allMatches) {
          // A. Poules : On supprime totalement les matchs impliquant cette équipe
          const poolMatches = allMatches.filter(m => m.type === 'pool' && (m.team_a?.id === teamId || m.team_b?.id === teamId));
          for (const m of poolMatches) {
             await supabase.from('matches').delete().eq('id', m.id);
          }

          // B. Playoffs : On ne supprime pas le match, on vide juste la place
          const playoffMatches = allMatches.filter(m => m.type === 'playoff' && (m.team_a?.id === teamId || m.team_b?.id === teamId));
          for (const m of playoffMatches) {
             const payload = {};
             if (m.team_a?.id === teamId) payload.team_a = null;
             if (m.team_b?.id === teamId) payload.team_b = null;
             await supabase.from('matches').update(payload).eq('id', m.id);
          }
        }

        toast.success("Équipe et matchs supprimés ! 🧹");
      }
    });
  };

  
  
      
  if (editId) {
    return <TeamEditor teamId={editId} setEditId={setEditId} tourney={tourney} canEdit={canEdit} update={update} />;
  }

  const savedGroupIds = [...new Set((tourney.teams || []).map(t => t.groupId).filter(g => g !== null))].sort((a,b) => a-b);

  return (
    <div className="flex flex-col w-full h-full max-w-[1920px] mx-auto p-4 sm:p-6">
      
      <TournamentHeader 
        tourney={tourney}
        canEdit={canEdit}
        canManageMatch={canManageMatch}
        session={session}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        update={update} // 👈 LA SEULE LIGNE À AJOUTER EST ICI
      />

      {activeTab === 'infos' && (
        <InfoTab tourney={tourney} />
      )}
      {activeTab === 'planning' && (
        <PlanningTab 
          tourney={tourney} 
          handleLaunchMatch={handleLaunchMatch} 
          canEdit={canEdit} 
          currentUserName={currentUserName} 
          update={update} /* 👈 AJOUTE JUSTE CETTE LIGNE */
        />
      )}

      {activeTab === "poules" && (
        <GroupStageTab 
          tourney={tourney} 
          canEdit={canEdit} 
          savedGroupIds={savedGroupIds} 
          generateMatches={(isAllerRetour) => generateDrawAndSchedule(isAllerRetour)} 
          currentUserName={currentUserName} 
          handleLaunchMatch={handleLaunchMatch} 
          handleAssignOtm={handleAssignOtm} 
          handleMatchException={handleMatchException} 
          teamName={teamName} 
          setTeamName={setTeamName} 
          addTeam={addTeam} 
          teamSearchQuery={teamSearchQuery || ""} 
          setTeamSearchQuery={setTeamSearchQuery} 
          globalTeams={globalTeams} 
          handleDirectImport={handleDirectImport} 
          teamPage={teamPage} 
          setTeamPage={setTeamPage} 
          teamsPerPage={teamsPerPage} 
          setEditId={setEditId} 
          deleteTeam={deleteTeam} 
          groupCount={groupCount} 
          setGroupCount={setGroupCount} 
          update={update} 
          getGroupStandings={getGroupStandings} 
          getGroupLimit={getGroupLimit}
        />
      )}
          
      {activeTab === "finale" && (
        <PlayoffsTab 
  tourney={tourney}
  canEdit={canEdit}
  update={update}
  currentUserName={currentUserName}
  handleLaunchMatch={handleLaunchMatch}
  handleAssignOtm={handleAssignOtm}
  handleMatchException={handleMatchException}
  getGroupLimit={getGroupLimit}
  
  // 👇 AJOUTE CES DEUX LIGNES ICI 👇
  getGroupStandings={getGroupStandings}
  setActiveTab={setActiveTab}
  // 👆----------------------------👆
/>
      )}

      {activeTab === "stats" && (
        <TournamentStats tourney={tourney} />
      )}

      <OtmAssignModal 
        otmModal={otmModal}
        setOtmModal={setOtmModal}
        otmProfiles={otmProfiles}
        tourney={tourney}
        update={update}
      />

      <ConfirmModal isOpen={confirmData.isOpen} title={confirmData.title} message={confirmData.message} onConfirm={() => { if (confirmData.onConfirm) confirmData.onConfirm(); closeConfirm(); }} onCancel={closeConfirm} isDanger={confirmData.isDanger} />
      <PromptModal isOpen={promptData.isOpen} title={promptData.title} message={promptData.message} placeholder={promptData.placeholder} onConfirm={(value) => { if (promptData.onConfirm) promptData.onConfirm(value); closePrompt(); }} onCancel={closePrompt} />
      <ChoiceModal isOpen={choiceData.isOpen} title={choiceData.title} message={choiceData.message} optionA={choiceData.optionA} optionB={choiceData.optionB} onChoose={(choice) => { if (choiceData.onChoose) choiceData.onChoose(choice); closeChoice(); }} onCancel={closeChoice} />

    </div>
  );
}