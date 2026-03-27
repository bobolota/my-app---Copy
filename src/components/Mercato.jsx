import React, { useState } from 'react';

export default function Mercato({
  availableTeams,
  hasTeam,
  handleJoinTeam,
  allPlayers, // NOUVEAU : On reçoit la liste de tous les joueurs
  searchQuery,
  setSearchQuery,
  viewPlayerProfile
}) {
  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  // Filtre local pour les équipes (comme tu l'avais fait)
  const filteredTeams = availableTeams.filter(team => 
    team.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) || 
    (team.city && team.city.toLowerCase().includes(teamSearchQuery.toLowerCase()))
  );

  // NOUVEAU : Filtre local pour les joueurs (insensible à la casse)
  const filteredPlayers = (allPlayers || []).filter(player => 
    player.full_name && player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pour éviter de charger 5000 cartes au démarrage, on limite l'affichage
  // On affiche tout si on a tapé quelque chose, sinon on n'affiche que les 20 premiers (ou un message)
  const playersToDisplay = searchQuery.length >= 2 ? filteredPlayers : [];

  return (
    <>
      <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>🤝 Le Mercato</h1>
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '30px' }}>
        
        {/* COLONNE GAUCHE : RECHERCHER UNE ÉQUIPE */}
        <div style={{ flex: '1', minWidth: '300px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--success)' }}>Chercher une équipe</h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="text" 
              placeholder="Nom de l'équipe ou ville..." 
              value={teamSearchQuery} 
              onChange={e => setTeamSearchQuery(e.target.value)} 
              style={{ flex: '1', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {teamSearchQuery.length < 2 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#555', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed #333' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🕵️‍♂️</span>
                Recherche le nom exact de l'équipe <br/>que tu souhaites rejoindre !
              </div>
            ) : filteredTeams.length === 0 ? (
              <p style={{ color: 'var(--danger)', fontStyle: 'italic', textAlign: 'center' }}>Aucune équipe ne correspond à "{teamSearchQuery}".</p>
            ) : (
              filteredTeams.map(team => (
                <div key={team.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '15px', borderRadius: '8px' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>{team.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{team.city}</span>
                  </div>
                  <button 
                    onClick={() => {
                        handleJoinTeam(team.id);
                        setTeamSearchQuery(""); 
                    }} 
                    disabled={hasTeam}
                    style={{ 
                      background: hasTeam ? '#333' : 'transparent', 
                      border: `1px solid ${hasTeam ? '#444' : 'var(--success)'}`, 
                      color: hasTeam ? '#666' : 'var(--success)', 
                      padding: '6px 12px', borderRadius: '4px', cursor: hasTeam ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: '0.2s' 
                    }}
                  >
                    {hasTeam ? 'CONTRAT ACTIF' : 'POSTULER'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE DROITE : SCOUTER UN JOUEUR */}
        <div style={{ flex: '1', minWidth: '300px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-purple)' }}>🔎 Scouter un joueur</h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {/* Le bouton "CHERCHER" n'existe plus, c'est de l'instantané ! */}
            <input 
              type="text" 
              placeholder="Nom ou Prénom précis..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              style={{ flex: '1', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {searchQuery.length < 2 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#555', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed #333' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🏀</span>
                Saisis au moins 2 lettres <br/>pour trouver ta future star !
              </div>
            ) : playersToDisplay.length === 0 ? (
              <p style={{ color: 'var(--danger)', fontStyle: 'italic', textAlign: 'center' }}>Aucun joueur trouvé pour "{searchQuery}".</p>
            ) : (
              playersToDisplay.map(player => (
                <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '12px', borderRadius: '6px' }}>
                  <strong style={{ color: 'white' }}>{player.full_name}</strong>
                  <button onClick={() => viewPlayerProfile(player)} style={{ background: 'transparent', color: 'var(--accent-purple)', border: '1px solid var(--accent-purple)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    VOIR LE PROFIL
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </>
  );
}