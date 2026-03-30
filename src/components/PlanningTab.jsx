import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function PlanningTab({ tourney, handleLaunchMatch, canEdit, currentUserName }) {
  // 1. On regroupe tous les matchs existants (Poules + Playoffs)
  const groupMatches = tourney?.schedule || [];
  const playoffMatches = tourney?.playoffs?.matches || [];
  
  // On filtre pour ne garder que les vrais matchs (qui ont deux équipes)
  const allMatches = [...groupMatches, ...playoffMatches].filter(m => m && m.teamA && m.teamB);

  // --- LOGIQUE DE FILTRAGE "MES MATCHS" ---
  const myMatches = allMatches.filter(m => {
    const inTeamA = m.teamA?.players?.some(p => p.name === currentUserName);
    const inTeamB = m.teamB?.players?.some(p => p.name === currentUserName);
    return inTeamA || inTeamB;
  });

  // Par défaut : "Mes matchs" si le user joue, sinon "Tous" (l'admin voit tout par défaut)
  const [filter, setFilter] = useState((myMatches.length > 0 && !canEdit) ? 'mine' : 'all');
  const displayedMatches = filter === 'mine' ? myMatches : allMatches;
  // ----------------------------------------

  // Affichage de la page (Le titre ne disparaîtra plus jamais !)
  return (
    <div className="fade-in-up" style={{ padding: '20px 0' }}>
      
      {/* EN-TÊTE AVEC SYSTÈME DE FILTRE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2 style={{ color: 'white', margin: 0 }}>
          📅 Planning Général
        </h2>

        {/* On affiche les boutons seulement si l'utilisateur est concerné par des matchs */}
        {myMatches.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setFilter('all')}
              style={{ background: filter === 'all' ? '#555' : '#222', color: 'white', border: filter === 'all' ? '1px solid #777' : '1px solid #444', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: filter === 'all' ? 'bold' : 'normal' }}
            >
              Tous les matchs
            </button>
            <button 
              onClick={() => setFilter('mine')}
              style={{ background: filter === 'mine' ? 'var(--accent-purple)' : '#222', color: 'white', border: filter === 'mine' ? '1px solid var(--accent-purple)' : '1px solid #444', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: filter === 'mine' ? 'bold' : 'normal' }}
            >
              Mes matchs
            </button>
          </div>
        )}
      </div>
      
      {/* --- GESTION DES AFFICHAGES VIDES (EMPTY STATES) --- */}
      {allMatches.length === 0 ? (
        <div className="empty-state-container" style={{ marginTop: '40px', opacity: 1, animation: 'none', transform: 'none' }}>
          <div className="empty-state-icon">📅</div>
          <h3 className="empty-state-title">Le planning est vide</h3>
          <p className="empty-state-desc">Le calendrier des matchs de ce tournoi n'a pas encore été généré par les organisateurs.</p>
        </div>
      ) : displayedMatches.length === 0 ? (
        <div className="empty-state-container" style={{ marginTop: '40px', opacity: 1, animation: 'none', transform: 'none' }}>
          <div className="empty-state-icon">🪑</div>
          <h3 className="empty-state-title">Aucun match pour toi</h3>
          <p className="empty-state-desc">Tu n'as aucun match prévu avec ton équipe pour le moment dans ce filtre.</p>
        </div>
      ) : (
        /* --- AFFICHAGE DES MATCHS FILTRÉS --- */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {displayedMatches.map((match, idx) => {
            
            // --- A. DÉTECTION DU STATUT DU MATCH ---
            const isFinished = match.status === 'finished';
            const isCanceled = match.status === 'canceled';
            const isForfeit = match.status === 'forfeit';

            let hasStarted = match.status === 'ongoing' || match.startersValidated === true || (match.liveHistory && match.liveHistory.length > 0);
            
            if (!hasStarted) {
                try {
                    const localSave = localStorage.getItem(`basketMatchSave_${match.id}`);
                    if (localSave) {
                        const parsed = JSON.parse(localSave);
                        hasStarted = parsed.startersValidated === true || (parsed.history && parsed.history.length > 0);
                    }
                } catch(e) {}
            }

            const isLive = !isFinished && !isCanceled && !isForfeit && hasStarted;
            const isUpcoming = !isFinished && !isCanceled && !isForfeit && !hasStarted;

            // --- B. BADGES ET COULEURS ---
            let statusColor = '#888';
            let statusText = 'À VENIR';
            let bgOpacity = '11'; 

            if (isLive) {
              statusColor = 'var(--accent-orange)';
              statusText = '🔥 EN DIRECT';
              bgOpacity = '22';
            } else if (isFinished) {
              statusColor = 'var(--success)';
              statusText = '🏁 TERMINÉ';
            } else if (isCanceled) {
              statusColor = '#555';
              statusText = '❌ ANNULÉ';
            } else if (isForfeit) {
              statusColor = 'var(--danger)';
              statusText = '🏳️ FORFAIT';
            }

            const scoreA = match.scoreA || 0;
            const scoreB = match.scoreB || 0;

            const isAssignedOtm = currentUserName && match.otm && match.otm.includes(currentUserName);
            const canLaunchThisMatch = canEdit || isAssignedOtm;
            const isReady = match.teamA?.players?.length >= 5 && match.teamB?.players?.length >= 5;
            const canClick = isReady || isFinished;
            const phaseLabel = match.group 
              ? `POULE ${match.group}` 
              : (match.label ? match.label.toUpperCase() : 'PHASE FINALE');

            return (
              <div 
                key={match.id || idx} 
                onClick={() => {
                  if (!canClick && !['canceled', 'forfeit'].includes(match.status)) {
                    toast.error("Match indisponible : les équipes sont incomplètes.");
                    return;
                  }
                  if (!['canceled', 'forfeit'].includes(match.status)) {
                    handleLaunchMatch(match.id, canLaunchThisMatch);
                  }
                }}
                className="team-card-interactive" 
                style={{ 
                  background: '#1a1a1a', 
                  borderRadius: '12px', 
                  padding: '20px', 
                  border: `1px solid ${isLive ? 'var(--accent-orange)' : '#333'}`,
                  boxShadow: isLive ? '0 0 15px rgba(255, 107, 0, 0.1)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px'
                }}
              >
                {/* EN-TÊTE : Phase, Terrain et Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ color: match.group ? 'var(--accent-purple)' : 'var(--accent-blue)', letterSpacing: '1px' }}>
                      🏆 {phaseLabel}
                    </span>
                    <span style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>📍</span> {match.court || 'Terrain à définir'}
                    </span>
                  </div>
                  <span style={{ color: statusColor, background: `${statusColor}${bgOpacity}`, padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                    {statusText}
                  </span>
                </div>

                {/* CORPS : Équipes et Scores */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: '1.1rem', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-heading)' }}>
                    {match.teamA?.name || 'TBD'}
                  </div>
                  
                  <div style={{ padding: '0 15px', fontSize: '1.6rem', fontWeight: 'bold', color: isUpcoming ? '#555' : 'white', whiteSpace: 'nowrap' }}>
                    {isUpcoming ? 'VS' : `${scoreA} - ${scoreB}`}
                  </div>
                  
                  <div style={{ flex: 1, textAlign: 'left', fontSize: '1.1rem', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-heading)' }}>
                    {match.teamB?.name || 'TBD'}
                  </div>
                </div>

                {/* PIED DE CARTE */}
                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#888', marginTop: '5px', borderTop: '1px dashed #333', paddingTop: '10px' }}>
                  {isLive && match.livePeriod ? (
                    <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold' }}>⏱️ Période : {match.livePeriod}</span>
                  ) : (
                    <span>⏰ {match.time || 'Horaire non défini'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}