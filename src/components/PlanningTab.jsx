import React, { useState } from 'react';
import MatchCard from './MatchCard'; // 👈 On importe notre nouveau composant !

export default function PlanningTab({ tourney, handleLaunchMatch, canEdit, currentUserName }) {
  const groupMatches = tourney?.schedule || [];
  const playoffMatches = tourney?.playoffs?.matches || [];
  const allMatches = [...groupMatches, ...playoffMatches].filter(m => m && m.teamA && m.teamB);

  const [showFinishedGroups, setShowFinishedGroups] = useState(false);

  const myMatches = allMatches.filter(m => {
    const inTeamA = m.teamA?.players?.some(p => p.name === currentUserName);
    const inTeamB = m.teamB?.players?.some(p => p.name === currentUserName);
    return inTeamA || inTeamB;
  });

  const [filter, setFilter] = useState((myMatches.length > 0 && !canEdit) ? 'mine' : 'all');
  
  const sortFunction = (a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  };

  const baseMatches = filter === 'mine' ? myMatches : allMatches;
  
  const finishedGroupMatches = baseMatches
    .filter(m => m.group && ['finished', 'canceled', 'forfeit'].includes(m.status))
    .sort(sortFunction);

  const activeMatches = baseMatches
    .filter(m => !m.group || !['finished', 'canceled', 'forfeit'].includes(m.status))
    .sort(sortFunction);

  return (
    <div className="py-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#333] pb-3 mb-6 gap-4">
        <h2 className="text-white text-xl sm:text-2xl font-bold m-0">📅 Planning Général</h2>
        
        {myMatches.length > 0 && (
          <div className="flex gap-2 bg-[#1a1a1a] p-1 rounded-lg border border-[#333]">
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors cursor-pointer ${filter === 'all' ? 'bg-[#444] text-white' : 'bg-transparent text-gray-400 hover:text-white'}`}>Tous les matchs</button>
            <button onClick={() => setFilter('mine')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors cursor-pointer ${filter === 'mine' ? 'bg-[var(--accent-purple)] text-white shadow-md' : 'bg-transparent text-gray-400 hover:text-white'}`}>Mes matchs</button>
          </div>
        )}
      </div>
      
      {allMatches.length === 0 ? (
        <div className="text-center text-[#666] mt-10 p-10 border border-dashed border-[#333] rounded-xl bg-white/5">
            <span className="text-4xl block mb-4">📭</span>
            Le planning est vide pour le moment.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {finishedGroupMatches.length > 0 && (
            <div className="bg-[rgba(255,255,255,0.02)] rounded-xl border border-[#222] overflow-hidden">
              <button onClick={() => setShowFinishedGroups(!showFinishedGroups)} className="w-full bg-transparent border-none px-5 py-4 flex justify-between items-center cursor-pointer text-[#777] font-bold hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-center gap-3"><span className="text-[10px] w-4 text-center">{showFinishedGroups ? '▼' : '▶'}</span><span>MATCHS DE POULES TERMINÉS ({finishedGroupMatches.length})</span></div>
                <span className="text-xs underline">{showFinishedGroups ? 'Rétracter' : 'Afficher'}</span>
              </button>
              {showFinishedGroups && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 p-5 border-t border-[#222] bg-[#0a0a0a]">
                  {/* 👇 Utilisation du nouveau composant ! 👇 */}
                  {finishedGroupMatches.map(match => (
                    <MatchCard key={match.id} match={match} currentUserName={currentUserName} canEdit={canEdit} handleLaunchMatch={handleLaunchMatch} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {/* 👇 Utilisation du nouveau composant ! 👇 */}
            {activeMatches.map(match => (
              <MatchCard key={match.id} match={match} currentUserName={currentUserName} canEdit={canEdit} handleLaunchMatch={handleLaunchMatch} />
            ))}
            
            {activeMatches.length === 0 && !showFinishedGroups && (
              <div className="text-center text-[#666] col-span-full py-10 px-5 border border-dashed border-[#333] rounded-xl bg-white/5 italic">
                Tous les matchs de poules sont terminés. <br/>Déroulez le tiroir ci-dessus pour les consulter, ou allez voir la Phase Finale !
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}