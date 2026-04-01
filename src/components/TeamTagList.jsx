import React from 'react';

export default function TeamTagList({ teams }) {
  if (!teams || teams.length === 0) {
    return <p className="text-[#666] italic text-xs mb-4">Aucune équipe inscrite pour le moment.</p>;
  }
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {teams.map((team, idx) => (
        <span 
          key={idx} 
          className="bg-[#222] border border-[#444] text-[#ccc] text-xs px-2.5 py-1 rounded-md font-bold shadow-sm"
        >
          🛡️ {team.name}
        </span>
      ))}
    </div>
  );
}