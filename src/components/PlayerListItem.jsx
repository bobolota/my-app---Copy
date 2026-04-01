import React from 'react';

export default function PlayerListItem({ player, viewPlayerProfile }) {
  return (
    <div className="flex justify-between items-center bg-[#222] p-3 rounded-md border border-[#333] hover:border-[#444] transition-colors">
      <div>
        <strong className="block text-white text-base mb-1">{player.full_name}</strong>
        <span className="text-xs text-[var(--accent-purple)] font-bold bg-[rgba(157,78,221,0.1)] px-2 py-0.5 rounded">
          {player.position || 'Poste inconnu'}
        </span>
        <span className="text-xs text-gray-400 ml-2">
          📍 {player.city || 'Ville inconnue'}
        </span>
      </div>
      <button 
        onClick={() => viewPlayerProfile(player)} 
        className="bg-transparent text-[var(--accent-purple)] border border-[var(--accent-purple)] px-3 py-1.5 rounded cursor-pointer text-xs font-bold hover:bg-[var(--accent-purple)] hover:text-white transition-colors"
      >
        PROFIL
      </button>
    </div>
  );
}