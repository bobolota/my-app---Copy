import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

export default function TeamEditor({ teamId, setEditId, tourney, canEdit, update }) {
  const { setConfirmData } = useAppContext();
  const team = tourney?.teams?.find(t => t.id === teamId);

  // --- ÉTATS LOCAUX ---
  const [playersDraft, setPlayersDraft] = useState([{ name: "", number: "" }]);
  const [draggedPlayerId, setDraggedPlayerId] = useState(null);

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
  const updatePlayerFinance = (playerId, field, value) => {
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
    document.querySelectorAll('.drag-over-column').forEach(el => el.classList.remove('bg-white/5'));
  };

  const onDropPlayer = (e, newStatus) => {
    if (!canEdit) return;
    e.preventDefault();
    e.currentTarget.classList.remove('bg-white/5'); 
    
    const pid = e.dataTransfer.getData("playerId");
    if (!pid) return;

    const updatedPlayers = team.players.map(p => p.id === pid ? { ...p, licenseStatus: newStatus } : p);
    update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers } : t) });
  };

  const renderPlayerColumn = (title, status, colorHex, colorVar) => {
    const filteredPlayers = team.players.filter(p => p.licenseStatus === status || (!p.licenseStatus && status === 'to_check'));
    
    return (
      <div 
        className="flex flex-col flex-1 min-w-[280px] bg-[#1a1a1a] rounded-xl border border-[#333] transition-colors p-4 drag-over-column"
        onDragOver={(e) => { if(canEdit) { e.preventDefault(); e.currentTarget.classList.add('bg-white/5'); } }}
        onDragLeave={(e) => { if(canEdit) e.currentTarget.classList.remove('bg-white/5'); }}
        onDrop={(e) => onDropPlayer(e, status)}
      >
        <h3 className="flex justify-between items-center m-0 text-white font-bold tracking-wider mb-5 pb-3 border-b-4" style={{ borderBottomColor: colorHex }}>
          {title} <span className="text-[#888] text-xl font-bold">{filteredPlayers.length}</span>
        </h3>
        
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
          {filteredPlayers.map(p => {
            const remaining = (p.totalDue || 0) - (p.paid || 0);
            return (
              <div 
                key={p.id} 
                draggable={canEdit} 
                onDragStart={(e) => onDragStartPlayer(e, p.id)}
                onDragEnd={onDragEndPlayer}
                className={`bg-[#222] p-4 rounded-xl border-l-4 transition-all duration-200 relative group shadow-md flex flex-col gap-3 ${draggedPlayerId === p.id ? 'opacity-50 scale-95 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'opacity-100 hover:-translate-y-1 hover:shadow-lg'} ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                style={{ borderLeftColor: colorHex }}
              >
                <div className="flex justify-between items-start">
                  <strong className="text-lg font-heading truncate pr-6" style={{ color: colorVar }}>#{p.number} {p.name}</strong>
                  {canEdit && (
                    <button 
                      onClick={() => deletePlayer(p.id)} 
                      className="absolute top-2 right-2 text-[#555] bg-transparent border-none text-xl cursor-pointer opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition-all"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-xs font-bold text-[#888]">
                  <span>Cotisation :</span>
                  <div className="flex gap-1.5 items-center">
                    <input type="number" disabled={!canEdit} value={p.paid} onChange={(e) => updatePlayerFinance(p.id, 'paid', e.target.value)} className="w-[50px] text-center p-1 rounded bg-[#111] border border-[#444] text-white focus:outline-none focus:border-[var(--accent-blue)]" />
                    <span className="text-[#444]">/</span>
                    <input type="number" disabled={!canEdit} value={p.totalDue} onChange={(e) => updatePlayerFinance(p.id, 'totalDue', e.target.value)} className="w-[50px] text-center p-1 rounded bg-[#111] border border-[#444] text-white focus:outline-none focus:border-[var(--accent-blue)]" />
                  </div>
                </div>

                <div className="text-right text-xs mt-[-2px]">
                  {remaining <= 0 ? (
                    <span className="text-[var(--success)] font-bold">✅ Réglé</span>
                  ) : (
                    <span className="text-[var(--danger)] font-bold">⚠️ Reste : {remaining} €</span>
                  )}
                </div>
                
                {canEdit && <div className="absolute bottom-2 right-2 text-[#444] text-[0.6rem] tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">GLISSER ⠿</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 sm:p-5 w-full h-full flex flex-col max-w-[1920px] mx-auto">
      <div className="mb-6">
        <button onClick={() => setEditId(null)} className="bg-transparent text-[#888] font-bold border border-[#444] px-4 py-2 rounded-md hover:bg-[#333] hover:text-white transition-colors cursor-pointer mb-6">⬅ RETOUR</button>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-[#333] pb-6">
            <div className="flex flex-wrap gap-4 items-center">
                <h2 className="m-0 text-2xl font-bold text-white flex items-center gap-3">
                  🛡️ {team.name}
                </h2>
                {canEdit && (
                  <button onClick={validateAllPlayers} className="bg-[var(--success)] text-white border-none rounded-lg px-4 py-2 font-bold cursor-pointer hover:bg-green-600 transition-colors shadow-md text-sm">
                    ✅ TOUT VALIDER
                  </button>
                )}
            </div>
            
            {canEdit && (
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-dashed border-[#555] w-full lg:max-w-[500px] shadow-lg">
                <h4 className="mt-0 mb-4 text-[#ccc] text-sm font-bold uppercase tracking-wider">➕ Ajout rapide (Multiple)</h4>
                
                {playersDraft.map((draft, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input 
                      className="flex-1 p-2 rounded-md border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-blue)] transition-colors text-sm" 
                      placeholder="Nom du joueur" 
                      value={draft.name} 
                      onChange={e => handleDraftChange(index, 'name', e.target.value)} 
                    />
                    <input 
                      className="w-[70px] p-2 rounded-md border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-blue)] transition-colors text-center text-sm" 
                      type="number" 
                      placeholder="N°" 
                      value={draft.number} 
                      onChange={e => handleDraftChange(index, 'number', e.target.value)} 
                    />
                    {playersDraft.length > 1 && (
                      <button onClick={() => removeDraftRow(index)} className="bg-transparent text-[var(--danger)] border-none cursor-pointer text-xl hover:text-red-400">×</button>
                    )}
                  </div>
                ))}
                
                <div className="flex justify-between items-center mt-4">
                  <button onClick={addDraftRow} className="bg-transparent text-[var(--accent-blue)] border border-dashed border-[var(--accent-blue)] px-3 py-1.5 rounded cursor-pointer text-xs font-bold hover:bg-[rgba(0,212,255,0.1)] transition-colors">
                    + LIGNE
                  </button>
                  <button onClick={saveMultiplePlayers} className="bg-[var(--accent-blue)] text-white border-none rounded px-4 py-2 font-bold cursor-pointer hover:bg-blue-600 transition-colors shadow-md text-xs">
                    💾 SAUVEGARDER
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-5 flex-1 custom-scrollbar">
        {renderPlayerColumn("À VÉRIFIER", "to_check", "#ff4444", "var(--danger)")}
        {renderPlayerColumn("EN ATTENTE", "pending", "#ff6b00", "var(--accent-orange)")}
        {renderPlayerColumn("VALIDÉ", "validated", "#2ecc71", "var(--success)")}
      </div>
    </div>
  );
}