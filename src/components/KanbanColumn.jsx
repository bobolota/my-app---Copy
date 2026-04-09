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
      // 👇 COLONNE PLUS LARGE ICI (min-w-[360px] xl:min-w-[420px])
      // bg-app-panel remplace #15151e et border-muted-line remplace white/5
      className="flex flex-col flex-1 min-w-[360px] xl:min-w-[420px] bg-app-panel/80 backdrop-blur-md rounded-3xl border border-muted-line shadow-2xl transition-all duration-300 p-5 sm:p-6 pb-8 relative overflow-hidden group"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
    >
      {/* Ligne LED Dynamique au sommet */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 opacity-90 transition-opacity duration-300 group-hover:opacity-100" 
        style={{ 
          backgroundColor: accentHex, 
          boxShadow: `0 0 20px ${accentHex}` 
        }}
      ></div>

      {/* En-tête de la colonne */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-muted-line relative z-10">
        <h3 className="m-0 text-white font-black tracking-widest uppercase text-sm sm:text-base flex items-center gap-3 drop-shadow-md">
          {/* Petit point lumineux de la couleur de la colonne */}
          <span 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: accentHex, boxShadow: `0 0 10px ${accentHex}` }}
          ></span>
          {title}
        </h3>
        
        {/* Compteur Premium - bg-app-input remplace black/40 */}
        <span className="bg-app-input border border-muted-line text-white font-black text-xs px-3 py-1.5 rounded-lg shadow-inner flex items-center justify-center min-w-[32px]">
          {filteredTournaments.length}
        </span>
      </div>
      
      {/* Zone de contenu des cartes */}
      <div className="flex flex-col gap-5 overflow-y-auto max-h-[650px] custom-scrollbar pr-2 relative z-10">
        {filteredTournaments.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-12 opacity-40 bg-app-input/50 rounded-2xl border border-dashed border-muted-line">
             {/* text-muted remplace #888 */}
             <p className="text-center text-muted font-black text-xs uppercase tracking-widest m-0">Vide</p>
           </div>
        ) : (
          filteredTournaments.map(t => {
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
          })
        )}
      </div>
    </div>
  );
}