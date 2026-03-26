import React from 'react';

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
  return (
    <>
      <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>🤝 Le Mercato</h1>
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '30px' }}>
        
        {/* COLONNE GAUCHE : RECHERCHER UNE ÉQUIPE */}
        <div style={{ flex: '1', minWidth: '300px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--success)' }}>Chercher une équipe</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {availableTeams.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>Aucune équipe disponible.</p>
            ) : (
              availableTeams.map(team => (
                <div key={team.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '15px', borderRadius: '8px' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>{team.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{team.city}</span>
                  </div>
                  <button 
                    onClick={() => handleJoinTeam(team.id)} 
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
            <input 
              type="text" 
              placeholder="Nom ou Prénom..." 
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
            {searchResults.map(player => (
              <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '12px', borderRadius: '6px' }}>
                <strong style={{ color: 'white' }}>{player.full_name}</strong>
                <button onClick={() => viewPlayerProfile(player)} style={{ background: 'transparent', color: 'var(--accent-purple)', border: '1px solid var(--accent-purple)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  VOIR LE PROFIL
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}