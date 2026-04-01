import React from 'react';
import TourneyCard from './TourneyCard';

export default function KanbanColumn({ 
  title, 
  status, 
  accentHex, 
  visibleTournaments, 
  onDragOver, 
  onDragLeave, 
  onDrop, 
  userRole, 
  session, 
  onDragStart, 
  onDragEnd, 
  setActiveTourneyId, 
  setView, 
  draggedId, 
  deleteTourney 
}) {
  const filteredTournaments = visibleTournaments.filter(t => t.status === status || (!t.status && status === 'preparing'));

  return (
    <div 
      className="flex flex-col flex-1 min-w-[300px] bg-[#1a1a1a] rounded-xl border border-[#333] transition-colors p-4 pb-8"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="flex justify-between items-center mb-5 pb-3 border-b-4" style={{ borderBottomColor: accentHex }}>
        <h3 className="m-0 text-white font-bold tracking-wider">{title}</h3>
        <span className="text-[#888] font-bold text-xl">{filteredTournaments.length}</span>
      </div>
      
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] custom-scrollbar pr-2">
        {filteredTournaments.map(t => {
          const isOwnerOrAdmin = userRole === 'ADMIN' || t.organizer_id === session.user.id; 
          return (
            <TourneyCard 
              key={t.id}
              tourney={t}
              isOwnerOrAdmin={isOwnerOrAdmin}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={() => { setActiveTourneyId(t.id); setView('tournament'); }}
              draggedId={draggedId}
              accentHex={accentHex}
              deleteTourney={deleteTourney}
              session={session}
            />
          );
        })}
      </div>
    </div>
  );
}