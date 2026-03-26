import React, { useState } from 'react';

export default function Mercato({
  availableTeams,
  hasTeam,
  handleJoinTeam,
  searchQuery,
  setSearchQuery,
  handleSearchPlayer,
  searchResults,
  viewPlayerProfile
}) {
  // NOUVEL ÉTAT : Barre de recherche pour les équipes
  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  // NOUVELLE LOGIQUE : On filtre les équipes en fonction de ce qui est tapé (insensible à la casse)
  const filteredTeams = availableTeams.filter(team => 
    team.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) || 
    (team.city && team.city.toLowerCase().includes(teamSearchQuery.toLowerCase()))
  );

  return (
    <>
      <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>🤝 Le Mercato</h1>
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '30px' }}>
        
        {/* COLONNE GAUCHE : RECHERCHER UNE ÉQUIPE (Déjà fait au tour précédent) */}
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
            {/* L'affichage n'apparaît que si l'utilisateur a tapé au moins 2 lettres ! */}
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
                        setTeamSearchQuery(""); // On vide la recherche après avoir postulé !
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

        {/* COLONNE DROITE : SCOUTER UN JOUEUR (Modifié pour le placeholder) */}
        <div style={{ flex: '1', minWidth: '300px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-purple)' }}>🔎 Scouter un joueur</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="text" 
              placeholder="Nom ou Prénom précis..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSearchPlayer()} 
              style={{ flex: '1', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} 
            />
            <button onClick={handleSearchPlayer} style={{ background: 'var(--accent-purple)', color: 'white', border: 'none', padding: '0 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              CHERCHER
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* L'affichage n'apparaît que si une recherche a été effectuée ! */}
            {!searchResults || searchResults.length === 0 && !searchQuery ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#555', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed #333' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🏀</span>
                Saisis le nom exact du joueur <br/>pour lui faire une offre !
              </div>
            ) : searchResults.length === 0 ? (
              <p style={{ color: 'var(--danger)', fontStyle: 'italic', textAlign: 'center' }}>Aucun joueur trouvé pour "{searchQuery}".</p>
            ) : (
              searchResults.map(player => (
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