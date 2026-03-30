import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
// DEBUT DE LA MODIFICATION - src/components/TournamentManager.jsx (Ligne 3)
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
// FIN DE LA MODIFICATION


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

  // ---------------------------------------------------------
  // 🪄 MAGIE DU TEMPS RÉEL : Écoute des mises à jour Supabase
  // ---------------------------------------------------------
  useEffect(() => {
    if (!tourney?.id) return;

    // 1. On crée un canal de communication direct avec la base de données
    const realtimeChannel = supabase
      .channel(`tourney-updates-${tourney.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // On écoute uniquement les modifications
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tourney.id}` // On n'écoute que CE tournoi en particulier
        },
        (payload) => {
          // 2. Dès qu'une modification (un score, un nouveau match) arrive, on met à jour le Nuage !
          console.log("⚡ Mise à jour en direct reçue !");
          setTournaments(prev => prev.map(t => t.id === tourney.id ? { ...t, ...payload.new } : t));
        }
      )
      .subscribe();

    // 3. On coupe le canal proprement quand l'utilisateur quitte la page
    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [tourney?.id, setTournaments]);
  // ---------------------------------------------------------
  

  useEffect(() => {
    localStorage.setItem('tm_active_tab', activeTab);
  }, [activeTab]);

  const [teamName, setTeamName] = useState("");
  const [editId, setEditId] = useState(null);
  
  
  // Le brouillon d'ajout multiple
  const [groupCount, setGroupCount] = useState(1);
    
  const [globalTeams, setGlobalTeams] = useState([]);
  const [selectedGlobalTeamId, setSelectedGlobalTeamId] = useState("");
  const [choiceData, setChoiceData] = useState({ isOpen: false, title: '', message: '', optionA: '', optionB: '', onChoose: null });
  const closeChoice = () => setChoiceData(prev => ({ ...prev, isOpen: false }));

  // --- ÉTATS POUR LA MODALE OTM ---
  const [otmProfiles, setOtmProfiles] = useState([]);
  const [otmModal, setOtmModal] = useState(null);
  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const closeConfirm = () => setConfirmData(prev => ({ ...prev, isOpen: false }));
   const [promptData, setPromptData] = useState({ isOpen: false, title: '', message: '', placeholder: '', onConfirm: null });
  const closePrompt = () => setPromptData(prev => ({ ...prev, isOpen: false }));
  const [selectedOtms, setSelectedOtms] = useState([]); // Pour les cases à cocher
  const [customOtm, setCustomOtm] = useState("");       // Pour le texte libre

  // --- Toujours connaître le nom de l'utilisateur connecté ---
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

  // On récupère les profils de ceux qui ont débloqué le mode OTM
  useEffect(() => {
    if (!canEdit) return;
    const fetchOtms = async () => {
      if (!tourney.otm_ids || tourney.otm_ids.length === 0) {
        setOtmProfiles([]);
        return;
      }
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', tourney.otm_ids);
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

    // 1. Mise à jour instantanée de l'écran local
    setTournaments(prev => prev.map(t => t.id === tourney.id ? { ...t, ...data } : t));

    // 2. BOUCLIER ANTI-TOAST POSTGRES : 
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

    // DEBUT DE LA MODIFICATION - src/components/TournamentManager.jsx (Fonction update)

    if (error) {
      console.error("Erreur de sauvegarde Supabase :", error);
      toast.error("Erreur de synchronisation avec le cloud."); // 👈 CHANGÉ
    } else if (!updatedRows || updatedRows.length === 0) {
      toast.error("Blocage silencieux Supabase (Problème de droits RLS).", { duration: 6000 }); // 👈 CHANGÉ
    } else {
      // Optionnel : Un petit toast de succès discret quand ça sauvegarde bien !
      toast.success("Sauvegardé", { position: 'bottom-right', duration: 1500, style: { fontSize: '0.8rem', padding: '4px 8px' }});
    }
  };

// FIN DE LA MODIFICATION

  const getGroupLimit = (t, gNum) => {
    const val = t?.qualifiedSettings?.[gNum];
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 2 : Math.max(0, parsed);
  };

  const getGroupStandings = (gNum) => {
    const groupTeams = (tourney.teams || []).filter(t => t.groupId === gNum);
    return groupTeams.map(team => {
      let points = 0, diff = 0;
      (tourney.schedule || []).filter(m => m.group === gNum && (m.status === 'finished' || m.status === 'forfeit') && (m.teamA?.id === team.id || m.teamB?.id === team.id)).forEach(m => {
        const isA = m.teamA?.id === team.id;
        const s = isA ? m.scoreA : m.scoreB; 
        const o = isA ? m.scoreB : m.scoreA;
        
        // DEBUT DE LA MODIFICATION - src/components/TournamentManager.jsx

        if (m.status === 'forfeit') {
          if (s > o) points += 2; 
          else points += 0;       
        } else {
          if (s > o) points += 2; else points += 1; 
        }
        diff += (s - o);
      });
      return { ...team, points, diff };
    }).sort((a,b) => b.points - a.points || b.diff - a.diff);
  };

  // ---------------------------------------------------------
  // 👇 VOICI LA FONCTION QU'IL MANQUAIT (getStandings) 👇
  // ---------------------------------------------------------
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
          points += 2; // Victoire = 2 pts
          won += 1;
        } else {
          points += 1; // Défaite = 1 pt
          lost += 1;
        }
      });

      // Gestion des forfaits (qui donnent 0 pt au lieu de 1)
      const forfeits = (tourney.schedule || []).filter(m => 
        (m.teamA?.id === team.id || m.teamB?.id === team.id) && m.status === 'forfeit'
      );
      forfeits.forEach(m => {
        const isTeamA = m.teamA?.id === team.id;
        // Si c'est l'autre équipe qui a forfait, on a gagné (2 pts). Sinon on a 0 pt.
        const myScore = isTeamA ? m.scoreA : m.scoreB;
        if(myScore > 0) {
            points += 2;
            won += 1;
            pointsFor += 20; // Score forfait classique
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

    // Tri par points, puis différence de points
    return standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.diff - a.diff;
    });
  };
  // ---------------------------------------------------------

  useEffect(() => {
    if (!canEdit) return; 
    if (!tourney.playoffs || !tourney.playoffs.matches) return;

// FIN DE LA MODIFICATION
    
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
             // Si A fait forfait, B gagne 20 à 0
             updateMatchState(matchId, isPlayoff, 'forfeit', 0, 20);
             toast.success(`Forfait de ${match.teamA?.name} enregistré`);
           } else if (choice === 'B') {
             // Si B fait forfait, A gagne 20 à 0
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
      
      // 🛠️ FIX : On met à jour l'objet complet des playoffs pour déclencher le useEffect de progression
      update({ 
        playoffs: { 
          ...tourney.playoffs, 
          matches: newMatches,
          // On change le status global temporairement pour forcer React à recalculer l'arbre
          status: 'updating' 
        } 
      });

      // On repasse en 'started' juste après
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
    setOtmModal({ matchId, isPlayoff });
    
    const currentOtmStr = match.otm || "";
    const currentOtmsArray = currentOtmStr.split(' - ').map(s => s.trim()).filter(Boolean);
    const knownProfiles = otmProfiles.map(p => p.full_name);
    
    setSelectedOtms(currentOtmsArray.filter(name => knownProfiles.includes(name)));
    setCustomOtm(currentOtmsArray.filter(name => !knownProfiles.includes(name)).join(' - '));
  };


  const generateDrawAndSchedule = () => {
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
        for (let g = 1; g <= n; g++) {
          const gTeams = updatedTeams.filter(t => t.groupId === g);
          for (let i = 0; i < gTeams.length; i++) {
            for (let j = i + 1; j < gTeams.length; j++) {
              newSchedule.push({ 
                id: `m_${Date.now()}_g${g}_${i}${j}`, 
                group: g, 
                teamA: gTeams[i], teamB: gTeams[j], 
                status: 'pending', scoreA: 0, scoreB: 0 
              });
            }
          }
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

  // DEBUT DE LA MODIFICATION - src/components/TournamentManager.jsx

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

    // NOUVEAU : La fonction qui fait vraiment le calcul
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
    }; // FIN DE executeGeneration

    // NOUVEAU : La logique d'ouverture de la modale
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

// FIN DE LA MODIFICATION

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
      const { data: members } = await supabase.from('team_members').select('player_id').eq('team_id', gTeam.id).eq('status', 'accepted');
      let newPlayers = [];
      if (members && members.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', members.map(m => m.player_id));
        newPlayers = members.map((m, i) => {
          const prof = profiles.find(p => p.id === m.player_id);
          return { id: m.player_id, name: prof?.full_name || "Joueur Inconnu", number: String(i + 4), licenseStatus: 'to_check', paid: 0, totalDue: 20 };
        });
      }

      // 🛡️ NOUVEAU : LA BARRIÈRE DE SÉCURITÉ (Un joueur = Une équipe)
      let conflictingPlayer = null;
      let conflictingTeam = null;
      
      for (const newPlayer of newPlayers) {
        for (const team of tourney.teams) {
          if (team.players.some(p => p.id === newPlayer.id)) {
            conflictingPlayer = newPlayer;
            conflictingTeam = team;
            break;
          }
        }
        if (conflictingPlayer) break;
      }

      if (conflictingPlayer) {
        toast.error(`"${conflictingPlayer.name}" joue déjà pour l'équipe "${conflictingTeam.name}".`);
        return; // On annule l'importation de l'équipe
      }

      update({ teams: [...tourney.teams, { id: "tm_" + Date.now(), global_id: gTeam.id, name: gTeam.name, players: newPlayers, groupId: null }] });
      setTeamSearchQuery("");
    } catch (error) { toast.error("Erreur d'import : " + error.message); }
  };

  const importGlobalTeam = () => {
    // Cette fonction reste vide ou peut être supprimée car handleDirectImport prend le relais
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
        const newSchedule = (tourney.schedule || []).filter(match => {
          const aId = match.teamA?.id || null;
          const bId = match.teamB?.id || null;
          return aId !== teamId && bId !== teamId;
        });

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
      message: "Entrez le code PIN fourni par l'organisateur pour débloquer la gestion du match :",
      placeholder: "Code PIN (ex: 1234)",
      onConfirm: async (pin) => {
        if (!pin) return;
        try {
          const { error } = await supabase.rpc('join_as_otm', { pin: pin.trim().toUpperCase() });
          if (error) throw error;
          
          toast.success("Succès ! Vous êtes maintenant OTM sur ce tournoi. 🏀");
          setTournaments(prev => prev.map(t => {
            if (t.id === tourney.id) {
              return { ...t, otm_ids: [...(t.otm_ids || []), session?.user?.id] };
            }
            return t;
          }));
        } catch (err) {
          toast.error("Code PIN invalide ou erreur réseau.");
        }
      }
    });
  };

      
  if (editId) {
    return (
      <TeamEditor 
        teamId={editId} 
        setEditId={setEditId} 
        tourney={tourney} 
        canEdit={canEdit} 
        update={update} 
      />
    );
  }

  const savedGroupIds = [...new Set((tourney.teams || []).map(t => t.groupId).filter(g => g !== null))].sort((a,b) => a-b);

  
  return (
    <div className="tm-container">
      <div className="tm-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <h1 className="tm-title" style={{ margin: 0 }}>{tourney.name}</h1>
            
            {/* Affichage du code pour les organisateurs */}
            {canEdit && tourney.pin_code && (
              <span style={{ 
                  background: 'rgba(0, 102, 204, 0.1)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', 
                  padding: '6px 12px', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px'
              }}>
                🔑 CODE OTM : {tourney.pin_code}
              </span>
            )}

            {/* Bouton de déblocage pour les spectateurs/joueurs */}
            {!canManageMatch && session && (
              <button 
                onClick={handleUnlockOtm} 
                style={{ 
                  background: '#1a1a1a', border: '1px dashed var(--accent-blue)', color: 'var(--accent-blue)', 
                  padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' 
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(0, 102, 204, 0.2)'}
                onMouseOut={(e) => e.target.style.background = '#1a1a1a'}
              >
                🔓 Débloquer la Table de Marque
              </button>
            )}
        </div>
        <div className="tm-tabs" style={{ marginTop: '10px' }}>
            <button onClick={() => setActiveTab("poules")} className={`tm-tab ${activeTab === "poules" ? 'active' : 'inactive'}`}>POULES</button>
            <button onClick={() => setActiveTab("finale")} className={`tm-tab ${activeTab === "finale" ? 'active' : 'inactive'}`}>PHASE FINALE</button>
            <button onClick={() => setActiveTab("stats")} className={`tm-tab ${activeTab === "stats" ? 'active' : 'inactive'}`}>STATISTIQUES 📈</button>
        </div>
      </div>


      {activeTab === "poules" && (
        <GroupStageTab 
          tourney={tourney}
          canEdit={canEdit}
          savedGroupIds={savedGroupIds}
          generateMatches={generateDrawAndSchedule}
          currentUserName={currentUserName}
          handleLaunchMatch={handleLaunchMatch}
          handleAssignOtm={handleAssignOtm}
          handleMatchException={handleMatchException}
          teamName={teamName}
          setTeamName={setTeamName}
          addTeam={addTeam}
          teamSearchQuery={teamSearchQuery}
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
          generatePlayoffs={generatePlayoffs}
          currentUserName={currentUserName}
          handleLaunchMatch={handleLaunchMatch}
          handleAssignOtm={handleAssignOtm}
          handleMatchException={handleMatchException}
          getGroupLimit={getGroupLimit}
        />
      )}


      {activeTab === "stats" && (
        <TournamentStats tourney={tourney} />
      )}


      {/* --- MODALE D'ASSIGNATION D'OTM --- */}      
      {otmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid var(--accent-blue)', width: '90%', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--accent-blue)', borderBottom: '1px solid #333', paddingBottom: '10px' }}>👤 Assigner des OTM</h3>
            
            <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '0.85rem' }}>Cocher les OTM connectés :</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', background: '#222', padding: '10px', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto' }}>
              {otmProfiles.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>Aucun OTM n'a rejoint le tournoi.</span>
              ) : (
                otmProfiles.map(prof => (
                  <label key={prof.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedOtms.includes(prof.full_name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOtms([...selectedOtms, prof.full_name]);
                        } else {
                          setSelectedOtms(selectedOtms.filter(name => name !== prof.full_name));
                        }
                      }}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                    {prof.full_name}
                  </label>
                ))
              )}
            </div>

            <label style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '0.85rem' }}>Autre (ex: Terrain 1, Bénévoles...) :</label>
            <input 
              type="text" 
              value={customOtm}
              onChange={(e) => setCustomOtm(e.target.value)}
              className="tm-input"
              style={{ 
                width: '100%', 
                marginBottom: '25px',
                boxSizing: 'border-box' /* 🛠️ LA CORRECTION EST LÀ */
              }}
              placeholder="Saisir un texte libre..."
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setOtmModal(null)} style={{ background: '#333', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Annuler</button>
              <button onClick={() => {
                // On rassemble les cases cochées ET le texte libre, séparés par " - "
                const finalVal = [...selectedOtms, customOtm.trim()].filter(Boolean).join(' - ');
                
                if (otmModal.isPlayoff) {
                  const newMatches = tourney.playoffs.matches.map(m => m.id === otmModal.matchId ? { ...m, otm: finalVal } : m);
                  update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                } else {
                  const newSchedule = tourney.schedule.map(m => m.id === otmModal.matchId ? { ...m, otm: finalVal } : m);
                  update({ schedule: newSchedule });
                }
                setOtmModal(null);
              }} className="tm-btn-success" style={{ padding: '10px 20px', fontSize: '1rem' }}>Valider</button>
            </div>
          </div>
        </div>
      )}

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

      <ChoiceModal 
          isOpen={choiceData.isOpen}
          title={choiceData.title}
          message={choiceData.message}
          optionA={choiceData.optionA}
          optionB={choiceData.optionB}
          onChoose={(choice) => {
            if (choiceData.onChoose) choiceData.onChoose(choice);
            closeChoice();
          }}
          onCancel={closeChoice}
        />

    </div>
  );
}