import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export default function MesArbitrages({ allTournaments, currentUserName, setActiveTourneyId, setView }) {
  
  // 👉 On récupère UNIQUEMENT launchMatch depuis le contexte (c'est la clé de ton app !)
  const { launchMatch } = useAppContext();
  
  // 🧠 On cherche tous les matchs où je suis OTM
  const otmMatches = useMemo(() => {
    let matches = [];
    if (!currentUserName || !allTournaments) return matches;

    allTournaments.forEach(t => {
      const schedule = [...(t.schedule || []), ...(t.playoffs?.matches || [])];
      
      schedule.forEach(m => {
        // Si mon nom est dans le champ OTM du match
        if (m.otm && m.otm.includes(currentUserName)) {
          matches.push({
            ...m,
            tourneyId: t.id,
            tourneyName: t.name,
            tourneyStatus: t.status
          });
        }
      });
    });

    // On trie pour avoir les matchs "En cours" ou "A venir" en premier
    return matches.sort((a, b) => {
      if (a.status === 'finished' && b.status !== 'finished') return 1;
      if (a.status !== 'finished' && b.status === 'finished') return -1;
      return 0;
    });
  }, [allTournaments, currentUserName]);

  const upcomingMatches = otmMatches.filter(m => m.status !== 'finished' && m.status !== 'canceled' && m.status !== 'forfeit');
  const pastMatches = otmMatches.filter(m => m.status === 'finished' || m.status === 'canceled' || m.status === 'forfeit');

  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1400px] mx-auto relative">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-white/10 pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">哨</span>
          Mes Arbitrages
        </h1>
        <p className="mt-2 text-[#888] font-medium text-sm text-left">
          Retrouve ici les rencontres où tu es assigné à la table de marque (OTM).
        </p>
      </div>

      {otmMatches.length === 0 ? (
        <div className="bg-[#15151e]/60 backdrop-blur-md border border-white/5 rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden flex flex-col items-center mt-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <span className="text-6xl mb-6 drop-shadow-2xl relative z-10">📋</span>
          <h3 className="text-xl sm:text-2xl text-white font-black mb-3 tracking-wide relative z-10">Aucun match à arbitrer</h3>
          <p className="text-[#888] text-sm font-medium max-w-md leading-relaxed m-0 relative z-10">
            Tu n'as été assigné à aucune table de marque pour le moment. Les organisateurs peuvent te désigner directement sur les matchs.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          
          {/* SECTION : MATCHS À VENIR (PRIORITÉ) */}
          {upcomingMatches.length > 0 && (
            <section>
              <h2 className="text-red-400 font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/5 pb-3">
                <span className="animate-pulse text-lg">🔴</span> Matchs en attente
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {upcomingMatches.map(m => (
                  <div key={m.id} className="bg-[#1e1e2a] p-5 sm:p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-5 hover:border-red-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
                    {/* Ligne LED Rouge */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.5)] opacity-80"></div>

                    <div>
                      <div className="text-[10px] text-red-400 font-black tracking-widest uppercase mb-3 bg-red-500/10 px-2.5 py-1 rounded-md w-fit border border-red-500/20">
                        🏆 {m.tourneyName}
                      </div>
                      <div className="text-white font-black text-lg sm:text-xl flex justify-between items-center gap-2">
                        <span className="truncate flex-1 text-right">{m.teamA?.name || 'TBD'}</span>
                        <span className="text-[#555] px-2 text-xs font-bold uppercase tracking-widest bg-black/40 rounded-md py-1 border border-white/5">VS</span>
                        <span className="truncate flex-1 text-left">{m.teamB?.name || 'TBD'}</span>
                      </div>
                    </div>
                    
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex justify-between items-center text-xs font-black tracking-widest uppercase shadow-inner text-[#aaa]">
                      <span className="flex items-center gap-1.5"><span className="text-sm">⏰</span> {m.time || 'TBD'}</span>
                      <span className="flex items-center gap-1.5"><span className="text-sm">📍</span> {m.court || 'TBD'}</span>
                    </div>

                    {/* 👇 LE BOUTON MAGIQUE MIS À JOUR EST ICI 👇 */}
                    <button 
                      onClick={() => { 
                        // 1. On donne les droits d'écriture sur le score
                        localStorage.setItem(`canEdit_match_${m.id}`, "true");

                        // 2. On indique le tournoi
                        setActiveTourneyId(m.tourneyId); 
                        
                        // 3. On charge les données du match avec TA fonction officielle
                        if (launchMatch) launchMatch(m.id);
                        
                        // 4. On ouvre la vue exacte (match et non pas scoreboard)
                        setView('match'); 
                      }}
                      className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white px-5 py-3.5 rounded-xl font-black tracking-widest text-xs uppercase shadow-[0_4px_15px_rgba(225,29,72,0.4)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.6)] hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      ALLER À LA TABLE ⏱️
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION : HISTORIQUE */}
          {pastMatches.length > 0 && (
            <section>
              <h2 className="text-[#888] font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/5 pb-3">
                <span className="text-lg">🏁</span> Historique
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pastMatches.map(m => (
                  <div key={m.id} className="bg-[#15151e]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg opacity-80 hover:opacity-100 transition-all duration-300 relative overflow-hidden group hover:bg-white/5">
                    {/* Ligne LED Grise */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#555] to-[#333]"></div>

                    <div className="text-[10px] text-[#888] font-black tracking-widest uppercase mb-3 bg-black/40 px-2.5 py-1 rounded-md w-fit border border-white/5">
                      🏆 {m.tourneyName}
                    </div>
                    
                    <div className="text-[#ccc] font-black text-base sm:text-lg flex justify-between items-center gap-2 mb-4 group-hover:text-white transition-colors">
                      <span className="truncate flex-1 text-right">{m.teamA?.name || 'TBD'}</span>
                      <b className="bg-black/60 px-3 py-1.5 rounded-lg text-xs mx-2 border border-white/10 shadow-inner font-black tracking-wider text-white">
                        {m.status === 'canceled' ? 'ANN' : (m.status === 'forfeit' ? 'FFF' : `${m.scoreA} - ${m.scoreB}`)}
                      </b>
                      <span className="truncate flex-1 text-left">{m.teamB?.name || 'TBD'}</span>
                    </div>
                    
                    <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest text-center mt-2 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                      Mission terminée ✅
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}