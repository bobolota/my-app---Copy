import React, { useState } from 'react';

export default function ExplorerTournois({ session, allTournaments, myTeams, setRegisterModalTourney, setActiveTourneyId, setView }) {
  
  // Filtre pour la colonne "Terminés"
  const [filterFinished, setFilterFinished] = useState('all');

  // 1. On isole la logique de filtrage ici, pour alléger le Dashboard principal !
  const myCaptainTeams = myTeams
    .filter(mt => mt.global_teams.captain_id === session.user.id && mt.status === 'accepted')
    .map(mt => mt.global_teams);
  
  const myAcceptedTeamIds = myTeams
    .filter(mt => mt.status === 'accepted')
    .map(mt => mt.global_teams.id);
  
  const isRegisteredIn = (t) => t.teams && t.teams.some(team => myAcceptedTeamIds.includes(team.global_id));

  // 2. Répartition des tournois en 4 catégories
  const publicTourneys = allTournaments.filter(t => t.status === 'preparing' && !isRegisteredIn(t));
  const ongoingOtherTourneys = allTournaments.filter(t => t.status === 'ongoing' && !isRegisteredIn(t));
  const myActiveTourneys = allTournaments.filter(t => t.status !== 'finished' && isRegisteredIn(t));
  
  let finishedTourneys = allTournaments.filter(t => t.status === 'finished');
  if (filterFinished === 'mine') {
    finishedTourneys = finishedTourneys.filter(t => isRegisteredIn(t));
  }

  // 3. Fonction pour ouvrir un tournoi en mode Spectateur/Joueur
  const handleOpenTourney = (tId) => {
    setActiveTourneyId(tId);
    setView('tournament'); // Ouvre le TournamentManager en lecture seule
  };

  return (
    <>
      <h1 style={{ color: 'white', borderBottom: '2px solid #333', paddingBottom: '10px' }}>🌍 Explorer les tournois</h1>
      
      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', marginTop: '30px', paddingBottom: '20px', alignItems: 'stretch' }}>
        
        {/* COLONNE 1 : TOURNOIS PUBLICS (Inscription) */}
        <div style={{ flex: '1', minWidth: '300px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-purple)', fontSize: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🟢 Inscription ouverte
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {publicTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun tournoi disponible.</p>
            ) : (
              publicTourneys.map(t => (
                <div key={t.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                  <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '15px' }}>📅 {t.date || 'Date non définie'}</span>
                  
                  {myCaptainTeams.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontStyle: 'italic' }}>Fonde une équipe pour t'inscrire.</span>
                  ) : (
                    <button onClick={() => setRegisterModalTourney(t)} style={{ width: '100%', background: 'transparent', color: 'var(--accent-purple)', border: '1px solid var(--accent-purple)', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      S'INSCRIRE
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE 2 : TOURNOIS EN COURS (À SUIVRE) */}
        <div style={{ flex: '1', minWidth: '300px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-blue)', fontSize: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🔥 Suivre un tournoi
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {ongoingOtherTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun autre tournoi en cours.</p>
            ) : (
              ongoingOtherTourneys.map(t => (
                <div key={t.id} onClick={() => handleOpenTourney(t.id)} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                  <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '15px' }}>📅 {t.date || 'Date non définie'}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 'bold' }}>👀 Suivre les matchs & Stats</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE 3 : MES TOURNOIS */}
        <div style={{ flex: '1', minWidth: '300px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--success)', fontSize: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ✅ Inscrit
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {myActiveTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Tu n'es inscrit à aucun tournoi actif.</p>
            ) : (
              myActiveTourneys.map(t => (
                <div key={t.id} onClick={() => handleOpenTourney(t.id)} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--success)', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                  <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '15px' }}>📅 {t.date || 'Date non définie'}</span>
                  {t.status === 'ongoing' ? (
                     <span style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 'bold' }}>🔥 EN JEU (Suivre l'avancée)</span>
                  ) : (
                     <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold' }}>🗓️ Voir les engagés</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE 4 : TOURNOIS TERMINÉS */}
        <div style={{ flex: '1', minWidth: '300px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🏁 Terminés
          </h2>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <button 
              onClick={() => setFilterFinished('all')}
              style={{ background: filterFinished === 'all' ? '#555' : '#222', color: 'white', border: '1px solid #444', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Tous
            </button>
            <button 
              onClick={() => setFilterFinished('mine')}
              style={{ background: filterFinished === 'mine' ? 'var(--success)' : '#222', color: 'white', border: '1px solid #444', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Mes participations
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {finishedTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun historique.</p>
            ) : (
              finishedTourneys.map(t => {
                const iParticipated = isRegisteredIn(t);
                return (
                  <div key={t.id} onClick={() => handleOpenTourney(t.id)} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333', opacity: 0.9, cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                    <strong style={{ fontSize: '1.1rem', display: 'block', color: 'white', marginBottom: '5px' }}>{t.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '10px' }}>📅 {t.date || 'Date non définie'}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>📊 Voir les archives</span>
                      {iParticipated && <span style={{ fontSize: '0.65rem', background: 'var(--success)', color: 'white', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold' }}>J'y étais !</span>}
                    </div>
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