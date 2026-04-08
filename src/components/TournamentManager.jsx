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
  const { currentTourney: tourney, setTournaments, userRole, launchMatch: onLaunchMatch } = useAppContext();
  
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

    const safePayload = {
      ...data,
      teams: data.teams !== undefined ? data.teams : tourney.teams,
      schedule: data.schedule !== undefined ? data.schedule : tourney.schedule,
      playoffs: data.playoffs !== undefined ? data.playoffs : tourney.playoffs
    };

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
      let won = 0, lost = 0; // 👈 NOUVEAU : On prépare les compteurs

      (tourney.schedule || []).filter(m => m.group === gNum && (m.status === 'finished' || m.status === 'forfeit') && (m.teamA?.id === team.id || m.teamB?.id === team.id)).forEach(m => {
        const isA = m.teamA?.id === team.id;
        const s = isA ? m.scoreA : m.scoreB; 
        const o = isA ? m.scoreB : m.scoreA;
        
        if (m.status === 'forfeit') {
          if (s > o) { points += 2; won += 1; } // 👈 Victoire par forfait
          else { points += 0; lost += 1; }      // 👈 Défaite par forfait
        } else {
          if (s > o) { points += 2; won += 1; } // 👈 Victoire normale
          else { points += 1; lost += 1; }      // 👈 Défaite normale
        }
        diff += (s - o);
      });
      
      // 👈 NOUVEAU : On retourne won et lost
      return { ...team, points, diff, won, lost }; 
    }).sort((a,b) => b.points - a.points || b.diff - a.diff);
  };

  const getStandings = (groupId) => {
    const groupTeams = (tourney.teams || []).filter(t => t.groupId === groupId);
    const standings = groupTeams.map(team => {
      const matches = (tourney.schedule || []).filter(m => 
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

  useEffect(() => {
    if (!canEdit) return; 
    if (!tourney.playoffs || !tourney.playoffs.matches) return;
    
    let updated = false;
    const newMatches = [...tourney.playoffs.matches];

    newMatches.forEach(m => {
      if ((m.status === 'finished' || m.status === 'forfeit') && m.nextMatchId) {
        let winner = null;
        if (m.teamB?.isBye) winner = m.teamA;
        else if (m.teamA?.isBye) winner = m.teamB;
        else if (m.scoreA > m.scoreB) winner = m.teamA;
        else if (m.scoreB > m.scoreA) winner = m.teamB;

        if (!winner) return;

        const nextMatchIndex = newMatches.findIndex(x => x.id === m.nextMatchId);
        if (nextMatchIndex !== -1) {
          const nextMatch = newMatches[nextMatchIndex];
          if (nextMatch[m.nextSlot]?.id !== winner.id) {
            newMatches[nextMatchIndex] = { ...nextMatch, [m.nextSlot]: winner };
            updated = true;
          }
        }
      }
    });

    if (updated) {
      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
    }
  }, [tourney.playoffs]);

  const handleLaunchMatch = (matchId, canLaunchThisMatch) => {
    let match = (tourney.schedule || []).find(m => m.id === matchId);
    if (!match && tourney.playoffs) {
      match = tourney.playoffs.matches.find(m => m.id === matchId);
    }
    if (match) {
      localStorage.setItem(`canEdit_match_${matchId}`, canLaunchThisMatch ? "true" : "false");
      onLaunchMatch(matchId);
    }
  };

  const handleMatchException = (matchId, actionType, isPlayoff = false) => {
    if (!canEdit) return;
    const match = isPlayoff ? tourney.playoffs.matches.find(m => m.id === matchId) : tourney.schedule.find(m => m.id === matchId);
    
    if (actionType === 'cancel') {
       setConfirmData({
         isOpen: true,
         title: "Annuler ce match ?",
         message: "Ce match sera considéré comme nul (0-0) et ne rapportera aucun point au classement.",
         isDanger: true,
         onConfirm: () => {
           updateMatchState(matchId, isPlayoff, 'canceled', 0, 0);
           toast.success("Match annulé");
         }
       });
    } else if (actionType === 'forfeit') {
       setChoiceData({
         isOpen: true,
         title: "Déclarer un Forfait 🏳️",
         message: "Quelle équipe n'a pas pu se présenter ou a déclaré forfait ?",
         optionA: match.teamA?.name || "Équipe A",
         optionB: match.teamB?.name || "Équipe B",
         onChoose: (choice) => {
           if (choice === 'A') {
             updateMatchState(matchId, isPlayoff, 'forfeit', 0, 20);
             toast.success(`Forfait de ${match.teamA?.name} enregistré`);
           } else if (choice === 'B') {
             updateMatchState(matchId, isPlayoff, 'forfeit', 20, 0);
             toast.success(`Forfait de ${match.teamB?.name} enregistré`);
           }
         }
       });
    }
  };


  const updateMatchState = (matchId, isPlayoff, status, scoreA, scoreB) => {
    if (isPlayoff) {
      const newMatches = tourney.playoffs.matches.map(m => 
        m.id === matchId ? { ...m, status, scoreA, scoreB } : m
      );
      
      update({ 
        playoffs: { 
          ...tourney.playoffs, 
          matches: newMatches,
          status: 'updating' 
        } 
      });

      setTimeout(() => {
        update({ playoffs: { ...tourney.playoffs, matches: newMatches, status: 'started' } });
      }, 100);

    } else {
      const newSchedule = tourney.schedule.map(m => 
        m.id === matchId ? { ...m, status, scoreA, scoreB } : m
      );
      update({ schedule: newSchedule });
    }
  };

  const handleAssignOtm = (matchId, isPlayoff) => {
    if (!canEdit) return;
    const match = isPlayoff ? tourney.playoffs.matches.find(m => m.id === matchId) : tourney.schedule.find(m => m.id === matchId);
    // On passe currentOtm à la modale
    setOtmModal({ matchId, isPlayoff, currentOtm: match.otm || "" });
  };


  const generateDrawAndSchedule = (isAllerRetour = false) => {
    if (!canEdit) return;
    
    setConfirmData({
      isOpen: true,
      title: "Générer le planning ?",
      message: "⚠️ Attention, cela va écraser les poules et le planning actuels. Voulez-vous continuer ?",
      isDanger: true,
      onConfirm: () => {
        const n = parseInt(groupCount);
        if (isNaN(n) || n < 1) return;

        const shuffled = [...tourney.teams].sort(() => Math.random() - 0.5);
        const updatedTeams = shuffled.map((t, i) => ({ ...t, groupId: (i % n) + 1 }));

        const newSchedule = [];
        
        // 1. GÉNÉRATION DES MATCHS ALLER (Ton code d'origine)
        for (let g = 1; g <= n; g++) {
          const gTeams = updatedTeams.filter(t => t.groupId === g);
          for (let i = 0; i < gTeams.length; i++) {
            for (let j = i + 1; j < gTeams.length; j++) {
              newSchedule.push({ 
                id: `m_${Date.now()}_g${g}_${i}${j}_aller`, // Ajout du suffixe _aller pour la sécurité des IDs
                group: g, 
                teamA: gTeams[i], teamB: gTeams[j], 
                status: 'pending', scoreA: 0, scoreB: 0 
              });
            }
          }
        }

        // 2. GÉNÉRATION DES MATCHS RETOUR (Si l'option est activée)
        if (isAllerRetour) {
          const returnMatches = newSchedule.map(match => ({
            ...match,
            // On remplace "aller" par "retour" pour avoir un ID unique
            id: match.id.replace('_aller', '_retour'), 
            teamA: match.teamB, // Inversion domicile
            teamB: match.teamA, // Inversion extérieur
          }));
          
          // On ajoute les matchs retour à la liste complète
          newSchedule.push(...returnMatches);
        }

        update({ 
          teams: updatedTeams, 
          schedule: newSchedule, 
          qualifiedSettings: Object.fromEntries(Array.from({length:n}, (_,i)=>[i+1,2])),
          playoffs: null 
        });
        toast.success("Planning généré avec succès !");
      }
    });
  };

  const generatePlayoffs = () => {
    if (!canEdit) return;

    if (!tourney.schedule || tourney.schedule.length === 0) {
      toast.error("Impossible : Aucun match de poule n'a été généré. Veuillez d'abord créer le planning des poules.");
      return;
    }

    const resolvedMatches = tourney.schedule.filter(m => ['finished', 'forfeit', 'canceled'].includes(m.status)).length;
    const totalMatches = tourney.schedule.length;

    if (resolvedMatches < totalMatches) {
      const remaining = totalMatches - resolvedMatches;
      toast.error(`Impossible de générer la phase finale 🛑\n\nTous les matchs de poule doivent être terminés (ou annulés/forfaits).\nIl reste actuellement ${remaining} match(s) en attente.`);
      return;
    }

    const executeGeneration = () => {
      const qualifiedTeams = [];
      const savedGroupIds = [...new Set((tourney.teams || []).map(t => t.groupId).filter(g => g !== null))].sort((a,b) => a-b);
      
      let maxLimit = 0;
      savedGroupIds.forEach(gNum => {
        const limit = getGroupLimit(tourney, gNum);
        if(limit > maxLimit) maxLimit = limit;
      });

      for(let rank = 0; rank < maxLimit; rank++) {
        savedGroupIds.forEach(gNum => {
          const limit = getGroupLimit(tourney, gNum);
          if (rank < limit) {
            const standings = getGroupStandings(gNum);
            if (standings[rank]) qualifiedTeams.push(standings[rank]);
          }
        });
      }

      const totalTeams = qualifiedTeams.length;
      if (totalTeams < 2) { toast.error("Il faut au moins 2 équipes qualifiées."); return; }

      let size = 2;
      while (size < totalTeams && size <= 1024) size *= 2;

      const seeded = new Array(size).fill(null);
      for(let i=0; i<totalTeams; i++) seeded[i] = qualifiedTeams[i];
      for(let i=totalTeams; i<size; i++) seeded[i] = { id: `bye_${i}`, name: 'EXEMPTÉ', isBye: true };

      const getRoundLabel = (matchesCount, matchIdx) => {
        if (matchesCount === 1) return "FINALE";
        if (matchesCount === 2) return `DEMI-FINALE ${matchIdx + 1}`;
        if (matchesCount === 4) return `QUART DE FINALE ${matchIdx + 1}`;
        if (matchesCount === 8) return `8ÈME DE FINALE ${matchIdx + 1}`;
        if (matchesCount === 16) return `16ÈME DE FINALE ${matchIdx + 1}`;
        return `MATCH ${matchIdx + 1}`;
      };

      const matches = [];
      let numMatchesInRound = size / 2;
      let roundNum = 1;
      const ts = Date.now();

      for (let i = 0; i < numMatchesInRound; i++) {
        const tA = seeded[i];
        const tB = seeded[size - 1 - i];
        const hasBye = tA.isBye || tB.isBye;

        matches.push({
          id: `p_${ts}_r${roundNum}_m${i}`,
          round: roundNum,
          teamA: tA, teamB: tB, 
          scoreA: 0, scoreB: 0, 
          status: hasBye ? 'finished' : 'pending',
          label: getRoundLabel(numMatchesInRound, i),
          nextMatchId: numMatchesInRound === 1 ? null : `p_${ts}_r${roundNum+1}_m${Math.floor(i/2)}`,
          nextSlot: i % 2 === 0 ? 'teamA' : 'teamB' 
        });
      }

      numMatchesInRound /= 2;
      roundNum++;

      while (numMatchesInRound >= 1) {
        for (let i = 0; i < numMatchesInRound; i++) {
          matches.push({
            id: `p_${ts}_r${roundNum}_m${i}`,
            round: roundNum,
            teamA: null, teamB: null, 
            scoreA: 0, scoreB: 0, status: 'pending',
            label: getRoundLabel(numMatchesInRound, i),
            nextMatchId: numMatchesInRound === 1 ? null : `p_${ts}_r${roundNum+1}_m${Math.floor(i/2)}`,
            nextSlot: i % 2 === 0 ? 'teamA' : 'teamB'
          });
        }
        numMatchesInRound /= 2;
        roundNum++;
      }

      update({ playoffs: { size, matches, status: 'started' } });
      setActiveTab("finale");
      toast.success("Phase finale générée avec succès !");
    }; 

    if (tourney.playoffs) {
       setConfirmData({
         isOpen: true,
         title: "Écraser la phase finale ?",
         message: "Une phase finale existe déjà. Voulez-vous la régénérer et écraser l'actuelle ?",
         isDanger: true,
         onConfirm: executeGeneration
       });
    } else {
       executeGeneration();
    }
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
      message: "Voulez-vous supprimer définitivement cette équipe du tournoi ?",
      isDanger: true,
      onConfirm: () => {
        const newTeams = tourney.teams.filter(t => t.id !== teamId);
        const newSchedule = (tourney.schedule || []).filter(match => match.teamA?.id !== teamId && match.teamB?.id !== teamId);

        let newPlayoffs = tourney.playoffs ? JSON.parse(JSON.stringify(tourney.playoffs)) : null;
        if (newPlayoffs && newPlayoffs.matches) {
          newPlayoffs.matches = newPlayoffs.matches.map(m => {
            if (m.teamA?.id === teamId) m.teamA = null;
            if (m.teamB?.id === teamId) m.teamB = null;
            return m;
          });
        }

        update({ teams: newTeams, schedule: newSchedule, playoffs: newPlayoffs });
        toast.success("Équipe supprimée");
      }
    });
  };

  const handleUnlockOtm = () => {
    setPromptData({
      isOpen: true,
      title: "Accès Table de Marque",
      message: "Entrez le code PIN fourni par l'organisateur :",
      placeholder: "Code PIN (ex: 1234)",
      onConfirm: async (pin) => {
  if (!pin) return;
  try {
    const cleanedPin = pin.trim().toUpperCase();
    console.log("Tentative d'envoi du PIN :", cleanedPin); // 👈 Vérifie que le code est bon

    const { error } = await supabase.rpc('join_as_otm', { pin: cleanedPin });
    if (error) throw error;
    
    toast.success("Succès ! Vous êtes maintenant OTM sur ce tournoi. 🏀");
    setTournaments(prev => prev.map(t => t.id === tourney.id ? { ...t, otm_ids: [...(t.otm_ids || []), session?.user?.id] } : t));
  } catch (err) { 
    console.error("Erreur complète Supabase :", err); // 👈 Regarde ta console (F12) !
    toast.error(`Erreur : ${err.message}`); // 👈 Affichera la vraie raison à l'écran
  }
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
        handleUnlockOtm={handleUnlockOtm}
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
          tourney={tourney} canEdit={canEdit} savedGroupIds={savedGroupIds} generateMatches={generateDrawAndSchedule} currentUserName={currentUserName} handleLaunchMatch={handleLaunchMatch} handleAssignOtm={handleAssignOtm} handleMatchException={handleMatchException} teamName={teamName} setTeamName={setTeamName} addTeam={addTeam} teamSearchQuery={teamSearchQuery} setTeamSearchQuery={setTeamSearchQuery} globalTeams={globalTeams} handleDirectImport={handleDirectImport} teamPage={teamPage} setTeamPage={setTeamPage} teamsPerPage={teamsPerPage} setEditId={setEditId} deleteTeam={deleteTeam} groupCount={groupCount} setGroupCount={setGroupCount} update={update} getGroupStandings={getGroupStandings} getGroupLimit={getGroupLimit}
        />
      )}
          
      {activeTab === "finale" && (
        <PlayoffsTab 
          tourney={tourney} canEdit={canEdit} update={update} generatePlayoffs={generatePlayoffs} currentUserName={currentUserName} handleLaunchMatch={handleLaunchMatch} handleAssignOtm={handleAssignOtm} handleMatchException={handleMatchException} getGroupLimit={getGroupLimit}
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