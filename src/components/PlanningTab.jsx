import React, { useState } from 'react';
import MatchCard from './MatchCard'; // 👈 On importe notre nouveau composant !

export default function PlanningTab({ tourney, handleLaunchMatch, canEdit, currentUserName, update }) {
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
    // 1. Les matchs AVEC une date/heure s'affichent en premier
    if (a.datetime && !b.datetime) return -1;
    if (!a.datetime && b.datetime) return 1;
    
    // 2. Si les deux ont une date, on trie par ordre chronologique
    if (a.datetime && b.datetime) {
      return new Date(a.datetime) - new Date(b.datetime);
    }
    
    // 3. Fallback (ordre de création)
    return 0;
  };

  const baseMatches = filter === 'mine' ? myMatches : allMatches;
  
  const finishedGroupMatches = baseMatches
    .filter(m => m.group && ['finished', 'canceled', 'forfeit'].includes(m.status))
    .sort(sortFunction);

  const activeMatches = baseMatches
    .filter(m => !m.group || !['finished', 'canceled', 'forfeit'].includes(m.status))
    .sort(sortFunction);

  return (
    <div className="py-4 w-full flex-1 flex flex-col box-border">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-5 mb-8 gap-5 w-full">
        <div className="text-left">
          <h2 className="m-0 text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-start gap-3">
            <span className="text-3xl drop-shadow-lg">📅</span> 
            Planning Général
          </h2>
          <p className="mt-2 text-[#888] font-medium text-sm text-left">
            Consulte le calendrier des rencontres et suis l'évolution du tournoi.
          </p>
        </div>
        
        {/* Toggle Filtre Pro */}
        {myMatches.length > 0 && (
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 shadow-inner shrink-0">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'all' ? 'bg-[#333] text-white shadow-md' : 'text-[#666] hover:text-[#aaa]'}`}
            >
              Tous les matchs
            </button>
            <button 
              onClick={() => setFilter('mine')} 
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'mine' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-md' : 'text-[#666] hover:text-[#aaa]'}`}
            >
              Mes matchs
            </button>
          </div>
        )}
      </div>
      
      {allMatches.length === 0 ? (
        <div className="bg-[#15151e]/60 backdrop-blur-md border border-white/5 rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden flex flex-col items-center mt-4">
          <span className="text-5xl mb-4 drop-shadow-2xl">📭</span>
          <h3 className="text-xl text-white font-black mb-2 tracking-wide">Le planning est vide</h3>
          <p className="text-[#888] text-sm font-medium m-0 max-w-sm leading-relaxed">
            Aucun match n'a encore été programmé pour ce tournoi. Reviens un peu plus tard !
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          
          {/* ACCORDÉON : MATCHS TERMINÉS PREMIUM */}
          {finishedGroupMatches.length > 0 && (
            <div className="bg-[#15151e]/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-lg transition-all">
              <button 
                onClick={() => setShowFinishedGroups(!showFinishedGroups)} 
                className="w-full bg-transparent border-none px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] w-6 h-6 flex items-center justify-center bg-black/40 rounded-full text-[#888] group-hover:text-white transition-colors border border-white/5">
                    {showFinishedGroups ? '▼' : '▶'}
                  </span>
                  <span className="text-xs font-black tracking-widest text-[#888] group-hover:text-[#ccc] transition-colors uppercase">
                    Matchs de poules terminés ({finishedGroupMatches.length})
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#666] group-hover:text-[#aaa] bg-black/30 px-2.5 py-1 rounded border border-white/5 transition-colors">
                  {showFinishedGroups ? 'Rétracter' : 'Afficher'}
                </span>
              </button>
              
              {showFinishedGroups && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 border-t border-white/5 bg-black/20">
                  {/* 👇 Utilisation du composant MatchCard 👇 */}
                  {finishedGroupMatches.map(match => (
                    <MatchCard 
                      key={match.id} 
                      match={match} 
                      tourney={tourney}
                      currentUserName={currentUserName} 
                      canEdit={canEdit} 
                      handleLaunchMatch={handleLaunchMatch} 
                      isPublicScoreboard={tourney.isPublicScoreboard} 
                      update={update}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GRILLE DES MATCHS ACTIFS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* 👇 Utilisation du composant MatchCard 👇 */}
            {activeMatches.map(match => (
              <MatchCard 
                key={match.id} 
                match={match} 
                tourney={tourney}
                currentUserName={currentUserName} 
                canEdit={canEdit} 
                handleLaunchMatch={handleLaunchMatch} 
                isPublicScoreboard={tourney.isPublicScoreboard} 
                update={update}
              />
            ))}
            
            {/* MESSAGE : TOUS LES MATCHS SONT FINIS */}
            {activeMatches.length === 0 && !showFinishedGroups && (
              <div className="col-span-full py-12 px-6 border border-dashed border-white/10 rounded-2xl bg-white/5 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-4xl mb-3 opacity-80">🏁</span>
                <p className="text-[#aaa] font-medium text-sm m-0 leading-relaxed max-w-md">
                  Tous les matchs de poules sont terminés. <br/>
                  <span className="text-[#888] text-xs">Déroulez le tiroir ci-dessus pour les consulter, ou allez voir l'onglet Phase Finale !</span>
                </p>
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}