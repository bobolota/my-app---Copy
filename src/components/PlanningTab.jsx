import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function PlanningTab({ tourney, handleLaunchMatch, canEdit, currentUserName }) {
  // 1. On regroupe tous les matchs
  const groupMatches = tourney?.schedule || [];
  const playoffMatches = tourney?.playoffs?.matches || [];
  const allMatches = [...groupMatches, ...playoffMatches].filter(m => m && m.teamA && m.teamB);

  // 2. État pour le tiroir rétractable
  const [showFinishedGroups, setShowFinishedGroups] = useState(false);

  // 3. Filtrage "Mes matchs"
  const myMatches = allMatches.filter(m => {
    const inTeamA = m.teamA?.players?.some(p => p.name === currentUserName);
    const inTeamB = m.teamB?.players?.some(p => p.name === currentUserName);
    return inTeamA || inTeamB;
  });

  const [filter, setFilter] = useState((myMatches.length > 0 && !canEdit) ? 'mine' : 'all');
  
  // 4. Tri chronologique global
  const sortFunction = (a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  };

  // 5. Séparation des matchs pour le tiroir
  const baseMatches = filter === 'mine' ? myMatches : allMatches;
  
  // Les matchs de poules TERMINÉS (ceux qu'on veut rétracter)
  const finishedGroupMatches = baseMatches
    .filter(m => m.group && ['finished', 'canceled', 'forfeit'].includes(m.status))
    .sort(sortFunction);

  // Les matchs ACTIFS (Playoffs, Direct, À venir, ou Poules non finies)
  const activeMatches = baseMatches
    .filter(m => !m.group || !['finished', 'canceled', 'forfeit'].includes(m.status))
    .sort(sortFunction);

  // --- FONCTION DE RENDU DE LA CARTE (Ton code original) ---
  const renderMatchCard = (match, idx) => {
    const isFinished = match.status === 'finished';
    const isCanceled = match.status === 'canceled';
    const isForfeit = match.status === 'forfeit';
    let hasStarted = match.status === 'ongoing' || match.startersValidated === true;
    
    const isLive = !isFinished && !isCanceled && !isForfeit && hasStarted;
    const isUpcoming = !isFinished && !isCanceled && !isForfeit && !hasStarted;

    let statusColor = isLive ? 'var(--accent-orange)' : (isFinished ? 'var(--success)' : (isCanceled ? '#555' : (isForfeit ? 'var(--danger)' : '#888')));
    let statusText = isLive ? '🔥 EN DIRECT' : (isFinished ? '🏁 TERMINÉ' : (isCanceled ? '❌ ANNULÉ' : (isForfeit ? '🏳️ FORFAIT' : 'À VENIR')));

    const canLaunchThisMatch = canEdit || (currentUserName && match.otm && match.otm.includes(currentUserName));
    const isReady = match.teamA?.players?.length >= 5 && match.teamB?.players?.length >= 5;
    const canClick = isReady || isFinished;
    const phaseLabel = match.group ? `POULE ${match.group}` : (match.label ? match.label.toUpperCase() : 'PHASE FINALE');

    return (
      <div 
        key={match.id || idx} 
        onClick={() => {
          if (!canClick && !['canceled', 'forfeit'].includes(match.status)) {
            toast.error("Match indisponible : les équipes sont incomplètes.");
            return;
          }
          if (!['canceled', 'forfeit'].includes(match.status)) handleLaunchMatch(match.id, canLaunchThisMatch);
        }}
        className="team-card-interactive" 
        style={{ 
          background: '#1a1a1a', borderRadius: '12px', padding: '20px', 
          border: `1px solid ${isLive ? 'var(--accent-orange)' : '#333'}`,
          display: 'flex', flexDirection: 'column', gap: '15px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.8rem', fontWeight: 'bold' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ color: match.group ? 'var(--accent-purple)' : 'var(--accent-blue)', letterSpacing: '1px' }}>🏆 {phaseLabel}</span>
            <span style={{ color: '#aaa' }}>📍 {match.court || 'Terrain à définir'}</span>
          </div>
          <span style={{ color: statusColor, background: `${statusColor}22`, padding: '4px 8px', borderRadius: '6px' }}>{statusText}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, textAlign: 'right', fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>{match.teamA?.name || 'TBD'}</div>
          <div style={{ padding: '0 15px', fontSize: '1.6rem', fontWeight: 'bold', color: isUpcoming ? '#555' : 'white' }}>
            {isUpcoming ? 'VS' : `${match.scoreA || 0} - ${match.scoreB || 0}`}
          </div>
          <div style={{ flex: 1, textAlign: 'left', fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>{match.teamB?.name || 'TBD'}</div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#888', borderTop: '1px dashed #333', paddingTop: '10px' }}>
           ⏰ {match.time || 'Horaire non défini'}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px 0' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2 style={{ color: 'white', margin: 0 }}>📅 Planning Général</h2>
        {myMatches.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setFilter('all')} style={{ background: filter === 'all' ? '#555' : '#222', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Tous</button>
            <button onClick={() => setFilter('mine')} style={{ background: filter === 'mine' ? 'var(--accent-purple)' : '#222', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Mes matchs</button>
          </div>
        )}
      </div>
      
      {allMatches.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>Le planning est vide.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* TIROIR MATCHS DE POULES TERMINÉS */}
          {finishedGroupMatches.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid #222' }}>
              <button 
                onClick={() => setShowFinishedGroups(!showFinishedGroups)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: '#777', fontWeight: 'bold' }}
              >
                <span>{showFinishedGroups ? '▼' : '▶'} MATCHS DE POULES TERMINÉS ({finishedGroupMatches.length})</span>
                <span style={{ fontSize: '0.75rem', textDecoration: 'underline' }}>{showFinishedGroups ? 'Rétracter' : 'Afficher'}</span>
              </button>
              {showFinishedGroups && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', padding: '20px', borderTop: '1px solid #222' }}>
                  {finishedGroupMatches.map(renderMatchCard)}
                </div>
              )}
            </div>
          )}

          {/* MATCHS ACTIFS (PLAYOFFS + POULES EN COURS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {activeMatches.map(renderMatchCard)}
            {activeMatches.length === 0 && !showFinishedGroups && (
              <div style={{ textAlign: 'center', color: '#666', gridColumn: '1/-1', padding: '40px' }}>
                Tous les matchs de poules sont terminés. Déroulez le tiroir ci-dessus ou consultez la Phase Finale.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}