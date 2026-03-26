import React from 'react';

export default function ExplorerTournois({ session, allTournaments, myTeams, setRegisterModalTourney }) {
  
  // 1. On isole la logique de filtrage ici, pour alléger le Dashboard principal !
  const myCaptainTeams = myTeams
    .filter(mt => mt.global_teams.captain_id === session.user.id && mt.status === 'accepted')
    .map(mt => mt.global_teams);
  
  const myAcceptedTeamIds = myTeams
    .filter(mt => mt.status === 'accepted')
    .map(mt => mt.global_teams.id);
  
  const isRegisteredIn = (t) => t.teams && t.teams.some(team => myAcceptedTeamIds.includes(team.global_id));

  // 2. Répartition des tournois
  const publicTourneys = allTournaments.filter(t => t.status !== 'finished' && !isRegisteredIn(t));
  const registeredTourneys = allTournaments.filter(t => t.status !== 'finished' && isRegisteredIn(t));
  const finishedTourneys = allTournaments.filter(t => t.status === 'finished');

  return (
    <>
      <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>🌍 Explorer les tournois</h1>
      
      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', marginTop: '30px', paddingBottom: '20px' }}>
        
        {/* COLONNE 1 : TOURNOIS PUBLICS */}
        <div style={{ flex: '1', minWidth: '320px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-blue)', fontSize: '1.1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🌍 Tournois Publics
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {publicTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun tournoi disponible.</p>
            ) : (
              publicTourneys.map(t => (
                <div key={t.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                  <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '15px' }}>📅 {t.date || 'Date non définie'}</span>
                  
                  {t.status === 'preparing' ? (
                    myCaptainTeams.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontStyle: 'italic' }}>Fonde une équipe pour t'inscrire.</span>
                    ) : (
                      <button onClick={() => setRegisterModalTourney(t)} style={{ width: '100%', background: 'transparent', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        S'INSCRIRE
                      </button>
                    )
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 'bold' }}>🏀 Tournoi en cours</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE 2 : MES TOURNOIS */}
        <div style={{ flex: '1', minWidth: '320px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--success)', fontSize: '1.1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ✅ Mes Tournois
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {registeredTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Tu n'es inscrit à aucun tournoi actif.</p>
            ) : (
              registeredTourneys.map(t => (
                <div key={t.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--success)' }}>
                  <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '15px' }}>📅 {t.date || 'Date non définie'}</span>
                  {t.status === 'ongoing' ? (
                     <span style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 'bold' }}>🔥 EN JEU</span>
                  ) : (
                     <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold' }}>🗓️ En attente du tirage</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE 3 : TOURNOIS TERMINÉS */}
        <div style={{ flex: '1', minWidth: '320px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#888', fontSize: '1.1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🏁 Tournois Terminés
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {finishedTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun historique.</p>
            ) : (
              finishedTourneys.map(t => {
                const iParticipated = isRegisteredIn(t);
                return (
                  <div key={t.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333', opacity: 0.8 }}>
                    <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '10px' }}>📅 {t.date || 'Date non définie'}</span>
                    {iParticipated && <span style={{ fontSize: '0.75rem', background: '#333', color: 'white', padding: '3px 8px', borderRadius: '4px' }}>Tu as participé</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </>
  );
}