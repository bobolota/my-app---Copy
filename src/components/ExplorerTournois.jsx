import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TeamTagList from './TeamTagList'; // 👈 L'import magique

export default function ExplorerTournois({ allTournaments, myTeams, setRegisterModalTourney, setActiveTourneyId, setView, handleLeaveTournament }) {
  const [filterFinished, setFilterFinished] = useState('all');
  const { session } = useAuth();
  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (allTournaments && allTournaments.length > 0) setIsReady(true);
    else {
      const timer = setTimeout(() => setIsReady(true), 400);
      return () => clearTimeout(timer);
    }
  }, [allTournaments]);

  if (!isReady) return <div className="flex-1 bg-transparent"></div>;
  
  const myCaptainTeams = myTeams.filter(mt => mt.global_teams.captain_id === session.user.id && mt.status === 'accepted').map(mt => mt.global_teams);
  const myAcceptedTeamIds = myTeams.filter(mt => mt.status === 'accepted').map(mt => mt.global_teams.id);
  const isRegisteredIn = (t) => t.teams && t.teams.some(team => myAcceptedTeamIds.includes(team.global_id));

  const activeTournaments = allTournaments.filter(t => t.status !== 'delete');
  const publicTourneys = activeTournaments.filter(t => t.status === 'preparing' && !isRegisteredIn(t));
  const ongoingOtherTourneys = activeTournaments.filter(t => t.status === 'ongoing' && !isRegisteredIn(t));
  const myActiveTourneys = activeTournaments.filter(t => t.status !== 'finished' && isRegisteredIn(t));
  
  let finishedTourneys = activeTournaments.filter(t => t.status === 'finished');
  if (filterFinished === 'mine') finishedTourneys = finishedTourneys.filter(t => isRegisteredIn(t));

  const handleOpenTourney = (tId) => { setActiveTourneyId(tId); setView('tournament'); };

  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1920px] mx-auto relative">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-white/10 pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">🌍</span> 
          Explorer les tournois
        </h1>
        <p className="mt-2 text-[#888] font-medium text-sm text-left">
          Découvre les compétitions, inscris ton équipe ou suis les résultats en direct.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* =========================================
            COLONNE 1 : INSCRIPTION OUVERTE (VIOLET)
            ========================================= */}
        <div className="bg-[#15151e]/80 backdrop-blur-md rounded-2xl p-5 border border-white/5 flex flex-col shadow-2xl relative overflow-hidden group/col">
          {/* Ligne LED décorative */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.6)]"></div>
          
          <h2 className="m-0 mb-6 text-purple-400 text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,1)]"></span>
            Inscription ouverte
          </h2>
          
          <div className="flex flex-col gap-4 flex-1">
            {publicTourneys.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                <span className="text-4xl mb-2">🏜️</span>
                <p className="text-[#666] italic text-center text-sm m-0">Aucun tournoi disponible.</p>
              </div>
            ) : (
              publicTourneys.map(t => (
                <div key={t.id} className="bg-[#1e1e2a] p-5 rounded-xl border border-white/5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-[0_8px_25px_rgba(168,85,247,0.15)] group">
                  <strong className="text-xl block text-white mb-1 font-black tracking-wide group-hover:text-purple-300 transition-colors">{t.name}</strong>
                  <span className="text-xs text-[#888] flex items-center gap-1.5 mb-4 font-bold bg-black/30 w-fit px-2.5 py-1 rounded-md">
                    📅 {t.date || 'Date non définie'}
                  </span>
                  
                  <TeamTagList teams={t.teams} />
                  
                  {myCaptainTeams.length === 0 && parseInt(t.matchsettings?.courtSize || 5) !== 1 ? (
                    <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                      <span className="text-xs text-red-400 font-bold">⚠️ Fonde une équipe pour t'inscrire.</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setRegisterModalTourney(t)} 
                      className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-xl font-black tracking-widest text-sm shadow-[0_4px_15px_rgba(168,85,247,0.3)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.5)] transition-all hover:-translate-y-0.5"
                    >
                      S'INSCRIRE 🚀
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* =========================================
            COLONNE 2 : TOURNOIS EN COURS (BLEU)
            ========================================= */}
        <div className="bg-[#15151e]/80 backdrop-blur-md rounded-2xl p-5 border border-white/5 flex flex-col shadow-2xl relative overflow-hidden group/col">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
          
          <h2 className="m-0 mb-6 text-blue-400 text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black">
            🔥 Suivre un tournoi
          </h2>
          
          <div className="flex flex-col gap-4 flex-1">
            {ongoingOtherTourneys.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                <span className="text-4xl mb-2">📭</span>
                <p className="text-[#666] italic text-center text-sm m-0">Aucun autre tournoi en cours.</p>
              </div>
            ) : (
              ongoingOtherTourneys.map(t => (
                <div key={t.id} onClick={() => handleOpenTourney(t.id)} className="bg-[#1e1e2a] p-5 rounded-xl border border-white/5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_8px_25px_rgba(59,130,246,0.15)] group cursor-pointer">
                  <strong className="text-xl block text-white mb-1 font-black tracking-wide group-hover:text-blue-300 transition-colors">{t.name}</strong>
                  <span className="text-xs text-[#888] flex items-center gap-1.5 mb-4 font-bold bg-black/30 w-fit px-2.5 py-1 rounded-md">
                    📅 {t.date || 'Date non définie'}
                  </span>
                  
                  <TeamTagList teams={t.teams} />

                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <span>👀</span> Suivre les matchs & Stats
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* =========================================
            COLONNE 3 : MES TOURNOIS (VERT)
            ========================================= */}
        <div className="bg-[#15151e]/80 backdrop-blur-md rounded-2xl p-5 border border-white/5 flex flex-col shadow-2xl relative overflow-hidden group/col">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>
          
          <h2 className="m-0 mb-6 text-emerald-400 text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black">
            ✅ Mes Engagements
          </h2>
          
          <div className="flex flex-col gap-4 flex-1">
            {myActiveTourneys.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                <span className="text-4xl mb-2">🛌</span>
                <p className="text-[#666] italic text-center text-sm m-0">Aucune participation active.</p>
              </div>
            ) : (
              myActiveTourneys.map(t => {
                const myRegisteredTeam = t.teams && t.teams.find(team => myAcceptedTeamIds.includes(team.global_id));
                const isCaptainOfThisTeam = myRegisteredTeam && myCaptainTeams.some(capTeam => capTeam.id === myRegisteredTeam.global_id);

                return (
                  <div key={t.id} onClick={() => handleOpenTourney(t.id)} className="bg-[#1e1e2a] p-5 rounded-xl border border-white/5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-[0_8px_25px_rgba(16,185,129,0.15)] group cursor-pointer relative overflow-hidden">
                    {/* Petit ruban vertical pour marquer "Mes tournois" */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50 group-hover:bg-emerald-400 transition-colors"></div>
                    
                    <strong className="text-xl block text-white mb-1 font-black tracking-wide group-hover:text-emerald-300 transition-colors pl-2">{t.name}</strong>
                    <span className="text-xs text-[#888] flex items-center gap-1.5 mb-4 font-bold bg-black/30 w-fit px-2.5 py-1 rounded-md ml-2">
                      📅 {t.date || 'Date non définie'}
                    </span>
                    
                    <div className="pl-2">
                      <TeamTagList teams={t.teams} />
                    </div>

                    <div className={`mt-4 mx-2 text-center p-2.5 rounded-lg border transition-colors ${t.status === 'ongoing' ? 'bg-orange-500/10 border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white' : 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white'}`}>
                      {t.status === 'ongoing' ? (
                        <span className="text-xs font-bold text-orange-400 group-hover:text-white">🔥 EN JEU (Suivre l'avancée)</span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-400 group-hover:text-white">🗓️ Voir les engagés</span>
                      )}
                    </div>

                    {t.status === 'preparing' && isCaptainOfThisTeam && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLeaveTournament(t, myRegisteredTeam.global_id); }} 
                        className="w-[calc(100%-1rem)] mx-2 mt-3 bg-transparent border border-red-500/30 text-red-400 p-2 rounded-lg cursor-pointer font-bold text-xs tracking-wider transition-all hover:bg-red-500 hover:text-white hover:border-red-500"
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

        {/* =========================================
            COLONNE 4 : TOURNOIS TERMINÉS (GRIS)
            ========================================= */}
        <div className="bg-[#15151e]/60 backdrop-blur-md rounded-2xl p-5 border border-white/5 flex flex-col shadow-2xl relative overflow-hidden group/col">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#444] to-[#222]"></div>
          
          <h2 className="m-0 mb-4 text-[#888] text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black">
            🏁 Historique
          </h2>
          
          {/* Toggle Pro */}
          <div className="flex bg-black/40 rounded-lg p-1 mb-6 border border-white/5">
            <button 
              onClick={() => setFilterFinished('all')} 
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${filterFinished === 'all' ? 'bg-[#333] text-white shadow-md' : 'text-[#666] hover:text-[#aaa]'}`}
            >
              Tous
            </button>
            <button 
              onClick={() => setFilterFinished('mine')} 
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${filterFinished === 'mine' ? 'bg-emerald-600/30 text-emerald-400 shadow-md' : 'text-[#666] hover:text-[#aaa]'}`}
            >
              Mes matchs
            </button>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {finishedTourneys.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                <span className="text-4xl mb-2">🗄️</span>
                <p className="text-[#666] italic text-center text-sm m-0">Aucun historique.</p>
              </div>
            ) : (
              finishedTourneys.map(t => {
                const iParticipated = isRegisteredIn(t);
                return (
                  <div key={t.id} onClick={() => handleOpenTourney(t.id)} className="bg-[#1e1e2a]/50 p-5 rounded-xl border border-white/5 cursor-pointer transition-all duration-300 hover:bg-[#1e1e2a] hover:-translate-y-1 hover:border-[#444] group">
                    <strong className="text-xl block text-[#aaa] mb-1 font-black tracking-wide group-hover:text-white transition-colors">{t.name}</strong>
                    <span className="text-xs text-[#666] flex items-center gap-1.5 mb-4 font-bold bg-black/20 w-fit px-2.5 py-1 rounded-md">
                      📅 {t.date || 'Date non définie'}
                    </span>
                    
                    <div className="opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0">
                      <TeamTagList teams={t.teams} />
                    </div>

                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg mt-4 border border-white/5">
                      <span className="text-xs text-[#888] font-bold group-hover:text-[#aaa] transition-colors">📊 Voir les archives</span>
                      {iParticipated && (
                        <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-1.5 rounded font-black uppercase tracking-widest shadow-sm">
                          J'y étais !
                        </span>
                      )}
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