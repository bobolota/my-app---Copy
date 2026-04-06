import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

export default function TeamEditor({ teamId, setEditId, tourney, canEdit, update }) {
  const { setConfirmData } = useAppContext();
  const team = tourney?.teams?.find(t => t.id === teamId);

  // --- ÉTATS LOCAUX ---
  const [playersDraft, setPlayersDraft] = useState([{ name: "", number: "" }]);
  const [draggedPlayerId, setDraggedPlayerId] = useState(null);
  
  // 👇 NOUVEAU : Brouillon pour les paiements en cours d'édition
  const [financeDrafts, setFinanceDrafts] = useState({});

  useEffect(() => {
    setPlayersDraft([{ name: "", number: "" }]);
  }, [teamId]);

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

  const renderPlayerColumn = (title, status, colorHex, colorVar) => {
    const filteredPlayers = team.players.filter(p => p.licenseStatus === status || (!p.licenseStatus && status === 'to_check'));
    
    return (
      <div 
        className="flex flex-col flex-1 min-w-[320px] bg-[#15151e]/80 backdrop-blur-md rounded-3xl border border-white/5 transition-all duration-300 p-5 sm:p-6 shadow-2xl drag-over-column relative overflow-hidden group/col"
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
        <h3 className="flex justify-between items-center m-0 text-white font-black tracking-widest uppercase text-sm mb-6 pb-4 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorHex, boxShadow: `0 0 10px ${colorHex}` }}></span>
            {title}
          </div>
          <span className="bg-black/40 border border-white/10 text-white font-black text-xs px-3 py-1.5 rounded-lg shadow-inner">
            {filteredPlayers.length}
          </span>
        </h3>
        
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] custom-scrollbar pr-2 relative z-10">
          {filteredPlayers.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-10 opacity-40 bg-black/20 rounded-2xl border border-dashed border-white/10">
               <p className="text-center text-[#888] font-black text-[10px] uppercase tracking-widest m-0">Vide</p>
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
                  className={`bg-[#1e1e2a] p-4 rounded-xl border-l-[4px] border border-white/5 transition-all duration-300 relative group shadow-lg flex flex-col gap-4 ${draggedPlayerId === p.id ? 'opacity-50 scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)] border-dashed' : 'opacity-100 hover:-translate-y-1 hover:shadow-xl hover:border-white/10'} ${(canEdit && !isEditingFinance) ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isEditingFinance ? 'ring-1 ring-blue-500 bg-[#1e1e2a]/90' : ''}`}
                  style={{ borderLeftColor: colorHex }}
                >
                  <div className="flex justify-between items-start">
                    <strong className="text-base font-black truncate pr-6 tracking-wide drop-shadow-sm" style={{ color: colorHex }}>
                      <span className="text-white/50 text-xs mr-1">#</span>{p.number} {p.name}
                    </strong>
                    {canEdit && !isEditingFinance && (
                      <button 
                        onClick={() => deletePlayer(p.id)} 
                        className="absolute top-3 right-3 text-[#666] bg-black/40 border border-transparent hover:border-red-500/30 hover:bg-red-500/10 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all text-sm"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#888] bg-black/30 p-2.5 rounded-lg border border-white/5 shadow-inner ${isEditingFinance ? 'ring-1 ring-blue-500/30' : ''}`}>
                    <span>Cotisation :</span>
                    <div className="flex gap-1.5 items-center">
                      <input 
                        type="number" 
                        disabled={!canEdit} 
                        value={displayPaid} 
                        onChange={(e) => handleFinanceDraftChange(p, 'paid', e.target.value)} 
                        className="w-[50px] text-center p-1.5 rounded-md bg-black/40 border border-white/10 text-white font-bold focus:outline-none focus:border-blue-500 focus:bg-black/60 transition-colors shadow-inner" 
                      />
                      <span className="text-[#444] text-lg leading-none">/</span>
                      <input 
                        type="number" 
                        disabled={!canEdit} 
                        value={displayTotal} 
                        onChange={(e) => handleFinanceDraftChange(p, 'totalDue', e.target.value)} 
                        className="w-[50px] text-center p-1.5 rounded-md bg-black/40 border border-white/10 text-white font-bold focus:outline-none focus:border-blue-500 focus:bg-black/60 transition-colors shadow-inner" 
                      />
                    </div>
                  </div>

                  {/* Boutons de validation du brouillon */}
                  {isEditingFinance && (
                    <div className="flex justify-end gap-2 mt-[-4px] animate-fadeIn">
                      <button 
                        onClick={() => cancelFinanceDraft(p.id)}
                        className="bg-black/40 border border-white/5 text-[#888] px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-colors shadow-inner cursor-pointer"
                      >
                        ✕ Annuler
                      </button>
                      <button 
                        onClick={() => applyFinanceDraft(p.id)}
                        className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-none px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:shadow-[0_2px_10px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 transition-all shadow-md cursor-pointer"
                      >
                        ✅ Valider
                      </button>
                    </div>
                  )}

                  {!isEditingFinance && (
                    <div className="text-right text-[10px] uppercase tracking-widest font-black mt-[-4px]">
                      {remaining <= 0 ? (
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">✅ Réglé</span>
                      ) : (
                        <span className="text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">⚠️ Reste {remaining} €</span>
                      )}
                    </div>
                  )}
                  
                  {canEdit && !isEditingFinance && <div className="absolute bottom-2.5 right-3 text-[#444] text-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" title="Glisser pour déplacer">⠿</div>}
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
          className="w-fit mb-8 bg-black/40 border border-white/10 text-[#aaa] px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 hover:-translate-x-1 cursor-pointer shadow-inner"
        >
          ⬅ RETOUR AU ROSTER
        </button>
        
        {/* EN-TÊTE ÉQUIPE ET AJOUT RAPIDE */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 border-b border-white/10 pb-8">
            
            <div className="flex flex-col gap-4">
                <h2 className="m-0 text-3xl sm:text-4xl font-black text-white flex items-center gap-4 tracking-tight drop-shadow-md">
                  <span className="text-4xl">🛡️</span> {team.name}
                </h2>
                {canEdit && (
                  <button 
                    onClick={validateAllPlayers} 
                    className="w-fit bg-gradient-to-r from-emerald-500 to-green-500 text-white border-none rounded-xl px-6 py-3 font-black tracking-widest text-[10px] uppercase cursor-pointer hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all shadow-lg mt-2"
                  >
                    ✅ TOUT VALIDER D'UN COUP
                  </button>
                )}
            </div>
            
            {canEdit && (
              <div className="bg-[#15151e]/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 w-full lg:max-w-[500px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-50"></div>
                
                <h4 className="mt-0 mb-6 text-blue-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 relative z-10">
                  <span className="text-lg">➕</span> Ajout rapide (Multiple)
                </h4>
                
                <div className="relative z-10 flex flex-col gap-3">
                  {playersDraft.map((draft, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        className="flex-1 p-3 rounded-xl border border-white/10 bg-black/40 text-white placeholder-[#666] focus:outline-none focus:border-blue-500 transition-all shadow-inner text-sm font-medium" 
                        placeholder="Nom complet du joueur..." 
                        value={draft.name} 
                        onChange={e => handleDraftChange(index, 'name', e.target.value)} 
                      />
                      <input 
                        className="w-[70px] p-3 rounded-xl border border-white/10 bg-black/40 text-white placeholder-[#666] focus:outline-none focus:border-blue-500 transition-all shadow-inner text-center text-sm font-black" 
                        type="number" 
                        placeholder="N°" 
                        value={draft.number} 
                        onChange={e => handleDraftChange(index, 'number', e.target.value)} 
                      />
                      {playersDraft.length > 1 && (
                        <button 
                          onClick={() => removeDraftRow(index)} 
                          className="bg-red-500/10 border border-red-500/20 text-red-400 w-12 rounded-xl flex items-center justify-center cursor-pointer hover:bg-red-500 hover:text-white transition-colors"
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
                    className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                  >
                    + Ajouter une ligne
                  </button>
                  <button 
                    onClick={saveMultiplePlayers} 
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-none rounded-xl px-6 py-2.5 font-black tracking-widest text-[10px] uppercase cursor-pointer hover:shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 transition-all shadow-lg"
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
        {renderPlayerColumn("À VÉRIFIER", "to_check", "#ef4444", "var(--danger)")}
        {renderPlayerColumn("EN ATTENTE", "pending", "#f97316", "var(--accent-orange)")}
        {renderPlayerColumn("VALIDÉ", "validated", "#10b981", "var(--success)")}
      </div>
    </div>
  );
}