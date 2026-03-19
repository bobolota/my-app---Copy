import React, { useState } from 'react';

export default function Dashboard({ tournaments, setTournaments, setActiveTourneyId, setView }) {
  const [name, setName] = useState("");
  const [draggedId, setDraggedId] = useState(null);

  const create = () => {
    if (!name.trim()) return;
    const newT = { 
      id: "t_" + Date.now(), 
      name, 
      teams: [], 
      schedule: [], 
      status: 'preparing', 
      date: new Date().toLocaleDateString() 
    };
    setTournaments([...tournaments, newT]);
    setName("");
  };

  // --- LOGIQUE DRAG & DROP ---
  const onDragStart = (e, tourneyId) => {
    setDraggedId(tourneyId);
    e.dataTransfer.setData("tourneyId", tourneyId);
    e.dataTransfer.effectAllowed = "move";
    
    setTimeout(() => {
      const el = e.target;
      el.style.opacity = "0.2";
      el.style.transform = "scale(0.95)";
    }, 0);
  };

  const onDragEnd = (e) => {
    setDraggedId(null);
    e.target.style.opacity = "1";
    e.target.style.transform = "scale(1)";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const onDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const onDrop = (e, newStatus) => {
    e.preventDefault();
    onDragLeave(e);
    const id = e.dataTransfer.getData("tourneyId");
    const updated = tournaments.map(t => 
      t.id === id ? { ...t, status: newStatus } : t
    );
    setTournaments(updated);
  };

  const deleteTourney = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Supprimer ce tournoi ?")) {
      setTournaments(tournaments.filter(t => t.id !== id));
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
        {title} <span style={{ opacity: 0.4 }}>({tournaments.filter(t => t.status === status).length})</span>
      </h3>
      
      <div className="dashboard-scroll-area">
        {tournaments
          .filter(t => t.status === status || (!t.status && status === 'preparing'))
          .map(t => (
            <div 
              key={t.id} 
              draggable 
              onDragStart={(e) => onDragStart(e, t.id)}
              onDragEnd={onDragEnd}
              onClick={() => { setActiveTourneyId(t.id); setView('tournament'); }}
              className={`dashboard-card ${draggedId === t.id ? 'grabbing' : ''}`}
            >
              <div className="dashboard-card-header">
                <strong className="dashboard-card-title" style={{ color: color }}>{t.name}</strong>
                <button onClick={(e) => deleteTourney(e, t.id)} className="dashboard-btn-delete">✕</button>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '10px' }}>
                👥 {t.teams.length} équipes | 📅 {t.schedule.length} matchs
              </div>
              <div className="dashboard-drag-handle">⠿ GLISSER POUR PORTER</div>
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🛰️ Centre de Contrôle</h1>
        <div className="dashboard-controls">
          <input 
            className="dashboard-input"
            placeholder="Nom du tournoi..." 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
          <button onClick={create} className="dashboard-btn-create">+ NOUVEAU</button>
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