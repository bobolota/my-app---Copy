import React, { useState } from 'react';
import MatchCard from './MatchCard'; 

export default function PlanningTab({ tourney, handleLaunchMatch, canEdit, currentUserName, update }) {
  // V2 : Plus besoin de fusionner, tout est déjà dans tourney.matches !
  const allMatches = (tourney?.matches || []).filter(m => m && m.teamA && m.teamB);

  const [showFinishedGroups, setShowFinishedGroups] = useState(false);

  const myMatches = allMatches.filter(m => {
    const inTeamA = m.teamA?.players?.some(p => p.name === currentUserName);
    const inTeamB = m.teamB?.players?.some(p => p.name === currentUserName);
    return inTeamA || inTeamB;
  });

  const [filter, setFilter] = useState((myMatches.length > 0 && !canEdit) ? 'mine' : 'all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all'); 
  
  const sortFunction = (a, b) => {
    if (a.datetime && !b.datetime) return -1;
    if (!a.datetime && b.datetime) return 1;
    if (a.datetime && b.datetime) return new Date(a.datetime) - new Date(b.datetime);
    return 0;
  };

  const baseMatches = allMatches.filter(m => {
    if (filter === 'mine') {
      const inTeamA = m.teamA?.players?.some(p => p.name === currentUserName);
      const inTeamB = m.teamB?.players?.some(p => p.name === currentUserName);
      return inTeamA || inTeamB;
    }
    if (selectedTeamFilter !== 'all') {
      return m.teamA?.id === selectedTeamFilter || m.teamB?.id === selectedTeamFilter;
    }
    return true;
  });

  const uniqueTeams = [...(tourney?.teams || [])].sort((a, b) => a.name.localeCompare(b.name));
  
  // V2 : On filtre proprement sur le type 'pool' au lieu de chercher si m.group existe
  const finishedGroupMatches = baseMatches
    .filter(m => m.type === 'pool' && ['finished', 'canceled', 'forfeit'].includes(m.status))
    .sort(sortFunction);

  // V2 : Les matchs actifs sont les matchs de playoff OU les matchs de poule non terminés
  const activeMatches = baseMatches
    .filter(m => m.type === 'playoff' || !['finished', 'canceled', 'forfeit'].includes(m.status))
    .sort(sortFunction);

  return (
    <div className="py-4 w-full flex-1 flex flex-col box-border">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-muted-line pb-5 mb-8 gap-5 w-full">
        <div className="text-left">
          <h2 className="m-0 text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-start gap-3">
            <span className="text-3xl drop-shadow-lg">📅</span> 
            Planning Général
          </h2>
          <p className="mt-2 text-muted font-medium text-sm text-left">
            Consulte le calendrier des rencontres et suis l'évolution du tournoi.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          
          <select 
            value={selectedTeamFilter}
            onChange={(e) => {
              setSelectedTeamFilter(e.target.value);
              if (e.target.value !== 'all') setFilter('all');
            }}
            className="bg-app-input border border-muted-line text-white text-xs font-bold p-2.5 rounded-lg focus:outline-none focus:border-secondary transition-colors cursor-pointer shadow-inner w-full sm:w-auto"
          >
            <option value="all">Toutes les équipes</option>
            {uniqueTeams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {myMatches.length > 0 && (
            <div className="flex bg-app-input rounded-lg p-1 border border-muted-line shadow-inner shrink-0 w-full sm:w-auto">
              <button 
                onClick={() => { setFilter('all'); setSelectedTeamFilter('all'); }} 
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'all' && selectedTeamFilter === 'all' ? 'bg-muted-dark text-white shadow-md' : 'text-muted-dark hover:text-muted-light'}`}
              >
                Tous
              </button>
              <button 
                onClick={() => { setFilter('mine'); setSelectedTeamFilter('all'); }} 
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'mine' ? 'bg-primary/20 text-primary border border-primary/30 shadow-md' : 'text-muted-dark hover:text-muted-light'}`}
              >
                Mes matchs
              </button>
            </div>
          )}
        </div>
      </div> 
      
      {allMatches.length === 0 ? (
        <div className="bg-app-panel/60 backdrop-blur-md border border-muted-line rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden flex flex-col items-center mt-4">
          <span className="text-5xl mb-4 drop-shadow-2xl">📭</span>
          <h3 className="text-xl text-white font-black mb-2 tracking-wide">Le planning est vide</h3>
          <p className="text-muted text-sm font-medium m-0 max-w-sm leading-relaxed">
            Aucun match n'a encore été programmé pour ce tournoi. Reviens un peu plus tard !
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          
          {/* ACCORDÉON : MATCHS TERMINÉS PREMIUM */}
          {finishedGroupMatches.length > 0 && (
            <div className="bg-app-panel/80 backdrop-blur-md rounded-2xl border border-muted-line overflow-hidden shadow-lg transition-all">
              <button 
                onClick={() => setShowFinishedGroups(!showFinishedGroups)} 
                className="w-full bg-transparent border-none px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] w-6 h-6 flex items-center justify-center bg-app-input rounded-full text-muted group-hover:text-white transition-colors border border-muted-line">
                    {showFinishedGroups ? '▼' : '▶'}
                  </span>
                  <span className="text-xs font-black tracking-widest text-muted group-hover:text-muted-light transition-colors uppercase">
                    Matchs de poules terminés ({finishedGroupMatches.length})
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-dark group-hover:text-muted-light bg-black/30 px-2.5 py-1 rounded border border-muted-line transition-colors">
                  {showFinishedGroups ? 'Rétracter' : 'Afficher'}
                </span>
              </button>
              
              {showFinishedGroups && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 border-t border-muted-line bg-black/20">
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
              <div className="col-span-full py-12 px-6 border border-dashed border-muted-line rounded-2xl bg-white/5 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-4xl mb-3 opacity-80">🏁</span>
                <p className="text-muted-light font-medium text-sm m-0 leading-relaxed max-w-md">
                  Tous les matchs de poules sont terminés. <br/>
                  <span className="text-muted text-xs">Déroulez le tiroir ci-dessus pour les consulter, ou allez voir l'onglet Phase Finale !</span>
                </p>
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}