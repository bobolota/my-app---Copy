import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; 

export default function Dashboard({ tournaments, setTournaments, setActiveTourneyId, setView, userRole, userSubscription, session }) {
  const [name, setName] = useState("");
  const [draggedId, setDraggedId] = useState(null);
  const [pinCode, setPinCode] = useState("");

  const [periodCount, setPeriodCount] = useState(4);
  const [periodDuration, setPeriodDuration] = useState(10);
  const [timeoutsHalf1, setTimeoutsHalf1] = useState(2);
  const [timeoutsHalf2, setTimeoutsHalf2] = useState(3);

  const canCreate = userRole === 'ADMIN' || userSubscription === 'PRO';

  const visibleTournaments = tournaments.filter(t => {
    if (userRole === 'ADMIN') return true;       
    if (userRole === 'SPECTATOR') return true;   
    
    const isOwner = t.organizer_id === session.user.id;
    const isInvitedOtm = t.otm_ids && t.otm_ids.includes(session.user.id);
    
    return isOwner || isInvitedOtm;
  });

  const create = async () => {
    if (!canCreate || !name.trim()) return;
    
    const generatedPin = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newT = { 
      id: "t_" + Date.now(), 
      name, 
      teams: [], 
      schedule: [], 
      status: 'preparing', 
      date: new Date().toLocaleDateString(),
      organizer_id: session.user.id,
      pin_code: generatedPin,
      otm_ids: [],
      // CORRECTION ICI : "matchsettings" tout en minuscules pour la base de données !
      matchsettings: {
        periodCount: parseInt(periodCount) || 4,
        periodDuration: parseInt(periodDuration) || 10,
        timeoutsHalf1: parseInt(timeoutsHalf1) || 2,
        timeoutsHalf2: parseInt(timeoutsHalf2) || 3
      }
    };
    
    setTournaments([...tournaments, newT]);
    setName("");

    setPeriodCount(4);
    setPeriodDuration(10);
    setTimeoutsHalf1(2); setTimeoutsHalf2(3);

    const { error } = await supabase.from('tournaments').insert([newT]);
    if (error) {
      console.error("Erreur de sauvegarde :", error);
      alert("Erreur lors de la création du tournoi dans le cloud.");
    }
  };

  const joinAsOtm = async () => {
    if (!pinCode.trim()) return;
    
    try {
      const { data, error } = await supabase.rpc('join_as_otm', { pin: pinCode.trim().toUpperCase() });
      
      if (error) throw error;
      
      alert("Succès ! Vous êtes maintenant OTM sur ce tournoi.");
      setPinCode("");
      
    } catch (error) {
      alert(error.message || "Code PIN invalide.");
    }
  };

  const onDragStart = (e, tourney) => {
    const canEditTourney = userRole === 'ADMIN' || tourney.organizer_id === session.user.id;
    if (!canEditTourney) { e.preventDefault(); return; }
    
    setDraggedId(tourney.id);
    e.dataTransfer.setData("tourneyId", tourney.id);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      if(e.target) {
        e.target.style.opacity = "0.2";
        e.target.style.transform = "scale(0.95)";
      }
    }, 0);
  };

  const onDragEnd = (e, tourney) => {
    const canEditTourney = userRole === 'ADMIN' || tourney.organizer_id === session.user.id;
    if (!canEditTourney) return;

    setDraggedId(null);
    if(e.target) {
      e.target.style.opacity = "1";
      e.target.style.transform = "scale(1)";
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const onDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const onDrop = async (e, newStatus) => {
    e.preventDefault();
    onDragLeave(e);
    
    const id = e.dataTransfer.getData("tourneyId");
    if (!id) return; 

    const tourney = tournaments.find(t => t.id === id);
    if (userRole !== 'ADMIN' && tourney.organizer_id !== session.user.id) {
        alert("Seul l'organisateur peut déplacer le tournoi.");
        return;
    }

    const updated = tournaments.map(t => t.id === id ? { ...t, status: newStatus } : t);
    setTournaments(updated);

    const { error } = await supabase.from('tournaments').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error("Erreur de mise à jour :", error);
      alert("Erreur lors du déplacement du tournoi.");
    }
  };

  const deleteTourney = async (e, id) => {
    e.stopPropagation();
    
    if (window.confirm("Cacher ce tournoi DÉFINITIVEMENT pour tous les utilisateurs ?")) {
      // 1. On le retire visuellement de l'écran immédiatement
      setTournaments(tournaments.filter(t => t.id !== id));

      // 2. On ruse : au lieu de .delete(), on fait un .update() pour le cacher.
      // Comme tu as le droit de modification, Supabase va accepter sans broncher !
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'deleted' })
        .eq('id', id);

      if (error) {
        console.error("Erreur lors de la mise à jour du statut :", error);
        alert("Erreur de connexion avec le cloud.");
      }
    }
  };

  const renderColumn = (title, status, color) => (
    <div 
      className="dashboard-column"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
    >
      <h3 className="dashboard-col-title" style={{ borderBottom: `3px solid ${color}` }}>
        {title} <span style={{ opacity: 0.4 }}>({visibleTournaments.filter(t => t.status === status).length})</span>
      </h3>
      
      <div className="dashboard-scroll-area">
        {visibleTournaments
          .filter(t => t.status === status || (!t.status && status === 'preparing'))
          .map(t => {
            const isOwnerOrAdmin = userRole === 'ADMIN' || t.organizer_id === session.user.id; 
            
            return (
              <div 
                key={t.id} 
                draggable={isOwnerOrAdmin}
                onDragStart={(e) => onDragStart(e, t)}
                onDragEnd={(e) => onDragEnd(e, t)}
                onClick={() => { setActiveTourneyId(t.id); setView('tournament'); }}
                className={`dashboard-card ${draggedId === t.id ? 'grabbing' : ''}`}
                style={{ cursor: isOwnerOrAdmin ? 'grab' : 'pointer' }}
              >
                <div className="dashboard-card-header">
                  <strong className="dashboard-card-title" style={{ color: color }}>{t.name}</strong>
                  {isOwnerOrAdmin && (
                    <button onClick={(e) => deleteTourney(e, t.id)} className="dashboard-btn-delete">✕</button>
                  )}
                </div>
                
                {/* CORRECTION ICI AUSSI : matchsettings */}
                <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '5px', background: '#111', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                  ⚙️ {t.matchsettings?.periodCount || 4}x{t.matchsettings?.periodDuration || 10}min | TM: {t.matchsettings?.timeoutsHalf1 || 2} (1ère) - {t.matchsettings?.timeoutsHalf2 || 3} (2ème)
                </div>

                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>👥 {t.teams?.length || 0} équipes | 📅 {t.schedule?.length || 0} matchs</span>
                  {(!isOwnerOrAdmin && t.otm_ids?.includes(session.user.id)) && (
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>OTM 📝</span>
                  )}
                </div>
                {isOwnerOrAdmin && <div className="dashboard-drag-handle">⠿ GLISSER POUR PORTER</div>}
              </div>
            );
          })}
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🛰️ Centre de Contrôle</h1>
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            
            
            {canCreate && (
              <div className="dashboard-controls" style={{ background: '#1a1a1a', padding: '15px', borderRadius: '12px', border: '1px dashed var(--accent-purple)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <strong style={{fontSize: '0.9rem', color: 'var(--accent-purple)'}}>🛠 Créer un nouveau tournoi</strong>
                  
                  <input 
  className="dashboard-input"
  placeholder="Nom du tournoi..." 
  value={name} 
  onChange={e => setName(e.target.value)} 
  style={{ 
    width: '100%', 
    marginBottom: '5px',
    boxSizing: 'border-box' /* 🛠️ AJOUTE CETTE LIGNE ICI */
  }}
/>
                  
                  <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <label style={{fontSize: '0.7rem', color: '#888', marginBottom: '4px'}}>Périodes</label>
                          <input type="number" min="1" max="10" className="dashboard-input" value={periodCount} onChange={e => setPeriodCount(e.target.value)} style={{ width: '60px', padding: '8px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <label style={{fontSize: '0.7rem', color: '#888', marginBottom: '4px'}}>Min/Période</label>
                          <input type="number" min="1" max="60" className="dashboard-input" value={periodDuration} onChange={e => setPeriodDuration(e.target.value)} style={{ width: '70px', padding: '8px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <label style={{fontSize: '0.7rem', color: '#888', marginBottom: '4px'}}>TM 1ère MT</label>
                          <input type="number" min="0" max="10" className="dashboard-input" value={timeoutsHalf1} onChange={e => setTimeoutsHalf1(e.target.value)} style={{ width: '65px', padding: '8px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <label style={{fontSize: '0.7rem', color: '#888', marginBottom: '4px'}}>TM 2ème MT</label>
                          <input type="number" min="0" max="10" className="dashboard-input" value={timeoutsHalf2} onChange={e => setTimeoutsHalf2(e.target.value)} style={{ width: '65px', padding: '8px' }} />
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button onClick={create} className="dashboard-btn-create" style={{ padding: '10px 20px', height: '37px' }}>+ CRÉER</button>
                      </div>
                  </div>
              </div>
            )}

        </div>
      </div>

      <div className="dashboard-pipeline">
        {renderColumn("PRÉPARATION", "preparing", "var(--accent-purple)")}
        {renderColumn("EN COURS", "ongoing", "var(--accent-orange)")}
        {renderColumn("TERMINÉ", "finished", "var(--success)")}
      </div>
    </div>
  );
}