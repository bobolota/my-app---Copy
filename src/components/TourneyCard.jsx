import React from 'react';

export default function TourneyCard({ 
  tourney, 
  isOwnerOrAdmin, 
  onDragStart, 
  onDragEnd, 
  onClick, 
  draggedId, 
  accentHex, 
  deleteTourney, 
  session 
}) {
  // 👇 Détection automatique du format du tournoi (5 par défaut)
  const courtSize = parseInt(tourney?.matchsettings?.courtSize) || 5;

  return (
    <div 
      draggable={isOwnerOrAdmin}
      onDragStart={(e) => onDragStart(e, tourney)}
      onDragEnd={(e) => onDragEnd(e, tourney)}
      onClick={onClick}
      className={`bg-app-card p-4 rounded-xl border-l-4 transition-all duration-200 relative group shadow-md ${draggedId === tourney.id ? 'opacity-50 scale-95 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'opacity-100 hover:-translate-y-1 hover:shadow-lg'} ${isOwnerOrAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      style={{ borderLeftColor: accentHex }}
    >
      <div className="flex justify-between items-start mb-2 pr-6">
        <strong className="text-lg font-heading text-white truncate">{tourney.name}</strong>
        {isOwnerOrAdmin && (
          <button 
            onClick={(e) => { e.stopPropagation(); deleteTourney(e, tourney.id); }} 
            className="absolute top-2 right-2 text-muted-dark bg-transparent border-none text-xl cursor-pointer opacity-0 group-hover:opacity-100 hover:text-danger transition-all"
            title="Supprimer"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* 👇 NOUVELLE DISPOSITION DES BADGES (Format + Réglages) 👇 */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="inline-flex items-center bg-secondary/10 text-secondary text-[0.7rem] px-2 py-1 rounded border border-secondary/20 font-black tracking-widest">
          🏀 {courtSize}x{courtSize}
        </div>
        <div className="inline-flex items-center bg-app-input text-muted-light text-[0.7rem] px-2 py-1 rounded border border-muted-line font-bold">
          ⚙️ {tourney.matchsettings?.periodCount || 4}x{tourney.matchsettings?.periodDuration || 10}min | TM: {tourney.matchsettings?.timeoutsHalf1 || 2} - {tourney.matchsettings?.timeoutsHalf2 || 3}
        </div>
      </div>

      <div className="flex justify-between items-center text-xs font-bold text-muted border-t border-dashed border-muted-line pt-3">
        <span>👥 {tourney.teams?.length || 0} équipes | 📅 {tourney.schedule?.length || 0} matchs</span>
        {(!isOwnerOrAdmin && tourney.otm_ids?.includes(session.user.id)) && (
            <span className="text-action bg-action/10 px-2 py-1 rounded-md">OTM 📝</span>
        )}
      </div>
      {isOwnerOrAdmin && <div className="absolute bottom-2 right-2 text-muted-dark text-[0.6rem] tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">GLISSER ⠿</div>}
    </div>
  );
}