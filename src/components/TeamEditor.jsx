import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient';

export default function TeamEditor({ teamId, setEditId, tourney, canEdit, update }) {
  const { setConfirmData } = useAppContext();
  const team = tourney?.teams?.find(t => t.id === teamId);

  // --- ÉTATS LOCAUX ---
  const [playersDraft, setPlayersDraft] = useState([{ name: "", number: "" }]);
  const [draggedPlayerId, setDraggedPlayerId] = useState(null);
  
  // 👇 NOUVEAU : Brouillon pour les paiements en cours d'édition
  const [financeDrafts, setFinanceDrafts] = useState({});

  // NOUVEAU : État pour le modal de liaison Joueur -> Profil Global (Phase 1)
  const [linkModal, setLinkModal] = useState({ isOpen: false, targetId: null, targetName: '' });
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState([]);
  const [isSearchingLink, setIsSearchingLink] = useState(false);

  useEffect(() => {
    setPlayersDraft([{ name: "", number: "" }]);
  }, [teamId]);

  // 🚀 PHASE 2 : Moteur de recherche Supabase avec temporisation (Debounce)
  useEffect(() => {
    if (!linkModal.isOpen || linkSearchQuery.length < 2) {
      setLinkSearchResults([]);
      return;
    }

    // On attend 400ms après la dernière frappe avant de lancer la recherche
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingLink(true);
      try {
        // Recherche dans la table 'profiles' (car on est dans l'éditeur de joueurs)
        // Modifie 'pseudo' par le nom de ta colonne si elle s'appelle autrement (ex: 'username', 'name')
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name')
          .ilike('first_name', `%${linkSearchQuery}%`)
          .limit(10);
          
        if (error) throw error;
        setLinkSearchResults(data || []);
      } catch (err) {
        console.error("Erreur de recherche Supabase :", err);
      } finally {
        setIsSearchingLink(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [linkSearchQuery, linkModal.isOpen]);

  if (!team) return null;

  // --- FONCTIONS D'AJOUT MULTIPLE ---
  const handleDraftChange = (index, field, value) => {
    const newDraft = [...playersDraft];
    newDraft[index][field] = value;
    setPlayersDraft(newDraft);
  };

  const addDraftRow = () => setPlayersDraft([...playersDraft, { name: "", number: "" }]);
  const removeDraftRow = (index) => setPlayersDraft(playersDraft.filter((_, i) => i !== index));

  const saveMultiplePlayers = () => {
    if (!canEdit) return;
    
    const validPlayers = playersDraft.filter(p => p.name.trim() !== "");
    if (validPlayers.length === 0) return toast.error("Veuillez remplir au moins un nom !");
    
    const newPlayers = validPlayers.map((p, index) => ({
      id: "p_" + Date.now() + "_" + index, 
      name: p.name.trim(), 
      number: p.number || '0', 
      licenseStatus: 'to_check', 
      paid: 0, 
      totalDue: 20 
    }));

    // 🛡️ BARRIÈRE DE SÉCURITÉ (Un joueur = Une équipe)
    let conflictingPlayer = null;
    let conflictingTeam = null;
    
    for (const newPlayer of newPlayers) {
      for (const t of tourney.teams) {
        if (t.id !== teamId && t.players.some(p => p.name.toLowerCase() === newPlayer.name.toLowerCase())) {
          conflictingPlayer = newPlayer;
          conflictingTeam = t;
          break;
        }
      }
      if (conflictingPlayer) break;
    }

    if (conflictingPlayer) {
      toast.error(`Ajout refusé ❌\nUn joueur nommé "${conflictingPlayer.name}" joue déjà pour l'équipe "${conflictingTeam.name}".`);
      return; 
    }

    update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: [...t.players, ...newPlayers] } : t) });
    setPlayersDraft([{ name: "", number: "" }]);
    toast.success("Joueurs ajoutés avec succès !");
  };

  // --- FONCTIONS DE FINANCE ET STATUT ---
  
  // 1. Met à jour le brouillon local (n'impacte pas encore la base de données)
  const handleFinanceDraftChange = (player, field, value) => {
    if (!canEdit) return;
    setFinanceDrafts(prev => {
      const currentDraft = prev[player.id] || { paid: player.paid || 0, totalDue: player.totalDue || 0 };
      return {
        ...prev,
        [player.id]: { ...currentDraft, [field]: value }
      };
    });
  };

  // 2. Annule le brouillon
  const cancelFinanceDraft = (playerId) => {
    setFinanceDrafts(prev => {
      const newDrafts = { ...prev };
      delete newDrafts[playerId];
      return newDrafts;
    });
  };

  // 3. Valide le brouillon et l'envoie à la BDD
  const applyFinanceDraft = (playerId) => {
    if (!canEdit) return;
    const draft = financeDrafts[playerId];
    if (!draft) return;

    const valPaid = parseFloat(draft.paid) || 0;
    const valTotal = parseFloat(draft.totalDue) || 0;
    
    update({ 
      teams: tourney.teams.map(t => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          players: t.players.map(p => {
            if (p.id !== playerId) return p;
            const updatedPlayer = { ...p, paid: valPaid, totalDue: valTotal };
            const remaining = valTotal - valPaid;

            if (remaining <= 0) updatedPlayer.licenseStatus = 'validated';
            else if (valPaid > 0) updatedPlayer.licenseStatus = 'pending';
            else updatedPlayer.licenseStatus = 'to_check';

            return updatedPlayer;
          })
        };
      }) 
    });

    cancelFinanceDraft(playerId);
    toast.success("Finances validées ! 💸");
  };

  const validateAllPlayers = () => {
    if (!canEdit) return;
    setConfirmData({
      isOpen: true,
      title: "Tout valider ?",
      message: "Passer tous les joueurs de cette équipe en 'VALIDÉ' ?",
      isDanger: false,
      onConfirm: () => {
        const updatedPlayers = team.players.map(p => ({ ...p, licenseStatus: 'validated' }));
        update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers } : t) });
        toast.success("Joueurs validés");
      }
    });
  };

  const deletePlayer = (playerId) => {
    if (!canEdit) return;
    setConfirmData({
      isOpen: true,
      title: "Supprimer le joueur ?",
      message: "Voulez-vous supprimer définitivement ce joueur ?",
      isDanger: true,
      onConfirm: () => {
        update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: team.players.filter(p => p.id !== playerId) } : t) });
        toast.success("Joueur supprimé");
      }
    });
  };

  // 🚀 PHASE 3 & 4 : Lier le joueur et l'enregistrer globalement
  const handleLinkPlayer = async (realProfileId, realProfileName) => {
    if (!canEdit) return;

    // --- PHASE 4 : Enregistrement Officiel dans Supabase (team_members) ---
    // On vérifie d'abord si l'équipe actuelle est une VRAIE équipe (liée au réseau)
    if (team.global_id) {
      try {
        // 1. On vérifie si le joueur n'est pas déjà dans cette équipe (pour éviter les doublons)
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('profile_id', realProfileId)
          .eq('team_id', team.global_id)
          .single();

        // 2. S'il n'y est pas, on l'ajoute officiellement !
        if (!existingMember) {
          const { error } = await supabase
            .from('team_members')
            .insert([{ 
              profile_id: realProfileId, 
              team_id: team.global_id, 
              joined_at: new Date().toISOString() 
            }]);
            
          if (error) console.error("Erreur lors de l'ajout global :", error);
        }
      } catch (err) {
        // On ignore silencieusement si la requête plante (ex: pas internet ou RLS)
        console.error("Info réseau Supabase :", err);
      }
    }

    // --- PHASE 3 : Mise à jour locale du tournoi ---
    const updatedTeams = tourney.teams.map(t => {
      if (t.id !== teamId) return t; 

      return {
        ...t,
        players: t.players.map(p => {
          if (p.id !== linkModal.targetId) return p; 
          return { ...p, profile_id: realProfileId };
        })
      };
    });

    // On sauvegarde le tournoi avec la mise à jour
    update({ teams: updatedTeams });

    // On referme et on nettoie le modal
    setLinkModal({ isOpen: false, targetId: null, targetName: '' });
    setLinkSearchQuery('');
    setLinkSearchResults([]);
    toast.success(`Joueur lié avec succès ! 🔗`);
  };

  // 💔 Délier un joueur (Retirer le vrai compte du joueur fantôme)
  const handleUnlinkPlayer = (playerId, profileId) => {
    if (!canEdit) return;
    setConfirmData({
      isOpen: true,
      title: "Délier le joueur ?",
      message: "Voulez-vous vraiment détacher ce vrai profil ? (L'historique des transferts sera également annulé).",
      isDanger: true,
      onConfirm: async () => {
        // 1. On annule l'enregistrement dans la table globale
        if (team.global_id && profileId) {
          try {
            await supabase.from('team_members').delete().match({ profile_id: profileId, team_id: team.global_id });
          } catch (err) { console.error("Erreur annulation transfert :", err); }
        }

        // 2. On met à jour l'effectif en FORÇANT profile_id à null
        const updatedTeams = tourney.teams.map(t => {
          if (t.id !== teamId) return t;
          return {
            ...t,
            players: t.players.map(p => {
              if (p.id !== playerId) return p;
              return { ...p, profile_id: null }; // 👈 La vraie méthode Supabase
            })
          };
        });

        // 3. 🧹 LE NETTOYEUR EXTRÊME (Poules + Playoffs)
        const cleanMatches = (matchesArray) => {
          if (!matchesArray || !Array.isArray(matchesArray)) return matchesArray;
          return matchesArray.map(m => {
            const wipeProfileId = (stats) => {
              if (!stats || !Array.isArray(stats)) return stats;
              return stats.map(stat => {
                // Si on trouve le joueur, on FORCE son profile_id à null
                if (stat.profile_id === profileId) {
                  return { ...stat, profile_id: null };
                }
                return stat;
              });
            };

            return {
              ...m,
              saved_stats_a: wipeProfileId(m.saved_stats_a),
              saved_stats_b: wipeProfileId(m.saved_stats_b),
              savedStatsA: wipeProfileId(m.savedStatsA),
              savedStatsB: wipeProfileId(m.savedStatsB)
            };
          });
        };

        const updatedPlayoffs = tourney.playoffs ? {
          ...tourney.playoffs,
          matches: cleanMatches(tourney.playoffs.matches)
        } : tourney.playoffs;

        // 4. On écrase TOUT d'un seul coup (Effectifs, Poules, Schedule, Playoffs)
        update({ 
          teams: updatedTeams,
          matches: cleanMatches(tourney.matches),
          schedule: cleanMatches(tourney.schedule),
          playoffs: updatedPlayoffs
        });
        
        toast.success("Joueur délié (Historique intégral nettoyé) ! 🧹");
      }
    });
  };

  // --- DRAG & DROP (KANBAN) ---
  const onDragStartPlayer = (e, playerId) => {
    if (!canEdit) { e.preventDefault(); return; }
    setDraggedPlayerId(playerId);
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragEndPlayer = () => {
    if (!canEdit) return;
    setDraggedPlayerId(null);
    document.querySelectorAll('.drag-over-column').forEach(el => el.classList.remove('bg-white/10'));
  };

  const onDropPlayer = (e, newStatus) => {
    if (!canEdit) return;
    e.preventDefault();
    e.currentTarget.classList.remove('bg-white/10'); 
    
    const pid = e.dataTransfer.getData("playerId");
    if (!pid) return;

    const updatedPlayers = team.players.map(p => p.id === pid ? { ...p, licenseStatus: newStatus } : p);
    update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers } : t) });
  };

  const renderPlayerColumn = (title, status, colorHex) => {
    const filteredPlayers = team.players.filter(p => p.licenseStatus === status || (!p.licenseStatus && status === 'to_check'));
    
    return (
      <div 
        className="flex flex-col flex-1 min-w-[320px] bg-app-panel/80 backdrop-blur-md rounded-3xl border border-muted-line transition-all duration-300 p-5 sm:p-6 shadow-2xl drag-over-column relative overflow-hidden group/col"
        onDragOver={(e) => { if(canEdit) { e.preventDefault(); e.currentTarget.classList.add('bg-white/10'); } }}
        onDragLeave={(e) => { if(canEdit) e.currentTarget.classList.remove('bg-white/10'); }}
        onDrop={(e) => onDropPlayer(e, status)}
      >
        {/* Ligne LED Dynamique au sommet */}
        <div 
          className="absolute top-0 left-0 right-0 h-1.5 opacity-90 transition-opacity duration-300 group-hover/col:opacity-100" 
          style={{ backgroundColor: colorHex, boxShadow: `0 0 20px ${colorHex}` }}
        ></div>

        {/* En-tête de la colonne */}
        <h3 className="flex justify-between items-center m-0 text-white font-black tracking-widest uppercase text-sm mb-6 pb-4 border-b border-muted-line relative z-10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorHex, boxShadow: `0 0 10px ${colorHex}` }}></span>
            {title}
          </div>
          <span className="bg-app-input border border-muted-line text-white font-black text-xs px-3 py-1.5 rounded-lg shadow-inner">
            {filteredPlayers.length}
          </span>
        </h3>
        
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] custom-scrollbar pr-2 relative z-10">
          {filteredPlayers.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-10 opacity-40 bg-app-input/50 rounded-2xl border border-dashed border-muted-line">
               <p className="text-center text-muted font-black text-[10px] uppercase tracking-widest m-0">Vide</p>
             </div>
          ) : (
            filteredPlayers.map(p => {
              const draft = financeDrafts[p.id];
              const isEditingFinance = !!draft;
              
              const displayPaid = isEditingFinance ? draft.paid : (p.paid || 0);
              const displayTotal = isEditingFinance ? draft.totalDue : (p.totalDue || 0);
              const remaining = (parseFloat(displayTotal) || 0) - (parseFloat(displayPaid) || 0);
              
              return (
                <div 
                  key={p.id} 
                  draggable={canEdit && !isEditingFinance} 
                  onDragStart={(e) => onDragStartPlayer(e, p.id)}
                  onDragEnd={onDragEndPlayer}
                  className={`bg-app-card p-4 rounded-xl border-l-[4px] border border-muted-line transition-all duration-300 relative group shadow-lg flex flex-col gap-4 ${draggedPlayerId === p.id ? 'opacity-50 scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)] border-dashed' : 'opacity-100 hover:-translate-y-1 hover:shadow-xl hover:border-muted-dark'} ${(canEdit && !isEditingFinance) ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isEditingFinance ? 'ring-1 ring-action bg-app-card/90' : ''}`}
                  style={{ borderLeftColor: colorHex }}
                >
                  <div className="flex justify-between items-start">
                    <strong className="text-base font-black truncate pr-6 tracking-wide drop-shadow-sm" style={{ color: colorHex }}>
                      <span className="text-white/50 text-xs mr-1">#</span>{p.number} {p.name}
                    </strong>
                    {canEdit && !isEditingFinance && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {/* NOUVEAU BOUTON : Affiché uniquement si le joueur n'est pas encore lié */}
                        {!p.profile_id ? (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setLinkModal({ isOpen: true, targetId: p.id, targetName: p.name }); 
                              setLinkSearchQuery('');
                            }}
                            className="text-muted bg-app-input border border-transparent hover:border-action/30 hover:bg-action/10 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:text-action transition-all text-sm"
                            title="Lier à un vrai compte joueur"
                          >
                            🔗
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleUnlinkPlayer(p.id, p.profile_id);
                            }}
                            className="text-action bg-action/10 border border-action/30 hover:border-danger/50 hover:bg-danger/20 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:text-danger transition-all text-sm"
                            title="Délier le joueur"
                          >
                            ✂️
                          </button>
                        )}
                        <button 
                          onClick={() => deletePlayer(p.id)} 
                          className="text-muted bg-app-input border border-transparent hover:border-danger/30 hover:bg-danger/10 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:text-danger transition-all text-sm"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted bg-black/30 p-2.5 rounded-lg border border-muted-line shadow-inner ${isEditingFinance ? 'ring-1 ring-action/30' : ''}`}>
                    <span>Cotisation :</span>
                    <div className="flex gap-1.5 items-center">
                      <input 
                        type="number" 
                        disabled={!canEdit} 
                        value={displayPaid} 
                        onChange={(e) => handleFinanceDraftChange(p, 'paid', e.target.value)} 
                        className="w-[50px] text-center p-1.5 rounded-md bg-app-input border border-muted-line text-white font-bold focus:outline-none focus:border-action focus:bg-app-bg transition-colors shadow-inner" 
                      />
                      <span className="text-muted-dark text-lg leading-none">/</span>
                      <input 
                        type="number" 
                        disabled={!canEdit} 
                        value={displayTotal} 
                        onChange={(e) => handleFinanceDraftChange(p, 'totalDue', e.target.value)} 
                        className="w-[50px] text-center p-1.5 rounded-md bg-app-input border border-muted-line text-white font-bold focus:outline-none focus:border-action focus:bg-app-bg transition-colors shadow-inner" 
                      />
                    </div>
                  </div>

                  {/* Boutons de validation du brouillon */}
                  {isEditingFinance && (
                    <div className="flex justify-end gap-2 mt-[-4px] animate-fadeIn">
                      <button 
                        onClick={() => cancelFinanceDraft(p.id)}
                        className="bg-app-input border border-muted-line text-muted px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-colors shadow-inner cursor-pointer"
                      >
                        ✕ Annuler
                      </button>
                      <button 
                        onClick={() => applyFinanceDraft(p.id)}
                        className="bg-gradient-to-r from-action to-action-light text-white border-none px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:shadow-[0_2px_10px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 transition-all shadow-md cursor-pointer"
                      >
                        ✅ Valider
                      </button>
                    </div>
                  )}

                  {!isEditingFinance && (
                    <div className="text-right text-[10px] uppercase tracking-widest font-black mt-[-4px]">
                      {remaining <= 0 ? (
                        <span className="text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">✅ Réglé</span>
                      ) : (
                        <span className="text-danger bg-danger/10 px-2 py-1 rounded-md border border-danger/20">⚠️ Reste {remaining} €</span>
                      )}
                    </div>
                  )}
                  
                  {canEdit && !isEditingFinance && <div className="absolute bottom-2.5 right-3 text-muted-dark text-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" title="Glisser pour déplacer">⠿</div>}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 sm:p-5 w-full h-full flex flex-col max-w-[1920px] mx-auto relative z-10">
      <div className="mb-6">
        {/* BOUTON RETOUR PREMIUM */}
        <button 
          onClick={() => setEditId(null)} 
          className="w-fit mb-8 bg-app-input border border-muted-line text-muted px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-muted-dark hover:text-white transition-all flex items-center gap-2 hover:-translate-x-1 cursor-pointer shadow-inner"
        >
          ⬅ RETOUR AU ROSTER
        </button>
        
        {/* EN-TÊTE ÉQUIPE ET AJOUT RAPIDE */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 border-b border-muted-line pb-8">
            
            <div className="flex flex-col gap-4">
                <h2 className="m-0 text-3xl sm:text-4xl font-black text-white flex items-center gap-4 tracking-tight drop-shadow-md">
                  <span className="text-4xl">🛡️</span> {team.name}
                </h2>
                {canEdit && (
                  <button 
                    onClick={validateAllPlayers} 
                    className="w-fit bg-gradient-to-r from-primary to-primary-dark text-white border-none rounded-xl px-6 py-3 font-black tracking-widest text-[10px] uppercase cursor-pointer hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all shadow-lg mt-2"
                  >
                    ✅ TOUT VALIDER D'UN COUP
                  </button>
                )}
            </div>
            
            {canEdit && (
              <div className="bg-app-panel/80 backdrop-blur-md p-6 rounded-3xl border border-muted-line w-full lg:max-w-[500px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-action/10 blur-[50px] rounded-full pointer-events-none"></div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-action to-action-light opacity-50"></div>
                
                <h4 className="mt-0 mb-6 text-action-light text-xs font-black uppercase tracking-widest flex items-center gap-2 relative z-10">
                  <span className="text-lg">➕</span> Ajout rapide (Multiple)
                </h4>
                
                <div className="relative z-10 flex flex-col gap-3">
                  {playersDraft.map((draft, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        className="flex-1 p-3 rounded-xl border border-muted-line bg-app-input text-white placeholder:text-muted focus:outline-none focus:border-action transition-all shadow-inner text-sm font-medium" 
                        placeholder="Nom complet du joueur..." 
                        value={draft.name} 
                        onChange={e => handleDraftChange(index, 'name', e.target.value)} 
                      />
                      <input 
                        className="w-[70px] p-3 rounded-xl border border-muted-line bg-app-input text-white placeholder:text-muted focus:outline-none focus:border-action transition-all shadow-inner text-center text-sm font-black" 
                        type="number" 
                        placeholder="N°" 
                        value={draft.number} 
                        onChange={e => handleDraftChange(index, 'number', e.target.value)} 
                      />
                      {playersDraft.length > 1 && (
                        <button 
                          onClick={() => removeDraftRow(index)} 
                          className="bg-danger/10 border border-danger/20 text-danger w-12 rounded-xl flex items-center justify-center cursor-pointer hover:bg-danger hover:text-white transition-colors"
                          title="Supprimer la ligne"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mt-6 relative z-10">
                  <button 
                    onClick={addDraftRow} 
                    className="bg-action/10 text-action border border-action/30 px-4 py-2.5 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-widest hover:bg-action hover:text-white transition-all shadow-sm"
                  >
                    + Ajouter une ligne
                  </button>
                  <button 
                    onClick={saveMultiplePlayers} 
                    className="bg-gradient-to-r from-action to-action-light text-white border-none rounded-xl px-6 py-2.5 font-black tracking-widest text-[10px] uppercase cursor-pointer hover:shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 transition-all shadow-lg"
                  >
                    💾 SAUVEGARDER
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* LES 3 COLONNES DU KANBAN D'ÉQUIPE */}
      <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-6 flex-1 custom-scrollbar">
        {renderPlayerColumn("À VÉRIFIER", "to_check", "#ef4444")}
        {renderPlayerColumn("EN ATTENTE", "pending", "#f97316")}
        {renderPlayerColumn("VALIDÉ", "validated", "#10b981")}
      </div>

      {/* 🔗 MODAL DE LIAISON JOUEUR (PHASE 1) */}
      {linkModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[100] p-4" onClick={() => setLinkModal({ isOpen: false, targetId: null, targetName: '' })}>
          <div className="bg-app-panel border border-muted-line rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-black tracking-widest uppercase m-0 flex items-center gap-2">
                🔗 Lier le joueur
              </h3>
              <button onClick={() => setLinkModal({ isOpen: false, targetId: null, targetName: '' })} className="bg-transparent border-none text-muted-dark hover:text-white cursor-pointer text-xl">✕</button>
            </div>

            <p className="text-sm text-muted-light m-0">
              Recherchez un profil global pour l'associer à <b className="text-white">{linkModal.targetName}</b>.
            </p>

            <input 
              type="text"
              autoFocus
              className="w-full p-3 rounded-xl bg-app-input border border-muted-line text-white placeholder:text-muted-dark focus:outline-none focus:border-action transition-colors shadow-inner"
              placeholder="🔍 Rechercher un pseudo de joueur..."
              value={linkSearchQuery}
              onChange={(e) => setLinkSearchQuery(e.target.value)}
            />

            {/* 🚀 PHASE 2 : Affichage des résultats */}
            <div className="bg-app-card border border-muted-line rounded-xl min-h-[150px] max-h-[250px] overflow-y-auto p-2 shadow-inner custom-scrollbar flex flex-col">
              {isSearchingLink ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-sm text-action font-bold animate-pulse">Recherche en cours... ⏳</span>
                </div>
              ) : linkSearchResults.length > 0 ? (
                linkSearchResults.map(res => (
                  <div 
                    key={res.id} 
                    className="flex items-center justify-between p-3 border-b border-muted-line hover:bg-white/5 cursor-default transition-colors rounded-lg group"
                  >
                    <div className="flex items-center gap-3">
                      {res.avatar_url ? (
                        <img src={res.avatar_url} alt="avatar" className="w-8 h-8 rounded-full border border-muted-line object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted-dark flex items-center justify-center text-xs">👤</div>
                      )}
                      <span className="font-bold text-white text-sm">{res.first_name || res.name}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLinkPlayer(res.id, res.first_name);
                      }} 
                      className="bg-action/20 text-action border border-transparent group-hover:border-action/50 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer hover:bg-action hover:text-white"
                    >
                      Sélectionner
                    </button>
                  </div>
                ))
              ) : linkSearchQuery.length >= 2 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-sm text-muted-dark">Aucun profil trouvé. 🤷‍♂️</span>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-muted-dark italic tracking-wider">Tapez au moins 2 lettres...</span>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}