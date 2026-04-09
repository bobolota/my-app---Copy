import React from 'react';

export default function PlayerListItem({ player, viewPlayerProfile }) {
  return (
    <div className="flex justify-between items-center bg-app-card p-4 rounded-xl border border-muted-line hover:border-action/40 transition-colors shadow-sm">
      <div>
        <strong className="block text-white text-base mb-1 tracking-wide">{player.full_name}</strong>
        <span className="text-[10px] uppercase tracking-widest text-action font-black bg-action/10 border border-action/20 px-2 py-0.5 rounded-md">
          {player.position || 'Poste inconnu'}
        </span>
        <span className="text-xs font-bold text-muted ml-2">
          📍 {player.city || 'Ville inconnue'}
        </span>
      </div>
      <button 
        onClick={() => viewPlayerProfile(player)} 
        className="bg-transparent text-action border border-action/40 px-4 py-2 rounded-lg cursor-pointer text-xs font-black tracking-widest uppercase hover:bg-action hover:text-white transition-colors shadow-inner"
      >
        PROFIL
      </button>
    </div>
  );
}