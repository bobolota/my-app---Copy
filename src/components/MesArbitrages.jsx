import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function MesArbitrages({ allTournaments, currentUserName, setActiveTourneyId, setView }) {
  
  const { launchMatch, setTournaments, fetchTournaments } = useAppContext();
  const { session } = useAuth();
  
  // NOUVEAU : États pour l'édition manuelle du score
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [tempScoreA, setTempScoreA] = useState(0);
  const [tempScoreB, setTempScoreB] = useState(0);

  // 🧠 On cherche tous les matchs où je suis OTM
  const otmMatches = useMemo(() => {
    let matches = [];
    if (!allTournaments) return matches;

    const myId = session?.user?.id;
    const cleanMyName = currentUserName ? currentUserName.trim().toLowerCase() : "";

    allTournaments.forEach(t => {
      // 1. Suis-je OTM global sur ce tournoi (via mon ID) ?
      const isGlobalOtm = myId && t.otm_ids && t.otm_ids.includes(myId);

      // 2. On récupère les matchs (nouvelle version table SQL)
      const schedule = [
        ...(t.matches || []), 
        ...(t.matches ? [] : (t.schedule || [])),
        ...(t.matches ? [] : (t.playoffs?.matches || []))
      ];
      
      schedule.forEach(m => {
        // 3. Suis-je OTM spécifiquement sur ce match (via mon prénom) ?
        let isSpecificOtm = false;
        if (m.otm && cleanMyName) {
          if (Array.isArray(m.otm)) {
            isSpecificOtm = m.otm.some(n => typeof n === 'string' && n.trim().toLowerCase() === cleanMyName);
          } else if (typeof m.otm === 'string') {
            isSpecificOtm = m.otm.toLowerCase().includes(cleanMyName);
          }
        }

        // 🎯 On ne garde QUE les matchs où je suis spécifiquement assigné
        if (isSpecificOtm) {
          
          // 🛠️ RÉSOLUTION DU BUG "TBD" : On récupère les noms d'équipes de manière plus robuste
          const getTeamObj = (teamData) => {
              if (!teamData) return null;
              if (typeof teamData === 'string') {
                  return t.teams?.find(team => team.id === teamData) || null;
              }
              if (teamData.name) return teamData;
              
              return t.teams?.find(team => team.id === teamData.id) || null;
          };

          const fullTeamA = getTeamObj(m.teamA || m.team_a);
          const fullTeamB = getTeamObj(m.teamB || m.team_b);

          // Vérification des effectifs pour savoir si le match est prêt à être lancé
          const courtSize = parseInt(t.matchsettings?.courtSize) || 5;
          const isReady = (fullTeamA?.players?.length >= courtSize) && (fullTeamB?.players?.length >= courtSize);

          matches.push({
            ...m,
            teamA_name: fullTeamA ? fullTeamA.name : 'TBD',
            teamB_name: fullTeamB ? fullTeamB.name : 'TBD',
            
            // 👇 LA CORRECTION ABSOLUE EST ICI 👇
            scoreA: m.scoreA ?? m.score_a ?? 0, 
            scoreB: m.scoreB ?? m.score_b ?? 0, 
            // 👆--------------------------------👆
            
            isReady: isReady,
            courtSize: courtSize,
            tourneyId: t.id,
            tourneyName: t.name,
            tourneyStatus: t.status,
            // 🚀 On garde les valeurs brutes, l'interface va les formater joliment !
            datetime: m.datetime,
            court: m.court
          });
        }
      });
    });

    // On trie pour avoir les matchs "En cours" ou "A venir" en premier
    return matches.sort((a, b) => {
      if (a.status === 'finished' && b.status !== 'finished') return 1;
      if (a.status !== 'finished' && b.status === 'finished') return -1;
      // Tri par date s'ils ont le même statut
      if (a.datetime && b.datetime) return new Date(a.datetime) - new Date(b.datetime);
      return 0;
    });
  }, [allTournaments, currentUserName, session]);

  // --- 🛠️ SAUVEGARDE MANUELLE AVEC TÉLÉPORTATION DU GAGNANT ---
  const saveManualScore = async (matchId, tourneyId) => {
    const finalScoreA = parseInt(tempScoreA, 10) || 0;
    const finalScoreB = parseInt(tempScoreB, 10) || 0;

    // 1. Retrouver le match pour lire sa destination
    const tourney = allTournaments?.find(t => t.id === tourneyId);
    if (!tourney) return;

    const currentMatch = (tourney.matches || []).find(m => m.id === matchId);
    if (!currentMatch) return;

    // 2. Extraire l'ID du gagnant
    let winnerId = null;
    const getTeamId = (t) => t ? (typeof t === 'object' ? t.id : t) : null;
    
    if (finalScoreA > finalScoreB) winnerId = getTeamId(currentMatch.teamA || currentMatch.team_a);
    else if (finalScoreB > finalScoreA) winnerId = getTeamId(currentMatch.teamB || currentMatch.team_b);

    // 💡 L'ADRESSE DE DESTINATION
    const nextMatchId = currentMatch.nextMatchId || currentMatch.metadata?.nextMatchId;
    const nextSlot = currentMatch.nextSlot || currentMatch.metadata?.nextSlot;

    // 3. MISE À JOUR VISUELLE IMMÉDIATE (Le match + La case suivante)
    setTournaments(prevTournaments => 
      prevTournaments.map(t => {
        if (t.id === tourneyId) {
          const newMatches = [...(t.matches || [])];
          
          // Figer le score du match actuel
          const mIdx = newMatches.findIndex(m => m.id === matchId);
          if (mIdx > -1) {
            newMatches[mIdx] = { ...newMatches[mIdx], scoreA: finalScoreA, scoreB: finalScoreB, score_a: finalScoreA, score_b: finalScoreB, status: 'finished' };
          }

          // Afficher le gagnant dans la case suivante
          if (winnerId && nextMatchId) {
            const nIdx = newMatches.findIndex(m => m.id === nextMatchId);
            if (nIdx > -1) {
              const nextSlotDb = nextSlot === 'teamA' ? 'team_a' : 'team_b';
              newMatches[nIdx] = { ...newMatches[nIdx], [nextSlotDb]: String(winnerId), [nextSlot]: String(winnerId) };
            }
          }
          return { ...t, matches: newMatches };
        }
        return t;
      })
    );
    
    // On ferme la case d'édition
    setEditingScoreId(null);

    // 4. SAUVEGARDE EN ARRIÈRE-PLAN
    // Envoi silencieux du vainqueur dans la case suivante
    if (winnerId && nextMatchId) {
        const nextSlotDb = nextSlot === 'teamA' ? 'team_a' : 'team_b';
        await supabase.from('matches').update({ [nextSlotDb]: String(winnerId) }).eq('id', nextMatchId);
    }

    // Envoi du score final du match actuel
    const { error } = await supabase.from('matches').update({
      score_a: finalScoreA,
      score_b: finalScoreB,
      status: 'finished',
    }).eq('id', matchId);
    
    if (error) {
      toast.error("Erreur réseau lors de la sauvegarde.");
    } else {
      toast.success("Score validé et arbre mis à jour ! 🏆");
      if (fetchTournaments) fetchTournaments(); 
    }
  };

  const upcomingMatches = otmMatches.filter(m => m.status !== 'finished' && m.status !== 'canceled' && m.status !== 'forfeit');
  const pastMatches = otmMatches.filter(m => m.status === 'finished' || m.status === 'canceled' || m.status === 'forfeit');

  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1400px] mx-auto relative">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-muted-line pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">🖥️</span>
          Mes Arbitrages
        </h1>
        <p className="mt-2 text-muted font-medium text-sm text-left">
          Retrouve ici les rencontres où tu es assigné à la table de marque (OTM).
        </p>
      </div>

      {otmMatches.length === 0 ? (
        <div className="bg-app-panel/60 backdrop-blur-md border border-muted-line rounded-3xl p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden flex flex-col items-center mt-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-danger/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <span className="text-6xl mb-6 drop-shadow-2xl relative z-10">📋</span>
          <h3 className="text-xl sm:text-2xl text-white font-black mb-3 tracking-wide relative z-10">Aucun match à arbitrer</h3>
          <p className="text-muted text-sm font-medium max-w-md leading-relaxed m-0 relative z-10">
            Tu n'as été assigné à aucune table de marque pour le moment. Les organisateurs peuvent te désigner directement sur les matchs.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          
          {/* SECTION : MATCHS À VENIR (PRIORITÉ) */}
          {upcomingMatches.length > 0 && (
            <section>
              <h2 className="text-danger-light font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-muted-line pb-3">
                <span className="animate-pulse text-lg">🔴</span> Matchs en attente
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {upcomingMatches.map(m => (
                  <div key={m.id} className="bg-app-card p-5 sm:p-6 rounded-2xl border border-muted-line shadow-xl flex flex-col gap-5 hover:border-danger/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
                    {/* Ligne LED Rouge */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-danger to-danger-dark shadow-[0_0_15px_rgba(239,68,68,0.5)] opacity-80"></div>

                    <div>
                      <div className="text-[10px] text-danger-light font-black tracking-widest uppercase mb-3 bg-danger/10 px-2.5 py-1 rounded-md w-fit border border-danger/20">
                        🏆 {m.tourneyName}
                      </div>
                      {editingScoreId === m.id ? (
                        /* ✏️ MODE ÉDITION MANUELLE DU SCORE */
                        <div className="flex flex-col gap-2 bg-app-input p-3 rounded-xl border border-muted-line shadow-inner relative z-10 w-full mb-3 mt-1">
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-xs text-white font-bold truncate flex-1">{m.teamA_name}</span>
                            <input 
  type="number" 
  min="0" 
  value={tempScoreA} 
  onClick={(e) => e.stopPropagation()} 
  onChange={(e) => setTempScoreA(e.target.value)} 
  className="w-14 p-1.5 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner transition-colors" 
/>
                          </div>
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-xs text-white font-bold truncate flex-1">{m.teamB_name}</span>
                            <input 
  type="number" 
  min="0" 
  value={tempScoreB} 
  onClick={(e) => e.stopPropagation()} 
  onChange={(e) => setTempScoreB(e.target.value)} 
  className="w-14 p-1.5 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner transition-colors" 
/>
                          </div>
                          <div className="flex gap-2 mt-2 pt-2 border-t border-muted-line">
                            <button onClick={(e) => { e.stopPropagation(); setEditingScoreId(null); }} className="flex-1 text-[0.65rem] font-bold text-muted hover:text-white py-1.5 transition-colors uppercase tracking-widest cursor-pointer border border-transparent bg-transparent">Annuler</button>
                            <button onClick={(e) => { e.stopPropagation(); saveManualScore(m.id, m.tourneyId); }} className="flex-1 text-[0.65rem] font-black bg-secondary/20 text-secondary hover:bg-secondary hover:text-white rounded py-1.5 transition-all shadow-md uppercase tracking-widest cursor-pointer border border-secondary/30">Valider</button>
                          </div>
                        </div>
                      ) : (
                        /* 📊 AFFICHAGE NORMAL */
                        <div className="text-white font-black text-lg sm:text-xl flex justify-between items-center gap-2">
                          {/* Utilisation des noms générés avec la nouvelle méthode */}
                          <span className="truncate flex-1 text-right">{m.teamA_name}</span>
                          <span className="text-muted-dark px-2 text-xs font-bold uppercase tracking-widest bg-black/40 rounded-md py-1 border border-muted-line">VS</span>
                          <span className="truncate flex-1 text-left">{m.teamB_name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-black/40 p-4 rounded-xl border border-muted-line flex justify-between items-center text-xs font-black tracking-widest uppercase shadow-inner text-muted-light">
                      <span className="flex items-center gap-1.5"><span className="text-sm">⏰</span> {m.displayTime}</span>
                      <span className="flex items-center gap-1.5"><span className="text-sm">📍</span> {m.displayCourt}</span>
                    </div>

                    {/* 👇 BOUTON SÉCURISÉ SELON L'EFFECTIF + BOUTON CRAYON 👇 */}
                    <div className="flex gap-2">
                      {/* BOUTON CRAYON */}
                      {editingScoreId !== m.id && (
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            setEditingScoreId(m.id); 
                            setTempScoreA(m.scoreA || 0); 
                            setTempScoreB(m.scoreB || 0); 
                          }} 
                          className="w-14 rounded-xl bg-app-input border border-muted-line text-muted-light hover:bg-secondary/20 hover:text-secondary hover:border-secondary/30 flex items-center justify-center text-lg cursor-pointer transition-colors shadow-sm"
                          title="Saisir le score final sans utiliser la table"
                        >
                          ✏️
                        </button>
                      )}

                      {/* BOUTON TABLE DE MARQUE */}
                      <button 
                        onClick={() => { 
                          if (!m.isReady) {
                             toast.error(`Impossible de lancer le match : il faut au moins ${m.courtSize} joueurs par équipe.`);
                             return;
                          }
                          localStorage.setItem(`canEdit_match_${m.id}`, "true");
                          setActiveTourneyId(m.tourneyId); 
                          if (launchMatch) launchMatch(m.id);
                          setView('match'); 
                        }}
                        className={`flex-1 px-5 py-3.5 rounded-xl font-black tracking-widest text-[10px] sm:text-xs uppercase transition-all cursor-pointer ${
                          m.isReady 
                          ? 'bg-gradient-to-r from-danger to-danger-dark text-white shadow-[0_4px_15px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.6)] hover:-translate-y-0.5' 
                          : 'bg-app-input text-muted-dark border border-muted-line cursor-not-allowed hover:bg-app-input'
                        }`}
                      >
                        {m.isReady ? 'ALLER À LA TABLE ⏱️' : 'ÉQUIPES INCOMPLÈTES ⚠️'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION : HISTORIQUE */}
          {pastMatches.length > 0 && (
            <section>
              <h2 className="text-muted font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-muted-line pb-3">
                <span className="text-lg">🏁</span> Historique
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pastMatches.map(m => (
                  <div key={m.id} className="bg-app-panel/60 backdrop-blur-md border border-muted-line rounded-2xl p-5 shadow-lg opacity-80 hover:opacity-100 transition-all duration-300 relative overflow-hidden group hover:bg-white/5 flex flex-col">
                    {/* Ligne LED Grise */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-muted-dark to-app-bg"></div>

                    <div className="text-[10px] text-muted font-black tracking-widest uppercase mb-3 bg-black/40 px-2.5 py-1 rounded-md w-fit border border-muted-line">
                      🏆 {m.tourneyName}
                    </div>
                    
                    {editingScoreId === m.id ? (
                      // ✏️ MODE ÉDITION DU SCORE
                      <div className="flex flex-col gap-2 mt-2 bg-app-input p-3 rounded-xl border border-muted-line shadow-inner mb-4">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-xs text-white font-bold truncate flex-1">{m.teamA_name}</span>
                          <input 
  type="number" 
  min="0" 
  value={tempScoreA} 
  onClick={(e) => e.stopPropagation()} 
  onChange={(e) => setTempScoreA(e.target.value)} 
  className="w-14 p-1.5 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner transition-colors" 
/>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-xs text-white font-bold truncate flex-1">{m.teamB_name}</span>
                          <input 
  type="number" 
  min="0" 
  value={tempScoreB} 
  onClick={(e) => e.stopPropagation()} 
  onChange={(e) => setTempScoreB(e.target.value)} 
  className="w-14 p-1.5 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner transition-colors" 
/>
                        </div>
                        <div className="flex gap-2 mt-2 pt-2 border-t border-muted-line">
                          <button onClick={(e) => { e.stopPropagation(); setEditingScoreId(null); }} className="flex-1 text-[0.65rem] font-bold text-muted hover:text-white py-1.5 transition-colors uppercase tracking-widest cursor-pointer">Annuler</button>
                          <button onClick={(e) => { e.stopPropagation(); saveManualScore(m.id, m.tourneyId); }} className="flex-1 text-[0.65rem] font-black bg-secondary/20 text-secondary hover:bg-secondary hover:text-white rounded py-1.5 transition-all shadow-md uppercase tracking-widest cursor-pointer border border-secondary/30">Valider</button>
                        </div>
                      </div>
                    ) : (
                      // AFFICHAGE NORMAL DU SCORE
                      <div className="text-muted-light font-black text-base sm:text-lg flex justify-between items-center gap-2 mb-4 group-hover:text-white transition-colors">
                        <span className="truncate flex-1 text-right">{m.teamA_name}</span>
                        <b className="bg-black/60 px-3 py-1.5 rounded-lg text-xs mx-2 border border-muted-line shadow-inner font-black tracking-wider text-white">
                          {m.status === 'canceled' ? 'ANN' : (m.status === 'forfeit' ? 'FFF' : `${m.scoreA || 0} - ${m.scoreB || 0}`)}
                        </b>
                        <span className="truncate flex-1 text-left">{m.teamB_name}</span>
                      </div>
                      
                    )}
                    
                    <div className="flex items-center justify-between mt-auto pt-2">
                       <div className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                         Mission terminée ✅
                       </div>
                       
                       {/* Bouton d'édition manuel */}
                       {!editingScoreId && m.status !== 'canceled' && m.status !== 'forfeit' && (
                         <button 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             setEditingScoreId(m.id); 
                             setTempScoreA(m.scoreA || 0); 
                             setTempScoreB(m.scoreB || 0); 
                           }} 
                           className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center text-xs cursor-pointer hover:bg-secondary hover:text-white transition-colors shadow-sm" 
                           title="Modifier manuellement le score"
                         >
                           ✏️
                         </button>
                       )}
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