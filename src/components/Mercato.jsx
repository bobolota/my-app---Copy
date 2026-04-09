import React, { useState } from 'react';
import PlayerListItem from './PlayerListItem'; 

export default function Mercato({
  availableTeams, 
  hasMax5x5, 
  hasMax3x3, 
  handleJoinTeam, 
  allPlayers, 
  searchQuery, 
  setSearchQuery, 
  viewPlayerProfile
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

  // Le générateur d'écusson mis à jour avec le style Premium (Utilisation de primary)
  const TeamBadge = ({ name, colorClass = "from-primary to-primary-light" }) => (
    <div className={`w-12 h-12 shrink-0 rounded-full bg-gradient-to-tr ${colorClass} flex items-center justify-center text-xl font-black text-white shadow-md border border-muted-line`}>
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );

  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1400px] mx-auto relative">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-muted-line pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">🤝</span> 
          Le Mercato
        </h1>
        <p className="mt-2 text-muted font-medium text-sm text-left">
          Cherche une équipe à rejoindre ou scoute les meilleurs joueurs disponibles sur le réseau.
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        
        {/* ========================================== */}
        {/* COLONNE GAUCHE : CHERCHER UNE ÉQUIPE (PRIMARY) */}
        {/* ========================================== */}
        <section className="flex-1 w-full bg-app-panel/80 backdrop-blur-md rounded-2xl p-6 border border-muted-line flex flex-col shadow-2xl relative overflow-hidden group">
          {/* Ligne LED décorative primary */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-light shadow-[0_0_15px_rgba(16,185,129,0.4)] opacity-80"></div>
          
          <h2 className="m-0 mb-6 text-primary-light text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black relative z-10">
            <span className="text-lg">🛡️</span> Chercher une franchise
          </h2>
          
          <div className="relative z-10 mb-6">
            <input 
              type="text" 
              placeholder="Nom de l'équipe ou ville..." 
              value={teamSearchQuery} 
              onChange={e => setTeamSearchQuery(e.target.value)} 
              className="w-full p-4 rounded-xl bg-app-input border border-muted-line text-white placeholder:text-muted-dark focus:outline-none focus:border-primary focus:bg-app-bg transition-all shadow-inner text-sm font-medium"
            />
          </div>

          <div className="flex flex-col gap-4 relative z-10 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {teamSearchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-50 text-center">
                <span className="text-4xl mb-3 drop-shadow-md">🕵️‍♂️</span>
                <p className="text-muted font-bold text-xs uppercase tracking-wider m-0 leading-relaxed">
                  Saisis au moins 2 lettres pour trouver <br/>l'équipe que tu souhaites rejoindre
                </p>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="bg-danger/10 border border-danger/20 p-4 rounded-xl text-center">
                <p className="text-danger font-bold text-sm m-0">Aucune équipe ne correspond à "{teamSearchQuery}".</p>
              </div>
            ) : (
              filteredTeams.map(team => {
                const isFormatFull = team.format === '3x3' ? hasMax3x3 : hasMax5x5;

                return (
                  <div key={team.id} className="bg-app-card border border-muted-line p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary/30 transition-all hover:-translate-y-0.5 shadow-lg group/item">
                    <div className="flex items-center gap-4">
                      <TeamBadge name={team.name} />
                      <div className="flex flex-col">
                        <strong className="flex items-center gap-2 text-lg text-white font-black tracking-wide group-hover/item:text-primary-light transition-colors">
                          {team.name}
                          <span className="bg-app-input text-white font-black text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-muted-line">
                            {team.format || '5x5'}
                          </span>
                        </strong>
                        <span className="text-[10px] text-muted-dark font-bold tracking-widest uppercase bg-black/30 px-2 py-0.5 rounded w-fit mt-1 border border-muted-line">
                          📍 {team.city || 'Ville inconnue'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { handleJoinTeam(team.id); setTeamSearchQuery(""); }} 
                      disabled={isFormatFull}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${
                        isFormatFull 
                          ? 'bg-app-input border border-muted-line text-muted-dark cursor-not-allowed shadow-none' 
                          : 'bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)] cursor-pointer hover:-translate-y-0.5'
                      }`}
                    >
                      {isFormatFull ? `LIMITE ${team.format || '5x5'} ATTEINTE` : 'POSTULER 🚀'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ========================================== */}
        {/* COLONNE DROITE : SCOUTER UN JOUEUR (ACTION) */}
        {/* ========================================== */}
        <section className="flex-1 w-full bg-app-panel/80 backdrop-blur-md rounded-2xl p-6 border border-muted-line flex flex-col shadow-2xl relative overflow-hidden group">
          {/* Ligne LED décorative action (bleu) */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-action to-action-light shadow-[0_0_15px_rgba(59,130,246,0.4)] opacity-80"></div>

          <h2 className="m-0 mb-6 text-action-light text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black relative z-10">
            <span className="text-lg">🔎</span> Scouter un joueur
          </h2>
          
          <div className="relative z-10 mb-6">
            <input 
              type="text" 
              placeholder="Nom, Ville ou Poste..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full p-4 rounded-xl bg-app-input border border-muted-line text-white placeholder:text-muted-dark focus:outline-none focus:border-action focus:bg-app-bg transition-all shadow-inner text-sm font-medium"
            />
          </div>

          <div className="flex flex-col gap-4 relative z-10 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-50 text-center">
                <span className="text-4xl mb-3 drop-shadow-md">🏀</span>
                <p className="text-muted font-bold text-xs uppercase tracking-wider m-0 leading-relaxed">
                  Saisis au moins 2 lettres <br/>pour trouver ta future star
                </p>
              </div>
            ) : playersToDisplay.length === 0 ? (
              <div className="bg-danger/10 border border-danger/20 p-4 rounded-xl text-center">
                <p className="text-danger font-bold text-sm m-0">Aucun joueur trouvé pour "{searchQuery}".</p>
              </div>
            ) : (
              playersToDisplay.map(player => (
                <PlayerListItem key={player.id} player={player} viewPlayerProfile={viewPlayerProfile} />
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}