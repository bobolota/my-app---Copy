import React, { useState } from 'react';
import PlayerListItem from './PlayerListItem'; // 👈 On importe

export default function Mercato({
  availableTeams, hasTeam, handleJoinTeam, allPlayers, searchQuery, setSearchQuery, viewPlayerProfile
}) {
  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  const filteredTeams = availableTeams.filter(team => 
    team.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) || 
    (team.city && team.city.toLowerCase().includes(teamSearchQuery.toLowerCase()))
  );

  const filteredPlayers = (allPlayers || []).filter(player => {
    const searchLower = searchQuery.toLowerCase();
    const matchName = player.full_name && player.full_name.toLowerCase().includes(searchLower);
    const matchCity = player.city && player.city.toLowerCase().includes(searchLower);
    const matchPosition = player.position && player.position.toLowerCase().includes(searchLower);
    return matchName || matchCity || matchPosition;
  });

  const playersToDisplay = searchQuery.length >= 2 ? filteredPlayers : [];

  return (
    <>
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1920px] mx-auto"></div>
      <h1 className="text-white border-b-2 border-[#333] pb-2 text-2xl font-bold">🤝 Le Mercato</h1>
      
      <div className="flex flex-col lg:flex-row gap-8 mt-8">
        
        {/* COLONNE GAUCHE (Recherche Équipe - inchangée) */}
        <div className="flex-1 min-w-[300px] bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <h2 className="m-0 mb-5 text-[var(--success)] text-lg font-bold">Chercher une équipe</h2>
          <div className="flex gap-3 mb-5">
            <input 
              type="text" placeholder="Nom de l'équipe ou ville..." value={teamSearchQuery} onChange={e => setTeamSearchQuery(e.target.value)} 
              className="flex-1 p-3 rounded-md border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--success)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-4">
            {teamSearchQuery.length < 2 ? (
              <div className="text-center py-8 px-3 text-[#555] italic bg-white/5 rounded-lg border border-dashed border-[#333]"><span className="text-3xl block mb-2">🕵️‍♂️</span>Recherche le nom exact de l'équipe <br/>que tu souhaites rejoindre !</div>
            ) : filteredTeams.length === 0 ? (
              <p className="text-[var(--danger)] italic text-center">Aucune équipe ne correspond à "{teamSearchQuery}".</p>
            ) : (
              filteredTeams.map(team => (
                <div key={team.id} className="flex justify-between items-center bg-[#222] p-4 rounded-lg">
                  <div>
                    <strong className="block text-lg text-white">{team.name}</strong>
                    <span className="text-xs text-gray-400">{team.city}</span>
                  </div>
                  <button 
                    onClick={() => { handleJoinTeam(team.id); setTeamSearchQuery(""); }} disabled={hasTeam}
                    className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${hasTeam ? 'bg-[#333] border border-[#444] text-[#666] cursor-not-allowed' : 'bg-transparent border border-[var(--success)] text-[var(--success)] hover:bg-[var(--success)] hover:text-white cursor-pointer'}`}
                  >
                    {hasTeam ? 'CONTRAT ACTIF' : 'POSTULER'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE DROITE (Joueurs) 👇 ALLÉGÉE AVEC LE COMPOSANT 👇 */}
        <div className="flex-1 min-w-[300px] bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
          <h2 className="m-0 mb-5 text-[var(--accent-purple)] text-lg font-bold">🔎 Scouter un joueur</h2>
          <div className="flex gap-3 mb-5">
            <input 
              type="text" placeholder="Nom, Ville ou Poste..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
              className="flex-1 p-3 rounded-md border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-3">
            {searchQuery.length < 2 ? (
              <div className="text-center py-8 px-3 text-[#555] italic bg-white/5 rounded-lg border border-dashed border-[#333]"><span className="text-3xl block mb-2">🏀</span>Saisis au moins 2 lettres <br/>pour trouver ta future star !</div>
            ) : playersToDisplay.length === 0 ? (
              <p className="text-[var(--danger)] italic text-center">Aucun joueur trouvé pour "{searchQuery}".</p>
            ) : (
              playersToDisplay.map(player => (
                <PlayerListItem key={player.id} player={player} viewPlayerProfile={viewPlayerProfile} />
              ))
            )}
          </div>
        </div>

      </div>
    </>
  );
}