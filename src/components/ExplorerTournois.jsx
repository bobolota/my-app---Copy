import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// 👇 1. ON AJOUTE handleLeaveTournament ICI
export default function ExplorerTournois({ allTournaments, myTeams, setRegisterModalTourney, setActiveTourneyId, setView, handleLeaveTournament }) {
  const [filterFinished, setFilterFinished] = useState('all');
  const { session } = useAuth();
  
  // --- DÉBUT DE L'ANTI-FLASH (PARE-CHOCS TEMPOREL) ---
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (allTournaments && allTournaments.length > 0) {
      setIsReady(true);
    } else {
      const timer = setTimeout(() => setIsReady(true), 400);
      return () => clearTimeout(timer);
    }
  }, [allTournaments]);

  if (!isReady) {
    return <div style={{ flex: 1, backgroundColor: 'transparent' }}></div>;
  }
  // --- FIN DE L'ANTI-FLASH ---
  
  const myCaptainTeams = myTeams
    .filter(mt => mt.global_teams.captain_id === session.user.id && mt.status === 'accepted')
    .map(mt => mt.global_teams);
  
  const myAcceptedTeamIds = myTeams
    .filter(mt => mt.status === 'accepted')
    .map(mt => mt.global_teams.id);
  
  const isRegisteredIn = (t) => t.teams && t.teams.some(team => myAcceptedTeamIds.includes(team.global_id));

  const activeTournaments = allTournaments.filter(t => t.status !== 'delete');

  const publicTourneys = activeTournaments.filter(t => t.status === 'preparing' && !isRegisteredIn(t));
  const ongoingOtherTourneys = activeTournaments.filter(t => t.status === 'ongoing' && !isRegisteredIn(t));
  const myActiveTourneys = activeTournaments.filter(t => t.status !== 'finished' && isRegisteredIn(t));
  
  let finishedTourneys = activeTournaments.filter(t => t.status === 'finished');
  if (filterFinished === 'mine') {
    finishedTourneys = finishedTourneys.filter(t => isRegisteredIn(t));
  }

  const handleOpenTourney = (tId) => {
    setActiveTourneyId(tId);
    setView('tournament'); 
  };

  const renderTeamTags = (teams) => {
    if (!teams || teams.length === 0) {
      return <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.8rem', margin: '0 0 15px 0' }}>Aucune équipe inscrite pour le moment.</p>;
    }
    return (
      <div className="teams-tags-container" style={{ marginBottom: '15px' }}>
        {teams.map((team, idx) => (
          <span key={idx} className="team-tag">
            🛡️ {team.name}
          </span>
        ))}
      </div>
    );
  };

  
  return (
    <div className="dashboard-container" style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      
      <h1 className="text-red-500 font-bold text-4xl">
        🌍 Explorer les tournois
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
        
        {/* COLONNE 1 : TOURNOIS PUBLICS (Inscription) */}
        <div style={{ background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-purple)', fontSize: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🟢 Inscription ouverte
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
            {publicTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun tournoi disponible.</p>
            ) : (
              publicTourneys.map(t => (
                <div key={t.id} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid #333', boxShadow: 'var(--shadow-sm)' }}>
                  <strong style={{ fontSize: '1.2rem', display: 'block', color: 'white', marginBottom: '5px', fontFamily: 'var(--font-heading)' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '15px', fontWeight: 'bold' }}>📅 {t.date || 'Date non définie'}</span>
                  
                  {renderTeamTags(t.teams)}
                  
                  {myCaptainTeams.length === 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontStyle: 'italic', fontWeight: 'bold' }}>Fonde une équipe pour t'inscrire.</span>
                  ) : (
                    <button onClick={() => setRegisterModalTourney(t)} style={{ width: '100%', background: 'transparent', color: 'var(--accent-purple)', border: '2px solid var(--accent-purple)', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} onMouseOver={e => {e.target.style.background='var(--accent-purple)'; e.target.style.color='white'}} onMouseOut={e => {e.target.style.background='transparent'; e.target.style.color='var(--accent-purple)'}}>
                      S'INSCRIRE
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE 2 : TOURNOIS EN COURS (À SUIVRE) */}
        <div style={{ background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-blue)', fontSize: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🔥 Suivre un tournoi
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
            {ongoingOtherTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun autre tournoi en cours.</p>
            ) : (
              ongoingOtherTourneys.map(t => (
                <div key={t.id} onClick={() => handleOpenTourney(t.id)} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid #333', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseOver={e => {e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='var(--shadow-glow-blue)'}} onMouseOut={e => {e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'}}>
                  <strong style={{ fontSize: '1.2rem', display: 'block', color: 'white', marginBottom: '5px', fontFamily: 'var(--font-heading)' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '15px', fontWeight: 'bold' }}>📅 {t.date || 'Date non définie'}</span>
                  
                  {renderTeamTags(t.teams)}

                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'block', textAlign: 'center', background: 'rgba(0, 212, 255, 0.1)', padding: '8px', borderRadius: '6px' }}>👀 Suivre les matchs & Stats</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE 3 : MES TOURNOIS */}
        <div style={{ background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--success)', fontSize: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ✅ Inscrit
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
            {myActiveTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Tu n'es inscrit à aucun tournoi actif.</p>
            ) : (
              myActiveTourneys.map(t => {
                // 👇 2. LOGIQUE POUR SAVOIR SI ON EST CAPITAINE DE L'ÉQUIPE INSCRITE
                const myRegisteredTeam = t.teams && t.teams.find(team => myAcceptedTeamIds.includes(team.global_id));
                const isCaptainOfThisTeam = myRegisteredTeam && myCaptainTeams.some(capTeam => capTeam.id === myRegisteredTeam.global_id);

                return (
                  <div key={t.id} onClick={() => handleOpenTourney(t.id)} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--success)', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform='translateY(-4px)'} onMouseOut={e => e.currentTarget.style.transform='none'}>
                    <strong style={{ fontSize: '1.2rem', display: 'block', color: 'white', marginBottom: '5px', fontFamily: 'var(--font-heading)' }}>{t.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '15px', fontWeight: 'bold' }}>📅 {t.date || 'Date non définie'}</span>
                    
                    {renderTeamTags(t.teams)}

                    <div style={{ textAlign: 'center', background: t.status === 'ongoing' ? 'rgba(255, 107, 0, 0.1)' : 'rgba(52, 199, 89, 0.1)', padding: '8px', borderRadius: '6px' }}>
                      {t.status === 'ongoing' ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 'bold' }}>🔥 EN JEU (Suivre l'avancée)</span>
                      ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold' }}>🗓️ Voir les engagés</span>
                      )}
                    </div>

                    {/* 👇 3. LE BOUTON DÉSINSCRIPTION 👇 */}
                    {t.status === 'preparing' && isCaptainOfThisTeam && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Évite que le clic n'ouvre le tournoi en arrière-plan
                          handleLeaveTournament(t, myRegisteredTeam.global_id);
                        }}
                        style={{ 
                          width: '100%', 
                          marginTop: '10px', 
                          background: 'transparent', 
                          color: 'var(--danger)', 
                          border: '1px solid var(--danger)', 
                          padding: '8px', 
                          borderRadius: '6px', 
                          cursor: 'pointer', 
                          fontWeight: 'bold', 
                          fontSize: '0.85rem',
                          transition: '0.2s'
                        }}
                        onMouseOver={e => {e.target.style.background='var(--danger)'; e.target.style.color='white'}} 
                        onMouseOut={e => {e.target.style.background='transparent'; e.target.style.color='var(--danger)'}}
                      >
                        DÉSINCRIRE L'ÉQUIPE 🚪
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLONNE 4 : TOURNOIS TERMINÉS */}
        <div style={{ background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🏁 Terminés
          </h2>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <button 
              onClick={() => setFilterFinished('all')}
              style={{ background: filterFinished === 'all' ? '#555' : '#222', color: 'white', border: filterFinished === 'all' ? '1px solid #777' : '1px solid #444', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: filterFinished === 'all' ? 'bold' : 'normal' }}
            >
              Tous
            </button>
            <button 
              onClick={() => setFilterFinished('mine')}
              style={{ background: filterFinished === 'mine' ? 'var(--success)' : '#222', color: 'white', border: filterFinished === 'mine' ? '1px solid var(--success)' : '1px solid #444', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: filterFinished === 'mine' ? 'bold' : 'normal' }}
            >
              Mes participations
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
            {finishedTourneys.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Aucun historique.</p>
            ) : (
              finishedTourneys.map(t => {
                const iParticipated = isRegisteredIn(t);
                return (
                  <div key={t.id} onClick={() => handleOpenTourney(t.id)} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid #333', opacity: 0.8, cursor: 'pointer', transition: 'opacity 0.2s, transform 0.2s' }} onMouseOver={e => {e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateY(-2px)'}} onMouseOut={e => {e.currentTarget.style.opacity='0.8'; e.currentTarget.style.transform='none'}}>
                    <strong style={{ fontSize: '1.2rem', display: 'block', color: 'white', marginBottom: '5px', fontFamily: 'var(--font-heading)' }}>{t.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '15px', fontWeight: 'bold' }}>📅 {t.date || 'Date non définie'}</span>
                    
                    <div className="teams-tags-container" style={{ marginBottom: '15px', opacity: 0.7 }}>
                      {(t.teams || []).map((team, idx) => (
                        <span key={idx} className="team-tag" style={{ background: '#333', color: '#ccc', borderColor: '#555' }}>
                          🛡️ {team.name}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>📊 Voir les archives</span>
                      {iParticipated && <span style={{ fontSize: '0.7rem', background: 'var(--success)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>J'y étais !</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}