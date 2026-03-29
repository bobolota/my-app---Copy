import React from 'react';

export default function MonVestiaire({ 
    session, 
  myTeams, 
  hasTeam, 
  respondToInvite, 
  openTeamManager, 
  handleCreateTeam, 
  newTeamName, 
  setNewTeamName, 
  newTeamCity, 
  setNewTeamCity,
  cancelPendingRequest // <--- AJOUTE ÇA ICI
  
}) {

  return (
    <>
      <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>👟 Mon Vestiaire</h1>
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '30px' }}>
        
        {/* COLONNE GAUCHE : MES ÉQUIPES */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333', marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-blue)' }}>🛡️ Mes Équipes</h2>
            {myTeams.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic' }}>Tu n'es dans aucune équipe.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {myTeams.map(mt => {
                  const team = mt.global_teams;
                  const isCaptain = team.captain_id === session.user.id;
                  
                  // CAS 1 : INVITATION (On ne touche pas à cette carte, car elle a besoin des boutons d'action)
                  if (mt.status === 'invited') {
                    return (
                      <div key={team.id} style={{ background: '#222', padding: '15px', borderRadius: '8px', borderLeft: `4px solid var(--accent-purple)` }}>
                        <strong style={{ fontSize: '1.2rem', display: 'block' }}>{team.name}</strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-purple)' }}>✉️ Le capitaine t'invite !</span>
                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={() => respondToInvite(team.id, true)} 
                            disabled={hasTeam}
                            style={{ background: hasTeam ? '#444' : 'var(--success)', color: hasTeam ? '#888' : 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: hasTeam ? 'not-allowed' : 'pointer' }}
                          >
                            ACCEPTER
                          </button>
                          <button onClick={() => respondToInvite(team.id, false)} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>REFUSER</button>
                        </div>
                        {hasTeam && <span style={{ display: 'block', marginTop: '8px', fontSize: '0.75rem', color: 'var(--danger)' }}>Quitte d'abord ton équipe actuelle pour accepter.</span>}
                      </div>
                    );
                  }

                  // CAS 2 : ÉQUIPE ACTIVE OU EN ATTENTE (On rend la carte entière cliquable)
                  const isPending = mt.status === 'pending';
                  return (
                    <div 
                      key={team.id} 
                      // NOUVEAU : On ajoute l'événement de clic et la classe CSS sur la div entière
                      onClick={() => !isPending && openTeamManager(team)}
                      className={!isPending ? "team-card-interactive" : ""}
                      style={{ 
                        background: '#222', 
                        padding: '15px', 
                        borderRadius: '8px', 
                        borderLeft: `4px solid ${isPending ? 'var(--accent-orange)' : 'var(--success)'}`,
                        // On force la bordure transparente pour que l'effet de survol (qui change la bordure) ne décale pas la carte
                        borderTop: '1px solid transparent',
                        borderRight: '1px solid transparent',
                        borderBottom: '1px solid transparent',
                        cursor: isPending ? 'default' : 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '1.2rem', display: 'block' }}>{team.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#888' }}>{team.city || 'Ville non renseignée'}</span>
                        </div>
                        {isCaptain && <span style={{ background: 'var(--accent-purple)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>CAPITAINE 👑</span>}
                      </div>
                      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          {isPending ? <span style={{ color: 'var(--accent-orange)' }}>⏳ Candidature en attente...</span> : <span style={{ color: 'var(--success)' }}>✅ Membre actif</span>}
                        </div>
                        
                        {!isPending ? (
                          <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'bold' }}>
                            {isCaptain ? "GÉRER ⚙️" : "EFFECTIF 👁️"}
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); // Empêche le clic de déclencher l'ouverture de la carte
                              cancelPendingRequest(team.id); 
                            }} 
                            style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE : CRÉATION D'ÉQUIPE (inchangée) */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          {hasTeam ? (
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px dashed var(--danger)', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 10px 0', color: 'var(--danger)' }}>🚫 Limite de franchise atteinte.</h2>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>Tu es déjà engagé dans 3 équipes maximum. Quitte l'une d'entre elles pour pouvoir en fonder ou en rejoindre une nouvelle</p>
            </div>
          ) : (
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px dashed #444' }}>
              <h2 style={{ margin: '0 0 20px 0', color: 'white' }}>➕ Fonder une franchise</h2>
              <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                  type="text" 
                  placeholder="Nom de l'équipe (ex: Chicago Bulls)" 
                  value={newTeamName} 
                  onChange={e => setNewTeamName(e.target.value)} 
                  required 
                  style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} 
                />
                <input 
                  type="text" 
                  placeholder="Ville (Obligatoire)" 
                  value={newTeamCity} 
                  onChange={e => setNewTeamCity(e.target.value)} 
                  style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} 
                />
                <button type="submit" style={{ padding: '12px', borderRadius: '6px', background: 'var(--accent-orange)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  CRÉER MON ÉQUIPE
                </button>
              </form>
            </div>
          )}
        </div>
        
      </div>
    </>
  );
}