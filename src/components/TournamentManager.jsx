import React, { useState, useEffect } from 'react'; // N'oublie pas d'importer useEffect si ce n'est pas fait

export default function TournamentManager({ tourney, setTournaments, onLaunchMatch }) {
  // 1. On lit l'onglet sauvegardé (ou "poules" par défaut)
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('tm_active_tab') || "poules";
  });

  // 2. On sauvegarde l'onglet à chaque fois qu'on change de vue
  useEffect(() => {
    localStorage.setItem('tm_active_tab', activeTab);
  }, [activeTab]);

  const [teamName, setTeamName] = useState("");
  const [editId, setEditId] = useState(null);
  const [pName, setPName] = useState("");
  const [pNum, setPNum] = useState("");
  const [groupCount, setGroupCount] = useState(1);
  const [draggedPlayerId, setDraggedPlayerId] = useState(null); // <-- Ligne existante
  const [draggedMatchId, setDraggedMatchId] = useState(null);   // <-- LIGNE À AJOUTER

  const update = (data) => setTournaments(prev => prev.map(t => t.id === tourney.id ? { ...t, ...data } : t));

  // --- AUTOMATISATION DE L'ARBRE DE TOURNOI ---
  useEffect(() => {
    if (!tourney.playoffs || !tourney.playoffs.matches) return;
    
    let updated = false;
    const newMatches = [...tourney.playoffs.matches];

    newMatches.forEach(m => {
      // Si le match est fini et qu'il a une suite logique dans l'arbre
      if (m.status === 'finished' && m.nextMatchId) {
        let winner = null;
        if (m.teamB?.isBye) winner = m.teamA;
        else if (m.teamA?.isBye) winner = m.teamB;
        else if (m.scoreA > m.scoreB) winner = m.teamA;
        else if (m.scoreB > m.scoreA) winner = m.teamB;

        if (!winner) return;

        const nextMatchIndex = newMatches.findIndex(x => x.id === m.nextMatchId);
        if (nextMatchIndex !== -1) {
          const nextMatch = newMatches[nextMatchIndex];
          // Si le gagnant n'est pas encore dans sa case du match suivant, on l'y met !
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
  // ---------------------------------------------

  const handleLaunchMatch = (matchId) => {
    let match = tourney.schedule.find(m => m.id === matchId);
    if (!match && tourney.playoffs) {
      match = tourney.playoffs.matches.find(m => m.id === matchId);
    }
    if (match) {
      onLaunchMatch(matchId);
    }
  };

  const generateDrawAndSchedule = () => {
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
            teamA: gTeams[i], 
            teamB: gTeams[j], 
            status: 'pending', 
            scoreA: 0, 
            scoreB: 0 
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
    if (tourney.playoffs && !window.confirm("Écraser la phase finale existante ?")) return;
    const qualifiedTeams = [];
    const savedGroupIds = [...new Set(tourney.teams.map(t => t.groupId).filter(g => g !== null))].sort((a,b) => a-b);
    
    // On trie intelligemment : tous les 1ers de poule d'abord, puis tous les 2èmes, etc.
    let maxLimit = 0;
    savedGroupIds.forEach(gNum => {
        const limit = tourney.qualifiedSettings?.[gNum] || 2;
        if(limit > maxLimit) maxLimit = limit;
    });

    for(let rank = 0; rank < maxLimit; rank++) {
        savedGroupIds.forEach(gNum => {
            const limit = tourney.qualifiedSettings?.[gNum] || 2;
            if (rank < limit) {
                const standings = getGroupStandings(gNum);
                if (standings[rank]) qualifiedTeams.push(standings[rank]);
            }
        });
    }

    const totalTeams = qualifiedTeams.length;
    if (totalTeams < 2) { alert("Il faut au moins 2 équipes qualifiées."); return; }

    // Calcul de la taille de l'arbre (la puissance de 2 immédiatement supérieure)
    let size = 2;
    while (size < totalTeams) size *= 2;

    // Création des places : on place nos équipes, et on remplit le reste avec des "EXEMPTÉ"
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

    // 1er tour (avec application des exemptions automatiques)
    for (let i = 0; i < numMatchesInRound; i++) {
        const tA = seeded[i];
        const tB = seeded[size - 1 - i];
        const hasBye = tA.isBye || tB.isBye;

        matches.push({
            id: `p_${ts}_r${roundNum}_m${i}`,
            round: roundNum,
            teamA: tA,
            teamB: tB, 
            scoreA: 0, scoreB: 0, 
            status: hasBye ? 'finished' : 'pending', // Terminé d'avance si exempté !
            label: getRoundLabel(numMatchesInRound, i),
            nextMatchId: numMatchesInRound === 1 ? null : `p_${ts}_r${roundNum+1}_m${Math.floor(i/2)}`,
            nextSlot: i % 2 === 0 ? 'teamA' : 'teamB' 
        });
    }

    // Tours suivants (vides)
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
    if (!teamName.trim()) return;
    update({ teams: [...tourney.teams, { id: "tm_" + Date.now(), name: teamName, players: [], groupId: null }] });
    setTeamName("");
  };

  const addPlayer = (tid) => {
    if (!pName.trim() || !pNum.trim()) return;
    const newPlayer = { id: "p_" + Date.now(), name: pName, number: pNum, licenseStatus: 'to_check', paid: 0, totalDue: 20 };
    update({ teams: tourney.teams.map(t => t.id === tid ? { ...t, players: [...t.players, newPlayer] } : t) });
    setPName(""); setPNum("");
  };

  const updatePlayerFinance = (teamId, playerId, field, value) => {
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

            if (remaining <= 0) {
                updatedPlayer.licenseStatus = 'validated';
            } else if (newPaid > 0) {
                updatedPlayer.licenseStatus = 'pending';
            } else {
                updatedPlayer.licenseStatus = 'to_check';
            }

            return updatedPlayer;
          })
        };
      }) 
    });
  };

  // --- LOGIQUE DRAG & DROP POUR LES JOUEURS ---
  const onDragStartPlayer = (e, playerId) => {
    setDraggedPlayerId(playerId);
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => { if(e.target) { e.target.style.opacity = "0.2"; e.target.style.transform = "scale(0.95)"; } }, 0);
  };

  const onDragEndPlayer = (e) => {
    setDraggedPlayerId(null);
    if(e.target) { e.target.style.opacity = "1"; e.target.style.transform = "scale(1)"; }
  };

  const onDropPlayer = (e, newStatus, teamId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const pid = e.dataTransfer.getData("playerId");
    if (!pid) return;
    const team = tourney.teams.find(t => t.id === teamId);
    const updatedPlayers = team.players.map(p => p.id === pid ? { ...p, licenseStatus: newStatus } : p);
    update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers } : t) });
  };

  const deletePlayer = (teamId, playerId) => {
    if(window.confirm("Supprimer définitivement ce joueur ?")) {
        const team = tourney.teams.find(t => t.id === teamId);
        update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: team.players.filter(p => p.id !== playerId) } : t) });
    }
  };

  const renderPlayerColumn = (title, status, color, team) => {
    const filteredPlayers = team.players.filter(p => p.licenseStatus === status || (!p.licenseStatus && status === 'to_check'));
    return (
      <div 
        className="dashboard-column"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
        onDrop={(e) => onDropPlayer(e, status, team.id)}
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
                draggable 
                onDragStart={(e) => onDragStartPlayer(e, p.id)}
                onDragEnd={onDragEndPlayer}
                className={`dashboard-card ${draggedPlayerId === p.id ? 'grabbing' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <div className="dashboard-card-header">
                  <strong className="dashboard-card-title" style={{ color: color }}>#{p.number} {p.name}</strong>
                  <button onClick={() => deletePlayer(team.id, p.id)} className="dashboard-btn-delete">✕</button>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#888' }}>
                  <span>Cotisation :</span>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <input type="number" value={p.paid} onChange={(e) => updatePlayerFinance(team.id, p.id, 'paid', e.target.value)} className="tm-mini-input" style={{ width: '45px', textAlign: 'center' }} title="Montant Payé" />
                    <span style={{color: '#444'}}>/</span>
                    <input type="number" value={p.totalDue} onChange={(e) => updatePlayerFinance(team.id, p.id, 'totalDue', e.target.value)} className="tm-mini-input" style={{ width: '45px', textAlign: 'center' }} title="Total Dû" />
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.75rem', marginTop: '-2px' }}>
                  {remaining <= 0 ? (
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✅ Réglé</span>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>⚠️ Reste : {remaining} €</span>
                  )}
                </div>

                <div className="dashboard-drag-handle" style={{ marginTop: '4px' }}>⠿ GLISSER POUR CHANGER DE STATUT</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getGroupStandings = (gNum) => {
    const groupTeams = tourney.teams.filter(t => t.groupId === gNum);
    return groupTeams.map(team => {
      let points = 0, diff = 0;
      tourney.schedule.filter(m => m.group === gNum && m.status === 'finished' && (m.teamA.id === team.id || m.teamB.id === team.id)).forEach(m => {
        const isA = m.teamA.id === team.id;
        const s = isA ? m.scoreA : m.scoreB; const o = isA ? m.scoreB : m.scoreA;
        if (s > o) points += 2; else points += 1;
        diff += (s - o);
      });
      return { ...team, points, diff };
    }).sort((a,b) => b.points - a.points || b.diff - a.diff);
  };

  const validateAllPlayers = (teamId) => {
    if(window.confirm("Passer tous les joueurs de cette équipe en 'VALIDÉ' ?")) {
        const team = tourney.teams.find(t => t.id === teamId);
        const updatedPlayers = team.players.map(p => ({ ...p, licenseStatus: 'validated' }));
        update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers } : t) });
    }
  };

  if (editId) {
    const team = tourney.teams.find(t => t.id === editId);
    return (
      <div style={{ padding: '20px' }}>
        <button onClick={() => setEditId(null)} className="btn-tab">⬅ RETOUR</button>
        <div className="tm-flex-between" style={{ margin: '20px 0', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Équipe : {team?.name}</h2>
                <button onClick={() => validateAllPlayers(team.id)} className="tm-btn-success" style={{ padding: '8px 15px', fontSize: '0.8rem' }}>✅ TOUT VALIDER</button>
            </div>
            <div className="tm-flex-gap" style={{ gap: '10px' }}>
                <input className="tm-input" placeholder="Nom du joueur" value={pName} onChange={e => setPName(e.target.value)} />
                <input className="tm-input" style={{ width: '60px' }} type="number" placeholder="N°" value={pNum} onChange={e => setPNum(e.target.value)} />
                <button onClick={() => addPlayer(team.id)} className="tm-btn-success">+ AJOUTER</button>
            </div>
        </div>
        
        <div className="dashboard-pipeline" style={{ height: '65vh' }}>
          {renderPlayerColumn("À VÉRIFIER", "to_check", "#ff4444", team)}
          {renderPlayerColumn("EN ATTENTE", "pending", "var(--accent-orange)", team)}
          {renderPlayerColumn("VALIDÉ", "validated", "var(--success)", team)}
        </div>
      </div>
    );
  }

 const savedGroupIds = [...new Set(tourney.teams.map(t => t.groupId).filter(g => g !== null))].sort((a,b) => a-b);

  const totalQualified = savedGroupIds.reduce((sum, gNum) => sum + (tourney.qualifiedSettings?.[gNum] || 2), 0);
  
  let bracketSize = 2;
  while (bracketSize < totalQualified) bracketSize *= 2;
  const numByes = bracketSize - totalQualified;

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
      // Trouve le nombre maximum de tours
      const maxRound = Math.max(1, ...tourney.playoffs.matches.map(m => m.round || 1));
      // Range les matchs dans les bonnes colonnes
      for (let r = 1; r <= maxRound; r++) {
          playoffRounds.push(tourney.playoffs.matches.filter(m => (m.round || 1) === r));
      }
  }

  return (
    <div className="tm-container">
      <div className="tm-header">
        <h1 className="tm-title">{tourney.name}</h1>
        <div className="tm-tabs">
            <button onClick={() => setActiveTab("poules")} className={`tm-tab ${activeTab === "poules" ? 'active' : 'inactive'}`}>POULES</button>
            <button onClick={() => setActiveTab("finale")} className={`tm-tab ${activeTab === "finale" ? 'active' : 'inactive'}`}>PHASE FINALE</button>
        </div>
      </div>

      {activeTab === "poules" ? (
        <>
          <div className="tm-panel">
            <h3>1. Équipes et Licences</h3>
            <div className="tm-flex-gap" style={{ marginBottom: '20px' }}>
              <input className="tm-input" style={{ flex: 1 }} placeholder="Nom équipe..." value={teamName} onChange={(e) => setTeamName(e.target.value)} />
              <button onClick={addTeam} className="tm-btn-success">AJOUTER ÉQUIPE</button>
            </div>
            <div className="tm-grid-teams">
              {tourney.teams.map(t => (
                <div key={t.id} className="tm-card">
                  <b>{t.name}</b>
                  <div style={{ fontSize: '0.7rem', color: '#888', margin: '5px 0' }}>
                    {t.players.filter(p => p.licenseStatus === 'validated').length} / {t.players.length} licences OK
                  </div>
                  <button onClick={() => setEditId(t.id)} className="tm-small-btn">GÉRER LICENCES</button>
                </div>
              ))}
            </div>
          </div>

          <div className="tm-panel">
            <h3>2. Tirage au sort / Planning</h3>
            <div className="tm-flex-gap">
                <label>Nombre de poules :</label>
                <input type="number" min="1" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} className="tm-input" style={{ width: '60px' }} />
                <button onClick={generateDrawAndSchedule} className="tm-btn-success tm-btn-purple">
                  🎲 NOUVEAU TIRAGE & PLANNING AUTO
                </button>
            </div>
          </div>

          <div style={{ display: 'flex', overflowX: 'auto', gap: '20px' }}>
            {savedGroupIds.map(gNum => {
                const standings = getGroupStandings(gNum);
                const limit = tourney.qualifiedSettings?.[gNum] || 2;
                return (
                  <div key={gNum} className="tm-group-col">
                    <div className="tm-flex-between" style={{ marginBottom: '10px' }}>
                      <h4 style={{ margin: 0 }}>POULE {gNum}</h4>
                      <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>Qualifiés:</span>
                        <input type="number" value={limit} onChange={(e) => update({ qualifiedSettings: { ...tourney.qualifiedSettings, [gNum]: parseInt(e.target.value) || 0 } })} className="tm-mini-input" style={{ width: '35px' }} />
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
                    {tourney.schedule.filter(m => m.group === gNum).map(m => {
                      const isReady = m.teamA?.players?.length >= 5 && m.teamB?.players?.length >= 5;
                      const isFinished = m.status === 'finished';
                      const isOngoing = !isFinished && !!localStorage.getItem(`basketMatchSave_${m.id}`);
                      const canClick = isReady || isFinished;
                      
                      return (
                        <div 
                          key={m.id} 
                          draggable
                          onDragStart={(e) => {
                              setDraggedMatchId(m.id);
                              e.dataTransfer.setData("matchId", m.id);
                              e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => setDraggedMatchId(null)}
                          onDragOver={(e) => {
                              e.preventDefault();
                              // Effet visuel quand on survole un autre match avec le match qu'on tient
                              if(draggedMatchId && draggedMatchId !== m.id) {
                                  e.currentTarget.style.transform = "scale(1.02)";
                                  e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 165, 0, 0.4)";
                              }
                          }}
                          onDragLeave={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                          }}
                          onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                              const sourceMatchId = e.dataTransfer.getData("matchId");
                              if (!sourceMatchId || sourceMatchId === m.id) return;
                              
                              const newSchedule = [...tourney.schedule];
                              const sourceIndex = newSchedule.findIndex(x => x.id === sourceMatchId);
                              const targetIndex = newSchedule.findIndex(x => x.id === m.id);
                              
                              if (sourceIndex > -1 && targetIndex > -1) {
                                  // L'architecte intervertit la place des deux matchs dans le planning général
                                  const temp = newSchedule[sourceIndex];
                                  newSchedule[sourceIndex] = newSchedule[targetIndex];
                                  newSchedule[targetIndex] = temp;
                                  update({ schedule: newSchedule });
                              }
                          }}
                          onClick={() => {
                            if (!canClick) {
                              alert(`Impossible de lancer le match : ${m.teamA?.name} ou ${m.teamB?.name} n'a pas 5 joueurs inscrits.`);
                              return;
                            }
                            handleLaunchMatch(m.id);
                          }} 
                          className="tm-match-row"
                          style={{
                            borderLeft: `3px solid ${isOngoing ? 'var(--accent-blue)' : (canClick ? 'var(--success)' : 'var(--danger)')}`,
                            cursor: draggedMatchId === m.id ? 'grabbing' : 'grab', /* 'grab' indique qu'on peut attraper la carte */
                            opacity: draggedMatchId === m.id ? 0.4 : 1,
                            position: 'relative',
                            transition: 'all 0.2s ease'
                          }}
                        >
                           {/* Petite icône pour indiquer que c'est déplaçable */}
                           <div style={{ position: 'absolute', top: '8px', right: '12px', color: '#666', fontSize: '1.2rem' }} title="Glisser pour intervertir avec un autre match">⠿</div>
                           
                           {isOngoing && <div className="tm-ribbon-ongoing">EN COURS</div>}
                           {isFinished && <div className="tm-ribbon-finished">TERMINÉ</div>}
                           
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '40px' }}>
                             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                               <span style={{ fontSize: '0.8rem', color: isFinished ? (m.scoreA > m.scoreB ? 'var(--success)' : 'var(--danger)') : 'white', fontWeight: isFinished && m.scoreA > m.scoreB ? 'bold' : 'normal' }}>{m.teamA?.name || 'Équipe A'}</span>
                               {isFinished && <b style={{ color: m.scoreA > m.scoreB ? 'var(--success)' : 'var(--danger)' }}>{m.scoreA}</b>}
                             </div>
                             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                               <span style={{ fontSize: '0.8rem', color: isFinished ? (m.scoreB > m.scoreA ? 'var(--success)' : 'var(--danger)') : 'white', fontWeight: isFinished && m.scoreB > m.scoreA ? 'bold' : 'normal' }}>{m.teamB?.name || 'Équipe B'}</span>
                               {isFinished && <b style={{ color: m.scoreB > m.scoreA ? 'var(--success)' : 'var(--danger)' }}>{m.scoreB}</b>}
                             </div>
                           </div>
                           
                           <button className={`tm-launch-btn ${canClick ? 'ready' : 'not-ready'}`} style={{ backgroundColor: isOngoing ? 'var(--accent-blue)' : '' }}>
                             {isFinished ? "VOIR LES STATS 📊" : (isOngoing ? "REPRENDRE 🏀" : "LANCER 🏀")}
                           </button>
                        </div>
                      );
                    })}
                  </div>
                );
            })}
          </div>
        </>
      ) : (
        <div className="tm-panel">
          <div className="tm-flex-between" style={{ marginBottom: '20px' }}>
            <h3>🏆 Phase Finale</h3>
            {tourney.playoffs && <button onClick={() => update({playoffs: null})} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>RESET TABLEAU</button>}
          </div>
          {!tourney.playoffs ? (
            <div style={{ textAlign: 'center', padding: '40px', border: '1px dashed #333', borderRadius: '12px' }}>
                <p style={{ marginBottom: '20px', fontSize: '1.1rem' }}>
                    <b>{totalQualified} équipes</b> sont actuellement qualifiées d'après vos réglages de poules.
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
                        <button onClick={generatePlayoffs} className="tm-btn-success" style={{ padding: '15px 30px', fontSize: '1.2rem', marginTop: '10px' }}>
                            🚀 GÉNÉRER {getStartRoundName(bracketSize)}
                        </button>
                    </div>
                ) : (
                    <div style={{ color: 'var(--danger)' }}>Il faut au moins 2 équipes qualifiées.</div>
                )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '40px', overflowX: 'auto', padding: '20px 10px', minHeight: '500px' }}>
                {playoffRounds.map((roundMatches, rIdx) => {
                    // Calcul du nom de la colonne
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
                                    const isOngoing = !isFinished && !!localStorage.getItem(`basketMatchSave_${m.id}`);
                                    const canClick = isReady || isFinished;
                                    
                                    return (
                                        <div 
                                          key={m.id} 
                                          onClick={() => {
                                            if (!canClick) {
                                              alert(`Impossible de lancer : il manque des joueurs à une équipe ou l'équipe n'est pas encore connue.`);
                                              return;
                                            }
                                            handleLaunchMatch(m.id);
                                          }} 
                                          className="tm-match-row"
                                          style={{ 
                                              padding: '15px', 
                                              background: isFinished ? '#1a1a1a' : '#111', 
                                              borderLeft: `4px solid ${isOngoing ? 'var(--accent-blue)' : (canClick ? 'var(--accent-orange)' : 'var(--danger)')}`,
                                              cursor: canClick ? 'pointer' : 'not-allowed',
                                              position: 'relative'
                                          }}
                                        >
                                            {isOngoing && <div className="tm-ribbon-ongoing">EN COURS</div>}
                                            {isFinished && <div className="tm-ribbon-finished">TERMINÉ</div>}
                                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', fontWeight: 'bold', marginBottom: '10px' }}>{m.label}</div>
                                            
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ color: isFinished ? (m.scoreA > m.scoreB ? 'var(--success)' : 'var(--danger)') : 'white', fontWeight: isFinished && m.scoreA > m.scoreB ? 'bold' : 'normal' }}>
                                                    {m.teamA?.name || <span style={{color: '#555', fontStyle: 'italic'}}>À déterminer...</span>}
                                                </span>
                                                {isFinished && <b>{m.scoreA}</b>}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                                                <span style={{ color: isFinished ? (m.scoreB > m.scoreA ? 'var(--success)' : 'var(--danger)') : 'white', fontWeight: isFinished && m.scoreB > m.scoreA ? 'bold' : 'normal' }}>
                                                    {m.teamB?.name || <span style={{color: '#555', fontStyle: 'italic'}}>À déterminer...</span>}
                                                </span>
                                                {isFinished && <b>{m.scoreB}</b>}
                                            </div>
                                            
                                            {(m.teamA?.isBye || m.teamB?.isBye) ? (
                                                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#888', marginTop: '10px', padding: '6px', background: '#222', borderRadius: '4px', border: '1px dashed #444' }}>
                                                    ⏩ QUALIFICATION DIRECTE
                                                </div>
                                            ) : (
                                                <button className={`tm-launch-btn ${canClick ? 'ready' : 'not-ready'}`} style={{ backgroundColor: isOngoing ? 'var(--accent-blue)' : '' }}>
                                                   {isFinished ? "VOIR LES STATS 📊" : (isOngoing ? "REPRENDRE 🏀" : "LANCER LE MATCH 🏀")}
                                                </button>
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
    </div>
  );
}