import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

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
    return <div className="flex-1 bg-transparent"></div>;
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
      return <p className="text-[#666] italic text-xs mb-4">Aucune équipe inscrite pour le moment.</p>;
    }
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {teams.map((team, idx) => (
          <span key={idx} className="bg-[var(--bg-lighter)] border border-[#333] text-white text-xs px-2.5 py-1 rounded-md font-bold shadow-sm">
            🛡️ {team.name}
          </span>
        ))}
      </div>
    );
  };

  
  return (
    <div className="w-full flex-1 flex flex-col box-border pt-4">
      
      <h1 className="text-white border-b-2 border-[#333] pb-2 text-2xl font-bold">
        🌍 Explorer les tournois
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
        
        {/* COLONNE 1 : TOURNOIS PUBLICS (Inscription) */}
        <div className="bg-[#111] rounded-xl p-5 border border-[#222] flex flex-col shadow-lg">
          <h2 className="m-0 mb-5 text-[var(--accent-purple)] text-base text-center uppercase tracking-wider font-bold">
            🟢 Inscription ouverte
          </h2>
          <div className="flex flex-col gap-4 flex-1">
            {publicTourneys.length === 0 ? (
              <p className="text-[#666] italic text-center text-sm">Aucun tournoi disponible.</p>
            ) : (
              publicTourneys.map(t => (
                <div key={t.id} className="bg-[var(--bg-card)] p-5 rounded-xl border border-[#333] shadow-md">
                  <strong className="text-lg block text-white mb-1 font-heading">{t.name}</strong>
                  <span className="text-sm text-[#888] block mb-4 font-bold">📅 {t.date || 'Date non définie'}</span>
                  
                  {renderTeamTags(t.teams)}
                  
                  {myCaptainTeams.length === 0 ? (
                    <span className="text-sm text-[var(--danger)] italic font-bold block mt-2">Fonde une équipe pour t'inscrire.</span>
                  ) : (
                    <button 
                      onClick={() => setRegisterModalTourney(t)} 
                      className="w-full bg-transparent text-[var(--accent-purple)] border-2 border-[var(--accent-purple)] p-2.5 rounded-lg cursor-pointer font-bold transition-colors hover:bg-[var(--accent-purple)] hover:text-white mt-2"
                    >
                      S'INSCRIRE
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE 2 : TOURNOIS EN COURS (À SUIVRE) */}
        <div className="bg-[#111] rounded-xl p-5 border border-[#222] flex flex-col shadow-lg">
          <h2 className="m-0 mb-5 text-[var(--accent-blue)] text-base text-center uppercase tracking-wider font-bold">
            🔥 Suivre un tournoi
          </h2>
          <div className="flex flex-col gap-4 flex-1">
            {ongoingOtherTourneys.length === 0 ? (
              <p className="text-[#666] italic text-center text-sm">Aucun autre tournoi en cours.</p>
            ) : (
              ongoingOtherTourneys.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => handleOpenTourney(t.id)} 
                  className="bg-[var(--bg-card)] p-5 rounded-xl border border-[#333] cursor-pointer shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] hover:border-[var(--accent-blue)]"
                >
                  <strong className="text-lg block text-white mb-1 font-heading">{t.name}</strong>
                  <span className="text-sm text-[#888] block mb-4 font-bold">📅 {t.date || 'Date non définie'}</span>
                  
                  {renderTeamTags(t.teams)}

                  <span className="text-sm text-[var(--accent-blue)] font-bold block text-center bg-[rgba(0,212,255,0.1)] p-2 rounded-lg mt-2">
                    👀 Suivre les matchs & Stats
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE 3 : MES TOURNOIS */}
        <div className="bg-[#111] rounded-xl p-5 border border-[#222] flex flex-col shadow-lg">
          <h2 className="m-0 mb-5 text-[var(--success)] text-base text-center uppercase tracking-wider font-bold">
            ✅ Inscrit
          </h2>
          <div className="flex flex-col gap-4 flex-1">
            {myActiveTourneys.length === 0 ? (
              <p className="text-[#666] italic text-center text-sm">Tu n'es inscrit à aucun tournoi actif.</p>
            ) : (
              myActiveTourneys.map(t => {
                const myRegisteredTeam = t.teams && t.teams.find(team => myAcceptedTeamIds.includes(team.global_id));
                const isCaptainOfThisTeam = myRegisteredTeam && myCaptainTeams.some(capTeam => capTeam.id === myRegisteredTeam.global_id);

                return (
                  <div 
                    key={t.id} 
                    onClick={() => handleOpenTourney(t.id)} 
                    className="bg-[var(--bg-card)] p-5 rounded-xl border border-[#333] border-l-4 border-l-[var(--success)] cursor-pointer shadow-md transition-transform duration-200 hover:-translate-y-1"
                  >
                    <strong className="text-lg block text-white mb-1 font-heading">{t.name}</strong>
                    <span className="text-sm text-[#888] block mb-4 font-bold">📅 {t.date || 'Date non définie'}</span>
                    
                    {renderTeamTags(t.teams)}

                    <div className={`text-center p-2 rounded-lg mt-2 ${t.status === 'ongoing' ? 'bg-[rgba(255,107,0,0.1)]' : 'bg-[rgba(52,199,89,0.1)]'}`}>
                      {t.status === 'ongoing' ? (
                          <span className="text-sm text-[var(--accent-orange)] font-bold">🔥 EN JEU (Suivre l'avancée)</span>
                      ) : (
                          <span className="text-sm text-[var(--success)] font-bold">🗓️ Voir les engagés</span>
                      )}
                    </div>

                    {/* LE BOUTON DÉSINSCRIPTION */}
                    {t.status === 'preparing' && isCaptainOfThisTeam && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleLeaveTournament(t, myRegisteredTeam.global_id);
                        }}
                        className="w-full mt-3 bg-transparent text-[var(--danger)] border border-[var(--danger)] p-2 rounded-lg cursor-pointer font-bold text-sm transition-colors hover:bg-[var(--danger)] hover:text-white"
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
        <div className="bg-[#111] rounded-xl p-5 border border-[#222] flex flex-col shadow-lg">
          <h2 className="m-0 mb-3 text-[#888] text-base text-center uppercase tracking-wider font-bold">
            🏁 Terminés
          </h2>

          <div className="flex justify-center gap-2 mb-5">
            <button 
              onClick={() => setFilterFinished('all')}
              className={`px-3 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${filterFinished === 'all' ? 'bg-[#555] text-white border border-[#777] font-bold' : 'bg-[#222] text-white border border-[#444] font-normal hover:bg-[#333]'}`}
            >
              Tous
            </button>
            <button 
              onClick={() => setFilterFinished('mine')}
              className={`px-3 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${filterFinished === 'mine' ? 'bg-[var(--success)] text-white border border-[var(--success)] font-bold' : 'bg-[#222] text-white border border-[#444] font-normal hover:bg-[#333]'}`}
            >
              Mes participations
            </button>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {finishedTourneys.length === 0 ? (
              <p className="text-[#666] italic text-center text-sm">Aucun historique.</p>
            ) : (
              finishedTourneys.map(t => {
                const iParticipated = isRegisteredIn(t);
                return (
                  <div 
                    key={t.id} 
                    onClick={() => handleOpenTourney(t.id)} 
                    className="bg-[var(--bg-card)] p-5 rounded-xl border border-[#333] opacity-80 cursor-pointer shadow-md transition-all duration-200 hover:opacity-100 hover:-translate-y-1 hover:border-[#555]"
                  >
                    <strong className="text-lg block text-white mb-1 font-heading">{t.name}</strong>
                    <span className="text-sm text-[#888] block mb-4 font-bold">📅 {t.date || 'Date non définie'}</span>
                    
                    <div className="flex flex-wrap gap-2 mb-4 opacity-70">
                      {(t.teams || []).map((team, idx) => (
                        <span key={idx} className="bg-[#333] border border-[#555] text-[#ccc] text-xs px-2.5 py-1 rounded-md font-bold">
                          🛡️ {team.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg mt-2">
                      <span className="text-sm text-[#aaa] font-bold">📊 Voir les archives</span>
                      {iParticipated && <span className="text-[10px] bg-[var(--success)] text-white px-2 py-1 rounded font-bold uppercase tracking-wider">J'y étais !</span>}
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