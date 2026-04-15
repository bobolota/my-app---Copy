// DEBUT DE LA MODIFICATION - NOUVEAU FICHIER : src/context/AppContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext'; // Il a besoin de savoir qui est connecté !
import toast from 'react-hot-toast';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { session } = useAuth();
  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const closeConfirm = () => setConfirmData(prev => ({ ...prev, isOpen: false }));

  const [promptData, setPromptData] = useState({ isOpen: false, title: '', message: '', placeholder: '', onConfirm: null });
  const closePrompt = () => setPromptData(prev => ({ ...prev, isOpen: false }));
  
  // 1. Toutes tes variables globales
  const [userRole, setUserRole] = useState(null);
  const [userSubscription, setUserSubscription] = useState('FREE');
  const [tournaments, setTournaments] = useState([]);
  const [activeTourneyId, setActiveTourneyId] = useState(() => localStorage.getItem('basket_active_id_v3') || null);
  const [view, setView] = useState(() => localStorage.getItem('basket_view_v3') || 'dashboard');
  const [activeMenu, setActiveMenu] = useState(() => localStorage.getItem('basket_active_menu_v3') || 'vestiaire');

  const [activeMatch, setActiveMatch] = useState(() => {
    try {
      const savedMatch = localStorage.getItem('basket_active_match_v3');
      return savedMatch ? JSON.parse(savedMatch) : null;
    } catch (e) { return null; }
  });

  const currentTourney = tournaments.find(t => t.id.toString() === activeTourneyId?.toString());

  // 2. Écoute de la session pour charger les données
  useEffect(() => {
    if (session) {
      fetchUserRole(session.user.id);
      fetchTournaments();
    } else {
      setUserRole(null);
      setTournaments([]);
    }
  }, [session]);

  // 3. Tes fonctions de récupération
  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('subscription_tier').eq('id', userId).single();
      if (!error && data) {
        setUserRole(data.subscription_tier === 'PRO' ? 'ADMIN' : 'PLAYER'); 
        setUserSubscription(data.subscription_tier || 'FREE');
        
        const savedMenu = localStorage.getItem('basket_active_menu_v3');
        if (!savedMenu) {
          if (data.subscription_tier === 'PRO') setActiveMenu('dashboard_orga');
          else setActiveMenu('vestiaire');
        } else if (savedMenu === 'dashboard_orga' && data.subscription_tier !== 'PRO') {
          setActiveMenu('vestiaire');
        }
      }
    } catch (error) {
      console.error("Erreur récupération profil :", error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, matches(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedData = data.map(t => ({
          ...t,
          matches: (t.matches || []).map(m => ({
            ...(m.metadata || {}), 
            id: m.id,
            tourneyId: m.tournament_id,
            type: m.type,
            status: m.status,
            teamA: m.team_a,
            teamB: m.team_b,
            scoreA: m.score_a,
            scoreB: m.score_b,
            savedStatsA: m.saved_stats_a,
            savedStatsB: m.saved_stats_b,
            liveHistory: m.live_history,
            
            // 👇 C'EST ICI QU'IL FAUT L'AJOUTER POUR QUE ÇA SURVIVE AU F5 !
            otm: m.otm,           
            datetime: m.datetime, 
            court: m.court        
          }))
        }));
        setTournaments(mappedData);
      }
    
    } catch (error) {
      console.error("Erreur de chargement des tournois:", error);
    }
  };

  // 4. Ton écouteur en temps réel V2
  useEffect(() => {
    const channel = supabase
      .channel('tournaments_live')
      // Écoute des modifs du tournoi (nom, paramètres...)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, (payload) => {
          if (payload.new) {
            setTournaments(prev => prev.map(t => 
              t.id === payload.new.id ? { ...t, ...payload.new, matches: t.matches } : t
            ));
          }
      })
      // NOUVEAU : Écoute des modifs sur les MATCHS (avec gestion des suppressions !)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
          setTournaments(prev => prev.map(t => {
            
            // 🗑️ CAS 1 : SUPPRESSION (DELETE)
            if (payload.eventType === 'DELETE') {
              return { 
                ...t, 
                matches: (t.matches || []).filter(m => m.id !== payload.old.id) 
              };
            }
            
            // ➕ CAS 2 : AJOUT OU MISE À JOUR (INSERT / UPDATE)
            if (payload.new && t.id === payload.new.tournament_id) {
              const updatedMatches = [...(t.matches || [])];
              const matchIndex = updatedMatches.findIndex(m => m.id === payload.new.id);
              
              const mappedMatch = {
                ...(payload.new.metadata || {}), // 👈 LA LIGNE MAGIQUE
                id: payload.new.id, tourneyId: payload.new.tournament_id,
                type: payload.new.type, status: payload.new.status,
                teamA: payload.new.team_a, teamB: payload.new.team_b,
                scoreA: payload.new.score_a, scoreB: payload.new.score_b,
                savedStatsA: payload.new.saved_stats_a, savedStatsB: payload.new.saved_stats_b,
                liveHistory: payload.new.live_history,
                otm: payload.new.otm,           // 👈 AJOUTE CECI
                datetime: payload.new.datetime, // 👈 AJOUTE CECI
                court: payload.new.court        // 👈 AJOUTE CECI
              };

              if (matchIndex > -1) updatedMatches[matchIndex] = mappedMatch;
              else updatedMatches.push(mappedMatch);

              return { ...t, matches: updatedMatches };
            }
            
            return t;
          }));
      }).subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 5. Tes sauvegardes automatiques dans le navigateur
  useEffect(() => { localStorage.setItem('basket_view_v3', view); }, [view]);
  useEffect(() => { localStorage.setItem('basket_active_id_v3', activeTourneyId || ""); }, [activeTourneyId]);
  useEffect(() => { localStorage.setItem('basket_active_menu_v3', activeMenu); }, [activeMenu]);
  useEffect(() => { // 🏀 NOUVEAU : Sauvegarde du match
    if (activeMatch) localStorage.setItem('basket_active_match_v3', JSON.stringify(activeMatch));
    else localStorage.removeItem('basket_active_match_v3');
  }, [activeMatch]);

  
  // --- 🏀 LOGIQUE DE MATCH V2 ---
  const launchMatch = (matchId) => {
    if (!currentTourney) return;
    setActiveMatch(null); 
    setTimeout(() => {
      // V2 : On cherche tout simplement dans le tableau unifié 'matches'
      const match = currentTourney.matches?.find(m => m.id === matchId);
      if (match) {
        setActiveMatch({ ...match, tourneyId: activeTourneyId });
        setView('match');
      }
    }, 10);
  };

  const finishMatch = async (scoreA, scoreB, playersA, playersB) => {
    if (!activeMatch) return;

    // 1. Sauvegarde du match actuel en base de données
    const { error } = await supabase.from('matches').update({
      status: 'finished',
      score_a: scoreA,
      score_b: scoreB,
      saved_stats_a: playersA,
      saved_stats_b: playersB
    }).eq('id', activeMatch.id);

    if (error) {
      toast.error("Erreur réseau lors de la sauvegarde !");
      return;
    }

    // 🚀 2. TÉLÉPORTATION DU GAGNANT DANS L'ARBRE (ADVANCE WINNER)
    let winnerId = null;
    const getTeamId = (t) => t ? (typeof t === 'object' ? t.id : t) : null;

    if (scoreA > scoreB) winnerId = getTeamId(activeMatch.teamA || activeMatch.team_a);
    else if (scoreB > scoreA) winnerId = getTeamId(activeMatch.teamB || activeMatch.team_b);

    // L'adresse de destination (même logique infaillible)
    const nextMatchId = activeMatch.nextMatchId || activeMatch.metadata?.nextMatchId;
    const nextSlot = activeMatch.nextSlot || activeMatch.metadata?.nextSlot;

    if (winnerId && nextMatchId) {
        const nextSlotDb = nextSlot === 'teamA' ? 'team_a' : 'team_b';
        await supabase.from('matches').update({ [nextSlotDb]: String(winnerId) }).eq('id', nextMatchId);
    }

    // 3. Mise à jour instantanée de l'écran (Le match + La case suivante)
    setTournaments(prev => prev.map(t => {
      if (t.id === activeMatch.tourneyId) {
        const newMatches = [...(t.matches || [])];
        
        // A. Figer le score du match actuel
        const mIdx = newMatches.findIndex(m => m.id === activeMatch.id);
        if (mIdx > -1) {
          newMatches[mIdx] = { ...newMatches[mIdx], status: 'finished', scoreA, scoreB, savedStatsA: playersA, savedStatsB: playersB };
        }
        
        // B. Afficher le gagnant dans la case suivante
        if (winnerId && nextMatchId) {
           const nIdx = newMatches.findIndex(m => m.id === nextMatchId);
           if (nIdx > -1) {
             const nextSlotDb = nextSlot === 'teamA' ? 'team_a' : 'team_b';
             // On force la mise à jour pour React
             newMatches[nIdx] = { ...newMatches[nIdx], [nextSlotDb]: String(winnerId), [nextSlot]: String(winnerId) };
           }
        }
        return { ...t, matches: newMatches };
      }
      return t;
    }));

    localStorage.removeItem(`basketMatchSave_${activeMatch.id}`);
    setActiveMatch(null);
    setView('tournament');
  };

  const syncLiveScore = async (newScoreA, newScoreB) => {
    if (!activeMatch) return;
    
    // V2 : Mise à jour super légère en BDD ! Fin du problème TOAST.
    await supabase.from('matches').update({ 
      score_a: newScoreA, 
      score_b: newScoreB 
    }).eq('id', activeMatch.id);
  };

  // --- DISTRIBUTION DU NUAGE ---
  return (
    <AppContext.Provider value={{
      userRole, setUserRole,
      userSubscription, setUserSubscription,
      tournaments, setTournaments,
      activeTourneyId, setActiveTourneyId,
      currentTourney,
      view, setView,
      activeMenu, setActiveMenu,
      // 🏀 Les nouveautés :
      
      activeMatch, setActiveMatch,
      launchMatch, finishMatch, syncLiveScore,
      confirmData, setConfirmData, closeConfirm,
      promptData, setPromptData, closePrompt

    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);