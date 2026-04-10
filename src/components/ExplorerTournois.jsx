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
  const isRegisteredIn = (t) => {
  if (!t.teams) return false;
  
  return t.teams.some(team => {
    // 1. Est-ce que c'est une de mes équipes officielles ? (Cas du 5x5 / 3x3)
    const isMyOfficialTeam = myAcceptedTeamIds.includes(team.global_id);
    
    // 2. Est-ce que c'est une équipe fantôme dans laquelle je suis le joueur lié ?
    // On fouille dans la liste des joueurs pour voir si mon ID ou mon profile_id s'y trouve.
    const amIInPhantomTeam = team.players && team.players.some(p => 
      p.user_id === session?.user?.id || p.id === session?.user?.id || p.profile_id === session?.user?.id
    );

    return isMyOfficialTeam || amIInPhantomTeam;
  });
};

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
      <div className="mb-8 border-b border-muted-line pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">🌍</span> 
          Explorer les tournois
        </h1>
        <p className="mt-2 text-muted font-medium text-sm text-left">
          Découvre les compétitions, inscris ton équipe ou suis les résultats en direct.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* =========================================
            COLONNE 1 : INSCRIPTION OUVERTE (SECONDARY / ORANGE)
            ========================================= */}
        <div className="bg-app-panel/80 backdrop-blur-md rounded-2xl p-5 border border-muted-line flex flex-col shadow-2xl relative overflow-hidden group/col">
          {/* Ligne LED décorative */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-secondary-dark shadow-[0_0_15px_rgba(249,115,22,0.6)]"></div>
          
          <h2 className="m-0 mb-6 text-secondary text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_rgba(249,115,22,1)]"></span>
            Inscription ouverte
          </h2>
          
          <div className="flex flex-col gap-4 flex-1">
            {publicTourneys.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                <span className="text-4xl mb-2">🏜️</span>
                <p className="text-muted-dark italic text-center text-sm m-0">Aucun tournoi disponible.</p>
              </div>
            ) : (
              publicTourneys.map(t => {
                // Détermination du format
                const courtSize = parseInt(t.matchsettings?.courtSize) || 5;
                const formatLabel = `${courtSize}x${courtSize}`;

                return (
                  <div key={t.id} className="bg-app-card p-5 rounded-xl border border-muted-line shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-secondary/30 hover:shadow-[0_8px_25px_rgba(249,115,22,0.15)] group flex flex-col justify-between min-h-[180px]">
                    <div className="flex flex-col gap-3">
                      <strong className="text-lg block text-white font-heading truncate group-hover:text-secondary-light transition-colors" title={t.name}>{t.name}</strong>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[0.65rem] text-muted flex items-center gap-1.5 font-bold bg-black/30 px-2 py-1 rounded-md border border-muted-line">
                          📅 {t.date || 'Date non définie'}
                        </span>
                        
                        {/* BADGE TYPE DE TOURNOI (Remplace TeamTagList) */}
                        <span className="text-[0.65rem] text-secondary flex items-center gap-1.5 font-black bg-secondary/10 px-2 py-1 rounded-md border border-secondary/20 tracking-widest">
                          🏀 {formatLabel}
                        </span>
                      </div>
                    </div>
                    
                    {/* LOGIQUE D'INSCRIPTION */}
                    <div className="mt-auto w-full">
                      {myCaptainTeams.length === 0 && courtSize !== 1 ? (
                        <div className="w-full bg-danger/10 border border-danger/20 rounded-xl p-3 text-center">
                          <span className="text-[10px] text-danger font-black uppercase tracking-widest">⚠️ Fonde une équipe</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setRegisterModalTourney(t)} 
                          className="w-full bg-gradient-to-r from-secondary to-secondary-dark text-white p-3 rounded-xl font-black tracking-widest text-xs uppercase shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.5)] transition-all hover:-translate-y-0.5 cursor-pointer active:scale-95"
                        >
                          {courtSize === 1 ? "REJOINDRE 🚀" : "S'INSCRIRE 🚀"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================
            COLONNE 2 : TOURNOIS EN COURS (ACTION / BLEU)
            ========================================= */}
        <div className="bg-app-panel/80 backdrop-blur-md rounded-2xl p-5 border border-muted-line flex flex-col shadow-2xl relative overflow-hidden group/col">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-action to-action-light shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
          
          <h2 className="m-0 mb-6 text-action text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black">
            🔥 Suivre un tournoi
          </h2>
          
          <div className="flex flex-col gap-4 flex-1">
            {ongoingOtherTourneys.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                <span className="text-4xl mb-2">📭</span>
                <p className="text-muted-dark italic text-center text-sm m-0">Aucun autre tournoi en cours.</p>
              </div>
            ) : (
              ongoingOtherTourneys.map(t => {
                const courtSize = parseInt(t.matchsettings?.courtSize) || 5;
                return (
                  <div key={t.id} onClick={() => handleOpenTourney(t.id)} className="bg-app-card p-5 rounded-xl border border-muted-line shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-action/40 hover:shadow-[0_8px_25px_rgba(59,130,246,0.15)] group cursor-pointer flex flex-col justify-between min-h-[180px]">
                    <div className="flex flex-col gap-3">
                      <strong className="text-lg block text-white font-heading truncate group-hover:text-action-light transition-colors" title={t.name}>{t.name}</strong>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[0.65rem] text-muted flex items-center gap-1.5 font-bold bg-black/30 px-2 py-1 rounded-md border border-muted-line">
                          📅 {t.date || 'En cours'}
                        </span>
                        <span className="text-[0.65rem] text-action flex items-center gap-1.5 font-black bg-action/10 px-2 py-1 rounded-md border border-action/20 tracking-widest uppercase">
                          🏀 {courtSize}X{courtSize}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto w-full">
                      <div className="w-full flex items-center justify-center gap-2 text-xs text-action font-black bg-action/10 border border-action/20 p-3 rounded-xl group-hover:bg-action group-hover:text-white transition-colors uppercase tracking-widest">
                        <span>👀</span> Suivre
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================
            COLONNE 3 : MES TOURNOIS (PRIMARY / VERT)
            ========================================= */}
        <div className="bg-app-panel/80 backdrop-blur-md rounded-2xl p-5 border border-muted-line flex flex-col shadow-2xl relative overflow-hidden group/col">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-light shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>
          
          <h2 className="m-0 mb-6 text-primary text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black">
            ✅ Mes Engagements
          </h2>
          
          <div className="flex flex-col gap-4 flex-1">
            {myActiveTourneys.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                <span className="text-4xl mb-2">🛌</span>
                <p className="text-muted-dark italic text-center text-sm m-0">Aucune participation active.</p>
              </div>
            ) : (
              myActiveTourneys.map(t => {
                const myRegisteredTeam = t.teams && t.teams.find(team => myAcceptedTeamIds.includes(team.global_id));
                const isCaptainOfThisTeam = myRegisteredTeam && myCaptainTeams.some(capTeam => capTeam.id === myRegisteredTeam.global_id);
                const courtSize = parseInt(t.matchsettings?.courtSize) || 5;

                return (
                  <div key={t.id} onClick={() => handleOpenTourney(t.id)} className="bg-app-card p-5 rounded-xl border border-muted-line shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_25px_rgba(16,185,129,0.15)] group cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50 group-hover:bg-primary-light transition-colors"></div>
                    
                    <div className="flex flex-col gap-3 pl-2">
                      <strong className="text-lg block text-white font-heading truncate group-hover:text-primary-light transition-colors" title={t.name}>{t.name}</strong>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[0.65rem] text-muted flex items-center gap-1.5 font-bold bg-black/30 px-2 py-1 rounded-md border border-muted-line">
                          📅 {t.date || 'Engagé'}
                        </span>
                        <span className="text-[0.65rem] text-primary flex items-center gap-1.5 font-black bg-primary/10 px-2 py-1 rounded-md border border-primary/20 tracking-widest uppercase">
                          🏀 {courtSize}X{courtSize}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto w-full flex flex-col gap-2">
                      <div className={`w-full text-center p-2 rounded-xl border transition-colors ${t.status === 'ongoing' ? 'bg-secondary/10 border-secondary/20 group-hover:bg-secondary group-hover:text-white' : 'bg-primary/10 border-primary/20 group-hover:bg-primary group-hover:text-white'}`}>
                        {t.status === 'ongoing' ? (
                          <span className="text-xs font-black tracking-widest uppercase text-secondary group-hover:text-white">🔥 EN JEU</span>
                          
                        ) : (
                          <span className="text-xs font-black tracking-widest uppercase text-primary group-hover:text-white">🗓️ VOIR ENGAGÉS</span>
                        )}
                      </div>

                      {t.status === 'preparing' && isCaptainOfThisTeam && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleLeaveTournament(t, myRegisteredTeam.global_id); }} 
                          className="w-full bg-transparent border border-danger/30 text-danger p-2 rounded-xl cursor-pointer font-black text-[10px] tracking-wider transition-all hover:bg-danger hover:text-white hover:border-danger uppercase"
                        >
                          DÉSINCRIRE 🚪
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================
            COLONNE 4 : TOURNOIS TERMINÉS (MUTED / GRIS)
            ========================================= */}
        <div className="bg-app-panel/60 backdrop-blur-md rounded-2xl p-5 border border-muted-line flex flex-col shadow-2xl relative overflow-hidden group/col">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-muted-dark to-app-bg"></div>
          
          <h2 className="m-0 mb-4 text-muted text-sm flex items-center justify-center gap-2 uppercase tracking-widest font-black">
            🏁 Historique
          </h2>
          
          <div className="flex bg-black/40 rounded-lg p-1 mb-6 border border-muted-line">
            <button onClick={() => setFilterFinished('all')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${filterFinished === 'all' ? 'bg-muted-dark text-white shadow-md' : 'text-muted-dark hover:text-muted-light'}`}>Tous</button>
            <button onClick={() => setFilterFinished('mine')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${filterFinished === 'mine' ? 'bg-primary-dark/30 text-primary shadow-md' : 'text-muted-dark hover:text-muted-light'}`}>Mes matchs</button>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {finishedTourneys.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                <span className="text-4xl mb-2">🗄️</span>
                <p className="text-muted-dark italic text-center text-sm m-0">Aucun historique.</p>
              </div>
            ) : (
              finishedTourneys.map(t => {
                const iParticipated = isRegisteredIn(t);
                const courtSize = parseInt(t.matchsettings?.courtSize) || 5;
                return (
                  <div key={t.id} onClick={() => handleOpenTourney(t.id)} className="bg-app-card/50 p-5 rounded-xl border border-muted-line cursor-pointer transition-all duration-300 hover:bg-app-card hover:-translate-y-1 hover:border-muted-dark group flex flex-col justify-between min-h-[180px]">
                    <div className="flex flex-col gap-3">
                      <strong className="text-lg block text-muted-light font-heading truncate group-hover:text-white transition-colors" title={t.name}>{t.name}</strong>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[0.65rem] text-muted-dark flex items-center gap-1.5 font-bold bg-black/20 px-2 py-1 rounded-md border border-muted-line">
                          📅 {t.date || 'Terminé'}
                        </span>
                        <span className="text-[0.65rem] text-muted flex items-center gap-1.5 font-black bg-white/5 px-2 py-1 rounded-md border border-muted-line tracking-widest uppercase grayscale group-hover:grayscale-0 transition-all">
                          🏀 {courtSize}X{courtSize}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto w-full">
                      <div className="w-full flex justify-between items-center bg-black/30 p-3 rounded-xl border border-muted-line group-hover:border-muted transition-colors">
                        <span className="text-xs text-muted font-black uppercase tracking-widest group-hover:text-white transition-colors">📊 Archives</span>
                        {iParticipated && (
                          <span className="text-[9px] bg-primary/20 border border-primary/30 text-primary px-2 py-1.5 rounded font-black uppercase tracking-widest shadow-sm">J'y étais</span>
                        )}
                      </div>
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