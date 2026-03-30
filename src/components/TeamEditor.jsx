// DEBUT DE LA MODIFICATION - src/components/TeamEditor.jsx
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
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  };

  const onDropPlayer = (e, newStatus) => {
    if (!canEdit) return;
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over'); 
    
    const pid = e.dataTransfer.getData("playerId");
    if (!pid) return;

    const updatedPlayers = team.players.map(p => p.id === pid ? { ...p, licenseStatus: newStatus } : p);
    update({ teams: tourney.teams.map(t => t.id === teamId ? { ...t, players: updatedPlayers } : t) });
  };

  const renderPlayerColumn = (title, status, color) => {
    const filteredPlayers = team.players.filter(p => p.licenseStatus === status || (!p.licenseStatus && status === 'to_check'));
    return (
      <div 
        className="dashboard-column"
        onDragOver={(e) => { if(canEdit) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); } }}
        onDragLeave={(e) => { if(canEdit) e.currentTarget.classList.remove('drag-over'); }}
        onDrop={(e) => onDropPlayer(e, status)}
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
                  {canEdit && <button onClick={() => deletePlayer(p.id)} className="dashboard-btn-delete">✕</button>}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#888' }}>
                  <span>Cotisation :</span>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <input type="number" disabled={!canEdit} value={p.paid} onChange={(e) => updatePlayerFinance(p.id, 'paid', e.target.value)} className="tm-mini-input" style={{ width: '45px', textAlign: 'center' }} />
                    <span style={{color: '#444'}}>/</span>
                    <input type="number" disabled={!canEdit} value={p.totalDue} onChange={(e) => updatePlayerFinance(p.id, 'totalDue', e.target.value)} className="tm-mini-input" style={{ width: '45px', textAlign: 'center' }} />
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

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => setEditId(null)} className="btn-tab">⬅ RETOUR</button>
      <div className="tm-flex-between" style={{ margin: '20px 0', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Équipe : {team.name}</h2>
              {canEdit && <button onClick={validateAllPlayers} className="tm-btn-success" style={{ padding: '8px 15px', fontSize: '0.8rem' }}>✅ TOUT VALIDER</button>}
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
                <button onClick={saveMultiplePlayers} className="tm-btn-success">
                  💾 SAUVEGARDER
                </button>
              </div>
            </div>
          )}
      </div>
      <div className="dashboard-pipeline" style={{ height: '65vh' }}>
        {renderPlayerColumn("À VÉRIFIER", "to_check", "#ff4444")}
        {renderPlayerColumn("EN ATTENTE", "pending", "var(--accent-orange)")}
        {renderPlayerColumn("VALIDÉ", "validated", "var(--success)")}
      </div>
    </div>
  );
}
// FIN DE LA MODIFICATION