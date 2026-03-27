import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 

export default function TournamentManager({ tourney, setTournaments, onLaunchMatch, userRole, session }) {
  const isOwner = tourney.organizer_id === session?.user?.id;
  const isInvitedOtm = tourney.otm_ids?.includes(session?.user?.id);

  const canEdit = userRole === 'ADMIN' || isOwner;
  const canManageMatch = canEdit || isInvitedOtm; 

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('tm_active_tab') || "poules");

  useEffect(() => {
    localStorage.setItem('tm_active_tab', activeTab);
  }, [activeTab]);

  const [teamName, setTeamName] = useState("");
  const [editId, setEditId] = useState(null);
  
  // Le brouillon d'ajout multiple
  const [playersDraft, setPlayersDraft] = useState([{ name: "", number: "" }]);
  const [groupCount, setGroupCount] = useState(1);
  const [draggedPlayerId, setDraggedPlayerId] = useState(null);
  const [draggedMatchId, setDraggedMatchId] = useState(null);

  const [globalTeams, setGlobalTeams] = useState([]);
  const [selectedGlobalTeamId, setSelectedGlobalTeamId] = useState("");

  // --- ÉTATS POUR LA MODALE OTM ---
  const [otmProfiles, setOtmProfiles] = useState([]);
  const [otmModal, setOtmModal] = useState(null);
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

    if (error) {
      console.error("Erreur de sauvegarde Supabase :", error);
      alert("Erreur de synchronisation avec le cloud.");
    } else if (!updatedRows || updatedRows.length === 0) {
      alert("🚨 BLOCAGE SILENCIEUX SUPABASE 🚨\n\nL'application a essayé de sauvegarder, mais Supabase a refusé (0 ligne modifiée) sans envoyer d'erreur.\n\nC'est un problème de droits (RLS) sur la table 'tournaments'.");
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
      (tourney.schedule || []).filter(m => m.group === gNum && (m.status === 'finished' || m.status === 'forfeit') && (m.teamA?.id === team.id || m.teamB?.id === team.id)).forEach(m => {
        const isA = m.teamA?.id === team.id;
        const s = isA ? m.scoreA : m.scoreB; 
        const o = isA ? m.scoreB : m.scoreA;
        
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
       if (!window.confirm("Annuler ce match ? Il sera considéré comme nul (0-0) et ne rapportera aucun point.")) return;
       updateMatchState(matchId, isPlayoff, 'canceled', 0, 0);
    } else if (actionType === 'forfeit') {
       const res = window.prompt(`Qui déclare FORFAIT ?\n\nTapez 1 pour : ${match.teamA?.name}\nTapez 2 pour : ${match.teamB?.name}`);
       if (res === '1') {
         updateMatchState(matchId, isPlayoff, 'forfeit', 0, 20);
       } else if (res === '2') {
         updateMatchState(matchId, isPlayoff, 'forfeit', 20, 0);
       }
    }
  };

  const updateMatchState = (matchId, isPlayoff, status, scoreA, scoreB) => {
    if (isPlayoff) {
      const newMatches = tourney.playoffs.matches.map(m => 
        m.id === matchId ? { ...m, status, scoreA, scoreB } : m
      );
      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
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
    if (!window.confirm("Cela va écraser les poules et le planning actuels. Continuer ?")) return;

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
  };

  const generatePlayoffs = () => {
    if (!canEdit) return;

    if (!tourney.schedule || tourney.schedule.length === 0) {
      alert("Impossible : Aucun match de poule n'a été généré. Veuillez d'abord créer le planning des poules.");
      return;
    }

    const resolvedMatches = tourney.schedule.filter(m => ['finished', 'forfeit', 'canceled'].includes(m.status)).length;
    const totalMatches = tourney.schedule.length;

    if (resolvedMatches < totalMatches) {
      const remaining = totalMatches - resolvedMatches;
      alert(`Impossible de générer la phase finale 🛑\n\nTous les matchs de poule doivent être terminés (ou annulés/forfaits).\nIl reste actuellement ${remaining} match(s) en attente.`);
      return;
    }

    if (tourney.playoffs && !window.confirm("Écraser la phase finale existante ?")) return;
    
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
    if (totalTeams < 2) { alert("Il faut au moins 2 équipes qualifiées."); return; }

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
  };

  const addTeam = () => {
    if (!canEdit || !teamName.trim()) return;
    update({ teams: [...tourney.teams, { id: "tm_" + Date.now(), name: teamName, players: [], groupId: null }] });
    setTeamName("");
  };

  const importGlobalTeam = async () => {
    if (!canEdit || !selectedGlobalTeamId) return;
    const gTeam = globalTeams.find(t => t.id === selectedGlobalTeamId);
    if (!gTeam) return;

    if (tourney.teams.some(t => t.global_id === gTeam.id)) {
      alert("Cette équipe a déjà été importée dans le tournoi !");
      return;
    }

    try {
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('player_id')
        .eq('team_id', gTeam.id)
        .eq('status', 'accepted');

      if (membersError) throw membersError;

      let newPlayers = [];
      if (members && members.length > 0) {
        const playerIds = members.map(m => m.player_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', playerIds);

        if (profilesError) throw profilesError;

        newPlayers = members.map((m, i) => {
          const prof = profiles.find(p => p.id === m.player_id);
          return {
            id: m.player_id, 
            name: prof?.full_name || "Joueur Inconnu",
            number: String(i + 4), 
            licenseStatus: 'to_check', 
            paid: 0,
            totalDue: 20
          };
        });
      }

      const newTeam = {
        id: "tm_" + Date.now(),
        global_id: gTeam.id, 
        name: gTeam.name,
        players: newPlayers,
        groupId: null
      };

      update({ teams: [...tourney.teams, newTeam] });
      setSelectedGlobalTeamId("");
      alert(`L'équipe ${gTeam.name} et ses ${newPlayers.length} joueurs ont été importés avec succès ! ✅`);
    } catch (error) {
      alert("Erreur lors de l'importation : " + error.message);
    }
  };

  const handleDraftChange = (index, field, value) => {
    const newDraft = [...playersDraft];
    newDraft[index][field] = value;
    setPlayersDraft(newDraft);
  };

  const addDraftRow = () => {
    setPlayersDraft([...playersDraft, { name: "", number: "" }]);
  };

  const removeDraftRow = (index) => {
    setPlayersDraft(playersDraft.filter((_, i) => i !== index));
  };

  const saveMultiplePlayers = (tid) => {
    if (!canEdit) return;
    
    const validPlayers = playersDraft.filter(p => p.name.trim() !== "");
    if (validPlayers.length === 0) return alert("Veuillez remplir au moins un nom !");
    
    const newPlayers = validPlayers.map((p, index) => ({
      id: "p_" + Date.now() + "_" + index, 
      name: p.name.trim(), 
      number: p.number || '0', 
      licenseStatus: 'to_check', 
      paid: 0, 
      totalDue: 20 
    }));

    update({ teams: tourney.teams.map(t => t.id === tid ? { ...t, players: [...t.players, ...newPlayers] } : t) });
    setPlayersDraft([{ name: "", number: "" }]);
  };

  const updatePlayerFinance = (teamId, playerId, field, value) => {
    if (!canEdit) return;
    const val = parseFloat(value) || 0;
    
    update({ 
      teams: tourney.teams.map(t => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          players: t.players.map(p => {
            if (p.id !== playerId) return p;
            const updatedPlayer = { ...p, [field]: val };
            const newPaid = updatedPlayer.paid || 0;
            const newTotal = updatedPlayer.totalDue || 0;
            const remaining = newTotal - newPaid;

            if (remaining <= 0) updatedPlayer.licenseStatus = 'validated';
            else if (newPaid > 0) updatedPlayer.licenseStatus = 'pending';
            else updatedPlayer.licenseStatus = 'to_check';

            return updatedPlayer;
          })
        };
      }) 
    });
  };

  // --- DRAG & DROP DES JOUEURS (KANBAN) ---
  const onDragStartPlayer = (e, playerId) => {
    if (!canEdit) { e.preventDefault(); return; }
    setDraggedPlayerId(playerId);
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragEndPlayer = (e) => {
    if (!canEdit) return;
    setDraggedPlayerId(null);
    // On efface tous les résidus de contour orange possibles sur la page entière
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  };

  useEffect(() => {
    setPlayersDraft([{ name: "", number: "" }]);
  }, [editId]);

  const onDropPlayer = (e, newStatus, teamId) => {
    if (!canEdit) return;
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over'); 
    
    const pid = e.dataTransfer.getData("playerId");
    if (!pid) return;
    
    const team = tourney.teams.find(t => t.id === teamId);
    if (!team) return;

    const updatedPlayers = team.players.map(p => p.id === pid ? { ...p, licenseStatus: newStatus } : p);
    update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers } : t) });
  };
  // -----------------------------------------

  const deletePlayer = (teamId, playerId) => {
    if (!canEdit) return;
    if(window.confirm("Supprimer définitivement ce joueur ?")) {
      const team = tourney.teams.find(t => t.id === teamId);
      update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: team.players.filter(p => p.id !== playerId) } : t) });
    }
  };

  const deleteTeam = (teamId) => {
    if (!canEdit) return;
    if(window.confirm("Supprimer définitivement cette équipe du tournoi ?")) {
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
    }
  };

  const handleUnlockOtm = async () => {
    const pin = window.prompt("Entrez le code PIN fourni par l'organisateur pour débloquer la Table de Marque :");
    if (!pin) return;

    try {
      const { error } = await supabase.rpc('join_as_otm', { pin: pin.trim().toUpperCase() });
      if (error) throw error;
      
      alert("Succès ! Vous êtes maintenant OTM sur ce tournoi. 🏀");
      
      setTournaments(prev => prev.map(t => {
        if (t.id === tourney.id) {
          return { ...t, otm_ids: [...(t.otm_ids || []), session?.user?.id] };
        }
        return t;
      }));

    } catch (err) {
      alert("Code PIN invalide ou erreur réseau.");
    }
  };

  const renderPlayerColumn = (title, status, color, team) => {
    const filteredPlayers = team.players.filter(p => p.licenseStatus === status || (!p.licenseStatus && status === 'to_check'));
    return (
      <div 
        className="dashboard-column"
        onDragOver={(e) => { if(canEdit) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); } }}
        onDragLeave={(e) => { if(canEdit) e.currentTarget.classList.remove('drag-over'); }}
        onDrop={(e) => {
          e.currentTarget.classList.remove('drag-over'); 
          onDropPlayer(e, status, team.id);
        }}
      >
        <h3 className="dashboard-col-title" style={{ borderBottom: `3px solid ${color}` }}>
          {title} <span style={{ opacity: 0.4 }}>({filteredPlayers.length})</span>
        </h3>
        
        <div className="dashboard-scroll-area">
          {filteredPlayers.map(p => {
            const remaining = (p.totalDue || 0) - (p.paid || 0);
            return (
              <div 
                key={p.id} 
                draggable={canEdit} 
                onDragStart={(e) => onDragStartPlayer(e, p.id)}
                onDragEnd={onDragEndPlayer}
                className={`dashboard-card ${draggedPlayerId === p.id ? 'grabbing' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <div className="dashboard-card-header">
                  <strong className="dashboard-card-title" style={{ color: color }}>#{p.number} {p.name}</strong>
                  {canEdit && <button onClick={() => deletePlayer(team.id, p.id)} className="dashboard-btn-delete">✕</button>}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#888' }}>
                  <span>Cotisation :</span>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <input type="number" disabled={!canEdit} value={p.paid} onChange={(e) => updatePlayerFinance(team.id, p.id, 'paid', e.target.value)} className="tm-mini-input" style={{ width: '45px', textAlign: 'center' }} />
                    <span style={{color: '#444'}}>/</span>
                    <input type="number" disabled={!canEdit} value={p.totalDue} onChange={(e) => updatePlayerFinance(team.id, p.id, 'totalDue', e.target.value)} className="tm-mini-input" style={{ width: '45px', textAlign: 'center' }} />
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.75rem', marginTop: '-2px' }}>
                  {remaining <= 0 ? (
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✅ Réglé</span>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>⚠️ Reste : {remaining} €</span>
                  )}
                </div>
                {canEdit && <div className="dashboard-drag-handle" style={{ marginTop: '4px' }}>⠿ GLISSER POUR CHANGER DE STATUT</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const validateAllPlayers = (teamId) => {
    if (!canEdit) return;
    if(window.confirm("Passer tous les joueurs de cette équipe en 'VALIDÉ' ?")) {
      const team = tourney.teams.find(t => t.id === teamId);
      const updatedPlayers = team.players.map(p => ({ ...p, licenseStatus: 'validated' }));
      update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers } : t) });
    }
  };

  const getPlayerStats = () => {
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
  };

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

  if (editId) {
    const team = (tourney.teams || []).find(t => t.id === editId);
    return (
      <div style={{ padding: '20px' }}>
        <button onClick={() => setEditId(null)} className="btn-tab">⬅ RETOUR</button>
        <div className="tm-flex-between" style={{ margin: '20px 0', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Équipe : {team?.name}</h2>
                {canEdit && <button onClick={() => validateAllPlayers(team.id)} className="tm-btn-success" style={{ padding: '8px 15px', fontSize: '0.8rem' }}>✅ TOUT VALIDER</button>}
            </div>
            {canEdit && (
              <div style={{ background: '#222', padding: '15px', borderRadius: '8px', border: '1px dashed #555', width: '100%', maxWidth: '500px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#ccc', fontSize: '0.9rem' }}>➕ Ajout rapide (Multiple)</h4>
                
                {playersDraft.map((draft, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input 
                      className="tm-input" 
                      placeholder="Nom du joueur" 
                      value={draft.name} 
                      onChange={e => handleDraftChange(index, 'name', e.target.value)} 
                      style={{ flex: 1 }} 
                    />
                    <input 
                      className="tm-input" 
                      style={{ width: '60px' }} 
                      type="number" 
                      placeholder="N°" 
                      value={draft.number} 
                      onChange={e => handleDraftChange(index, 'number', e.target.value)} 
                    />
                    {playersDraft.length > 1 && (
                      <button onClick={() => removeDraftRow(index)} style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                    )}
                  </div>
                ))}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                  <button onClick={addDraftRow} style={{ background: 'transparent', color: 'var(--accent-blue)', border: '1px dashed var(--accent-blue)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    + Ligne
                  </button>
                  <button onClick={() => saveMultiplePlayers(team.id)} className="tm-btn-success">
                    💾 SAUVEGARDER
                  </button>
                </div>
              </div>
            )}
        </div>
        <div className="dashboard-pipeline" style={{ height: '65vh' }}>
          {renderPlayerColumn("À VÉRIFIER", "to_check", "#ff4444", team)}
          {renderPlayerColumn("EN ATTENTE", "pending", "var(--accent-orange)", team)}
          {renderPlayerColumn("VALIDÉ", "validated", "var(--success)", team)}
        </div>
      </div>
    );
  }

  const savedGroupIds = [...new Set((tourney.teams || []).map(t => t.groupId).filter(g => g !== null))].sort((a,b) => a-b);

  const totalQualified = savedGroupIds.reduce((sum, gNum) => sum + getGroupLimit(tourney, gNum), 0);
  
  let bracketSize = 2;
  while (bracketSize < totalQualified && bracketSize <= 1024) { 
    bracketSize *= 2; 
  }
  const numByes = Math.max(0, bracketSize - totalQualified);

  const getStartRoundName = (size) => {
      if (size === 2) return "LA FINALE";
      if (size === 4) return "LES DEMI-FINALES";
      if (size === 8) return "LES QUARTS DE FINALE";
      if (size === 16) return "LES 8ÈMES DE FINALE";
      if (size === 32) return "LES 16ÈMES DE FINALE";
      return "LA PHASE FINALE";
  };

  const playoffRounds = [];
  if (tourney.playoffs && tourney.playoffs.matches) {
      const maxRound = Math.max(1, ...tourney.playoffs.matches.map(m => m.round || 1));
      for (let r = 1; r <= maxRound; r++) {
          playoffRounds.push(tourney.playoffs.matches.filter(m => (m.round || 1) === r));
      }
  }

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
        <>
          <div className="tm-panel">
            <h3>1. Équipes et Licences</h3>
            {canEdit && (
              <div style={{ display: 'flex', gap: '40px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px', display: 'flex', gap: '10px', background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px dashed #444' }}>
                  <input className="tm-input" style={{ flex: 1 }} placeholder="Créer manuellement..." value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                  <button onClick={addTeam} className="tm-btn-success">AJOUTER</button>
                </div>

                <div style={{ flex: 1, minWidth: '300px', display: 'flex', gap: '10px', background: 'rgba(0, 102, 204, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid var(--accent-blue)' }}>
                  <select 
                    value={selectedGlobalTeamId} 
                    onChange={e => setSelectedGlobalTeamId(e.target.value)}
                    className="tm-input" 
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Choisir une équipe du réseau --</option>
                    {globalTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} {t.city ? `(${t.city})` : ''}</option>
                    ))}
                  </select>
                  <button onClick={importGlobalTeam} style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '0 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ⬇️ IMPORTER
                  </button>
                </div>
              </div>
            )}
            
            <div className="tm-grid-teams">
              {(tourney.teams || []).map(t => (
                <div key={t.id} className="tm-card" style={{ position: 'relative' }}>
                  {t.global_id && <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--accent-blue)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.6rem' }} title="Équipe du réseau">🌐</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b>{t.name}</b>
                    {canEdit && <button onClick={() => deleteTeam(t.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>✕</button>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#888', margin: '5px 0' }}>
                    {t.players.filter(p => p.licenseStatus === 'validated').length} / {t.players.length} licences OK
                  </div>
                  <button onClick={() => setEditId(t.id)} className="tm-small-btn">VOIR EFFECTIF</button>
                </div>
              ))}
            </div>
          </div>

          <div className="tm-panel">
            <h3>2. Planning & Groupes</h3>
            {canEdit && (
              <div className="tm-flex-gap">
                  <label>Nombre de poules :</label>
                  <input type="number" min="1" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} className="tm-input" style={{ width: '60px' }} />
                  <button onClick={generateDrawAndSchedule} className="tm-btn-success tm-btn-purple">
                    🎲 NOUVEAU TIRAGE & PLANNING AUTO
                  </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', overflowX: 'auto', gap: '20px' }}>
            {savedGroupIds.map(gNum => {
                const standings = getGroupStandings(gNum);
                const limit = getGroupLimit(tourney, gNum);
                return (
                  <div key={gNum} className="tm-group-col">
                    <div className="tm-flex-between" style={{ marginBottom: '10px' }}>
                      <h4 style={{ margin: 0 }}>POULE {gNum}</h4>
                      <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>Qualifiés:</span>
                        <input 
                          type="number" 
                          disabled={!canEdit} 
                          value={tourney.qualifiedSettings?.[gNum] ?? 2} 
                          onChange={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (isNaN(val)) val = 0;
                            update({ qualifiedSettings: { ...(tourney.qualifiedSettings || {}), [gNum]: val } });
                          }}
                          className="tm-mini-input" 
                          style={{ width: '45px' }} 
                        />
                      </div>
                    </div>
                    <table style={{ width: '100%', fontSize: '0.75rem', marginBottom: '15px' }}>
                      <thead><tr style={{ color: '#666', fontSize: '0.6rem' }}><th align="left">NOM</th><th align="right">PTS</th><th align="right">+/-</th></tr></thead>
                      <tbody>
                        {standings.map((team, idx) => (
                          <tr key={team.id} style={{ color: idx < limit ? '#fff' : '#444' }}>
                            <td>{idx + 1}. {team.name} {idx < limit && "⭐"}</td>
                            <td align="right">{team.points}</td>
                            <td align="right" style={{ color: team.diff > 0 ? 'var(--success)' : (team.diff < 0 ? 'var(--danger)' : '#666') }}>{team.diff > 0 ? `+${team.diff}` : team.diff}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(tourney.schedule || []).filter(m => m.group === gNum).map(m => {
                      const isReady = m.teamA?.players?.length >= 5 && m.teamB?.players?.length >= 5;
                      const isFinished = m.status === 'finished';
                      const isCanceled = m.status === 'canceled';
                      const isForfeit = m.status === 'forfeit';
                      const isOngoing = !isFinished && !isCanceled && !isForfeit && !!localStorage.getItem(`basketMatchSave_${m.id}`);
                      const canClick = isReady || isFinished;
                      
                      // Vérification des droits spécifiques au match
                      const isAssignedOtm = currentUserName && m.otm && m.otm.includes(currentUserName);
                      const canLaunchThisMatch = canEdit || isAssignedOtm;
                      
                      return (
                        <div 
                          key={m.id} 
                          draggable={canEdit}
                          onDragStart={(e) => {
                              if(!canEdit) return;
                              setDraggedMatchId(m.id);
                              e.dataTransfer.setData("matchId", m.id);
                              e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={(e) => {
                              setDraggedMatchId(null);
                          }}
                          onDragOver={(e) => {
                              if(!canEdit) return;
                              e.preventDefault();
                              if(draggedMatchId && draggedMatchId !== m.id) {
                                  e.currentTarget.style.transform = "scale(1.02)";
                                  e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 165, 0, 0.4)";
                              }
                          }}
                          onDragLeave={(e) => {
                              if(!canEdit) return;
                              // FIX: On réinitialise purement le style !
                              e.currentTarget.style.transform = "";
                              e.currentTarget.style.boxShadow = "";
                          }}
                          onDrop={(e) => {
                              if(!canEdit) return;
                              e.preventDefault();
                              // FIX: Nettoyage immédiat au drop
                              e.currentTarget.style.transform = "";
                              e.currentTarget.style.boxShadow = "";
                              
                              const sourceMatchId = e.dataTransfer.getData("matchId");
                              if (!sourceMatchId || sourceMatchId === m.id) return;
                              
                              const newSchedule = [...tourney.schedule];
                              const sourceIndex = newSchedule.findIndex(x => x.id === sourceMatchId);
                              const targetIndex = newSchedule.findIndex(x => x.id === m.id);
                              
                              if (sourceIndex > -1 && targetIndex > -1) {
                                  const temp = newSchedule[sourceIndex];
                                  newSchedule[sourceIndex] = newSchedule[targetIndex];
                                  newSchedule[targetIndex] = temp;
                                  update({ schedule: newSchedule });
                              }
                          }}
                          className="tm-match-row"
                          style={{
                            borderLeft: `3px solid ${isOngoing ? 'var(--accent-blue)' : ((isCanceled || isForfeit) ? '#666' : (canClick ? 'var(--success)' : 'var(--danger)'))}`,
                            cursor: canEdit ? (draggedMatchId === m.id ? 'grabbing' : 'grab') : 'default',
                            opacity: draggedMatchId === m.id ? 0.4 : (isCanceled ? 0.6 : 1),
                            position: 'relative',
                            transition: 'all 0.2s ease'
                          }}
                        >
                           {canEdit && <div style={{ position: 'absolute', top: '8px', right: '12px', color: '#666', fontSize: '1.2rem' }} title="Glisser pour intervertir">⠿</div>}
                           
                           {isOngoing && <div className="tm-ribbon-ongoing">EN COURS</div>}
                           {isFinished && <div className="tm-ribbon-finished">TERMINÉ</div>}
                           {isCanceled && <div className="tm-ribbon-finished" style={{background: '#555'}}>ANNULÉ</div>}
                           {isForfeit && <div className="tm-ribbon-finished" style={{background: 'var(--danger)'}}>FORFAIT</div>}
                           
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '40px' }}>
                             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                               <span style={{ fontSize: '0.8rem', color: (isFinished || isForfeit) ? (m.scoreA > m.scoreB ? 'var(--success)' : 'var(--danger)') : 'white', textDecoration: isCanceled ? 'line-through' : 'none' }}>{m.teamA?.name || 'Équipe A'}</span>
                               {(isFinished || isCanceled || isForfeit) && <b>{m.scoreA}</b>}
                             </div>
                             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                               <span style={{ fontSize: '0.8rem', color: (isFinished || isForfeit) ? (m.scoreB > m.scoreA ? 'var(--success)' : 'var(--danger)') : 'white', textDecoration: isCanceled ? 'line-through' : 'none' }}>{m.teamB?.name || 'Équipe B'}</span>
                               {(isFinished || isCanceled || isForfeit) && <b>{m.scoreB}</b>}
                             </div>
                             {/* AFFICHAGE DE L'OTM */}
                             {m.otm && <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '2px' }}>📋 OTM : <span style={{color: 'var(--accent-blue)', fontWeight: 'bold'}}>{m.otm}</span></div>}
                           </div>
                           
                           <div style={{ display: 'flex', gap: '8px', marginTop: '10px', height: '35px' /* 🛠️ Hauteur globale réduite */ }}>
                              <button onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!canClick && !['canceled', 'forfeit'].includes(m.status)) { alert(`Impossible de lancer : il manque des joueurs.`); return; }
                                                  
                                                  if (!['canceled', 'forfeit'].includes(m.status)) handleLaunchMatch(m.id, canLaunchThisMatch);
                                                }}
                              className={`tm-launch-btn ${canClick ? 'ready' : 'not-ready'}`} 
                              style={{ 
                                backgroundColor: isOngoing ? 'var(--accent-blue)' : ((isCanceled || isForfeit) ? '#333' : ''), 
                                flex: 1, 
                                margin: 0,
                                padding: '0 10px', /* 🛠️ Padding réduit */
                                fontSize: '0.8rem', /* 🛠️ Police plus petite */
                                height: '100%'
                              }}
                              disabled={isCanceled || isForfeit}
                              >
                                  {isCanceled ? "MATCH ANNULÉ" : isForfeit ? "VICTOIRE PAR FORFAIT" : (isFinished ? "VOIR LES STATS 📊" : (canLaunchThisMatch ? (isOngoing ? "REPRENDRE 🏀" : "LANCER LE MATCH 🏀") : "SUIVRE EN DIRECT 🔴"))}
                              </button>
                              
                              {(!isFinished && !isCanceled && !isForfeit && canEdit) && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, false); }} style={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Assigner un OTM">👤</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', false); }} style={{ backgroundColor: '#444', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Annuler le match">❌</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'forfeit', false); }} style={{ backgroundColor: 'var(--danger)', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Déclarer un forfait">🏳️</button>
                                </div>
                              )}
                            </div>
                        </div>
                      );
                    })}
                  </div>
                );
            })}
          </div>
        </>
      )}

      {activeTab === "finale" && (
        <div className="tm-panel">
          <div className="tm-flex-between" style={{ marginBottom: '20px' }}>
            <h3>🏆 Phase Finale</h3>
            {(tourney.playoffs && canEdit) && <button onClick={() => update({playoffs: null})} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>RESET TABLEAU</button>}
          </div>
          {!tourney.playoffs ? (
            <div style={{ textAlign: 'center', padding: '40px', border: '1px dashed #333', borderRadius: '12px' }}>
                <p style={{ marginBottom: '20px', fontSize: '1.1rem' }}>
                    <b>{totalQualified} équipes</b> sont actuellement qualifiées d'après vos réglages.
                </p>
                {totalQualified >= 2 ? (
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                        {numByes > 0 ? (
                            <span style={{ color: 'var(--accent-orange)' }}>
                                L'arbre sera de <b>{bracketSize} places</b>. <br/>Les <b>{numByes} meilleures équipes</b> (1ers de poule) sauteront le premier tour !
                            </span>
                        ) : (
                            <span style={{ color: 'var(--success)' }}>Le format est parfait pour un tableau symétrique !</span>
                        )}
                        {canEdit && (
                          <button onClick={generatePlayoffs} className="tm-btn-success" style={{ padding: '15px 30px', fontSize: '1.2rem', marginTop: '10px' }}>
                              🚀 GÉNÉRER {getStartRoundName(bracketSize)}
                          </button>
                        )}
                    </div>
                ) : (
                    <div style={{ color: 'var(--danger)' }}>Il faut au moins 2 équipes qualifiées.</div>
                )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '40px', overflowX: 'auto', padding: '20px 10px', minHeight: '500px' }}>
                {playoffRounds.map((roundMatches, rIdx) => {
                    const matchCount = roundMatches.length;
                    let colTitle = `TOUR ${rIdx + 1}`;
                    if (matchCount === 1) colTitle = "FINALE 🏆";
                    else if (matchCount === 2) colTitle = "DEMI-FINALES";
                    else if (matchCount === 4) colTitle = "QUARTS DE FINALE";
                    else if (matchCount === 8) colTitle = "8ÈMES DE FINALE";
                    else if (matchCount === 16) colTitle = "16ÈMES DE FINALE";

                    return (
                        <div key={rIdx} style={{ display: 'flex', flexDirection: 'column', minWidth: '280px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '15px' }}>
                            <h3 style={{ textAlign: 'center', color: 'var(--accent-orange)', margin: '0 0 25px 0', borderBottom: '2px solid #333', paddingBottom: '15px', fontSize: '1.1rem' }}>
                                {colTitle}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '30px', flex: 1 }}>
                                {roundMatches.map(m => {
                                    const isReady = m.teamA?.players?.length >= 5 && m.teamB?.players?.length >= 5;
                                    const isFinished = m.status === 'finished';
                                    const isCanceled = m.status === 'canceled';
                                    const isForfeit = m.status === 'forfeit';
                                    const isOngoing = !isFinished && !isCanceled && !isForfeit && !!localStorage.getItem(`basketMatchSave_${m.id}`);
                                    const canClick = isReady || isFinished;
                                    
                                    // Vérification des droits spécifiques au match
                                    const isAssignedOtm = currentUserName && m.otm && m.otm.includes(currentUserName);
                                    const canLaunchThisMatch = canEdit || isAssignedOtm;
                                    
                                    return (
                                        <div 
                                          key={m.id} 
                                          className="tm-match-row"
                                          draggable={canEdit}
                                          onDragStart={(e) => {
                                              if(!canEdit) return;
                                              setDraggedMatchId(m.id);
                                              e.dataTransfer.setData("matchId", m.id);
                                              e.dataTransfer.effectAllowed = "move";
                                          }}
                                          onDragEnd={(e) => {
                                              setDraggedMatchId(null);
                                          }}
                                          onDragOver={(e) => {
                                              if(!canEdit) return;
                                              e.preventDefault();
                                              if(draggedMatchId && draggedMatchId !== m.id) {
                                                  e.currentTarget.style.transform = "scale(1.02)";
                                                  e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 165, 0, 0.4)";
                                              }
                                          }}
                                          onDragLeave={(e) => {
                                              if(!canEdit) return;
                                              // FIX: On réinitialise purement le style !
                                              e.currentTarget.style.transform = "";
                                              e.currentTarget.style.boxShadow = "";
                                          }}
                                          onDrop={(e) => {
                                              if(!canEdit) return;
                                              e.preventDefault();
                                              // FIX: Nettoyage immédiat au drop
                                              e.currentTarget.style.transform = "";
                                              e.currentTarget.style.boxShadow = "";
                                              
                                              const sourceMatchId = e.dataTransfer.getData("matchId");
                                              if (!sourceMatchId || sourceMatchId === m.id) return;
                                              
                                              const newMatches = [...tourney.playoffs.matches];
                                              const sourceIndex = newMatches.findIndex(x => x.id === sourceMatchId);
                                              const targetIndex = newMatches.findIndex(x => x.id === m.id);
                                              
                                              if (sourceIndex > -1 && targetIndex > -1) {
                                                  const temp = newMatches[sourceIndex];
                                                  newMatches[sourceIndex] = newMatches[targetIndex];
                                                  newMatches[targetIndex] = temp;
                                                  update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
                                              }
                                          }}
                                          style={{ 
                                              padding: '15px', 
                                              background: isFinished ? '#1a1a1a' : '#111', 
                                              borderLeft: `4px solid ${isOngoing ? 'var(--accent-blue)' : ((isCanceled || isForfeit) ? '#666' : (canClick ? 'var(--accent-orange)' : 'var(--danger)'))}`,
                                              position: 'relative',
                                              cursor: canEdit ? (draggedMatchId === m.id ? 'grabbing' : 'grab') : 'default',
                                              opacity: draggedMatchId === m.id ? 0.4 : (isCanceled ? 0.6 : 1),
                                              transition: 'all 0.2s ease'
                                          }}
                                        >
                                            {canEdit && <div style={{ position: 'absolute', top: '8px', right: '12px', color: '#666', fontSize: '1.2rem' }} title="Glisser pour intervertir">⠿</div>}

                                            {isOngoing && <div className="tm-ribbon-ongoing">EN COURS</div>}
                                            {isFinished && <div className="tm-ribbon-finished">TERMINÉ</div>}
                                            {isCanceled && <div className="tm-ribbon-finished" style={{background: '#555'}}>ANNULÉ</div>}
                                            {isForfeit && <div className="tm-ribbon-finished" style={{background: 'var(--danger)'}}>FORFAIT</div>}
                                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', fontWeight: 'bold', marginBottom: '10px' }}>{m.label}</div>
                                            
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ color: (isFinished || isForfeit) ? (m.scoreA > m.scoreB ? 'var(--success)' : 'var(--danger)') : 'white', fontWeight: (isFinished || isForfeit) && m.scoreA > m.scoreB ? 'bold' : 'normal', textDecoration: isCanceled ? 'line-through' : 'none' }}>
                                                    {m.teamA?.name || <span style={{color: '#555', fontStyle: 'italic'}}>À déterminer...</span>}
                                                </span>
                                                {(isFinished || isCanceled || isForfeit) && <b>{m.scoreA}</b>}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                                <span style={{ color: (isFinished || isForfeit) ? (m.scoreB > m.scoreA ? 'var(--success)' : 'var(--danger)') : 'white', fontWeight: (isFinished || isForfeit) && m.scoreB > m.scoreA ? 'bold' : 'normal', textDecoration: isCanceled ? 'line-through' : 'none' }}>
                                                    {m.teamB?.name || <span style={{color: '#555', fontStyle: 'italic'}}>À déterminer...</span>}
                                                </span>
                                                {(isFinished || isCanceled || isForfeit) && <b>{m.scoreB}</b>}
                                            </div>
                                            
                                            {/* AFFICHAGE DE L'OTM */}
                                            {m.otm && <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '10px' }}>📋 OTM : <span style={{color: 'var(--accent-orange)', fontWeight: 'bold'}}>{m.otm}</span></div>}
                                            
                                            {(m.teamA?.isBye || m.teamB?.isBye) ? (
                                                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#888', marginTop: '10px', padding: '6px', background: '#222', borderRadius: '4px', border: '1px dashed #444' }}>
                                                    ⏩ QUALIFICATION DIRECTE
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', height: '35px' /* 🛠️ Hauteur globale réduite */ }}>
                              <button onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!canClick && !['canceled', 'forfeit'].includes(m.status)) { alert(`Impossible de lancer : il manque des joueurs.`); return; }
                                                  
                                                  if (!['canceled', 'forfeit'].includes(m.status)) handleLaunchMatch(m.id, canLaunchThisMatch);
                                                }}
                              className={`tm-launch-btn ${canClick ? 'ready' : 'not-ready'}`} 
                              style={{ 
                                backgroundColor: isOngoing ? 'var(--accent-blue)' : ((isCanceled || isForfeit) ? '#333' : ''), 
                                flex: 1, 
                                margin: 0,
                                padding: '0 10px', /* 🛠️ Padding réduit */
                                fontSize: '0.8rem', /* 🛠️ Police plus petite */
                                height: '100%'
                              }}
                              disabled={isCanceled || isForfeit}
                              >
                                  {isCanceled ? "MATCH ANNULÉ" : isForfeit ? "VICTOIRE PAR FORFAIT" : (isFinished ? "VOIR LES STATS 📊" : (canLaunchThisMatch ? (isOngoing ? "REPRENDRE 🏀" : "LANCER LE MATCH 🏀") : "SUIVRE EN DIRECT 🔴"))}
                              </button>
                              
                              {(!isFinished && !isCanceled && !isForfeit && canEdit) && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={(e) => { e.stopPropagation(); handleAssignOtm(m.id, false); }} style={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Assigner un OTM">👤</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'cancel', false); }} style={{ backgroundColor: '#444', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Annuler le match">❌</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleMatchException(m.id, 'forfeit', false); }} style={{ backgroundColor: 'var(--danger)', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: '0.2s' }} title="Déclarer un forfait">🏳️</button>
                                </div>
                              )}
                            </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="tm-panel">
          <div className="tm-flex-between" style={{ marginBottom: '20px' }}>
            <h3>📈 Leaderboards du Tournoi</h3>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>Statistiques basées sur les matchs terminés</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {renderTop5("🌟 MVP (Meilleure Évaluation)", getPlayerStats(), "eff", "eff", "var(--accent-orange)")}
            {renderTop5("🎯 Top Marqueurs (PTS)", getPlayerStats(), "points", "points", "#ff4444", "pts")}
            {renderTop5("🛡️ Top Rebondeurs", getPlayerStats(), "reb", "reb", "var(--accent-blue)", "reb")}
            {renderTop5("🤝 Top Passeurs", getPlayerStats(), "ast", "ast", "var(--success)", "ast")}
            {renderTop5("🥷 Top Intercepteurs", getPlayerStats(), "stl", "stl", "#f1c40f", "stl")}
            {renderTop5("🧱 Top Contreurs", getPlayerStats(), "blk", "blk", "var(--accent-purple)", "blk")}
            
            {/* Nouveaux : Adresse au tir (avec minimum de tentatives pour être classé) */}
            {renderTop5("🔥 Plus Adroit (Général)", getPlayerStats().filter(p => p.fga >= 5), "fgPct", "fgPctDisplay", "#e74c3c")}
            {renderTop5("🎯 Sniper 2 Pts", getPlayerStats().filter(p => p.fg2a >= 3), "fg2Pct", "fg2PctDisplay", "#2ecc71")}
            {renderTop5("🏹 Sniper 3 Pts", getPlayerStats().filter(p => p.fg3a >= 3), "fg3Pct", "fg3PctDisplay", "#3498db")}
            {renderTop5("⚖️ Métronome Lancers Francs", getPlayerStats().filter(p => p.fta >= 3), "ftPct", "ftPctDisplay", "#95a5a6")}
          </div>
        </div>
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
    </div>
  );
}