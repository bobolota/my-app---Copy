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
      const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
      if (!error && data) setTournaments(data);
    } catch (error) {
      console.error("Erreur de chargement des tournois:", error);
    }
  };

  // 4. Ton écouteur en temps réel pour les tournois
  useEffect(() => {
    const channel = supabase
      .channel('tournaments_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, (payload) => {
          if (payload.new) {
            setTournaments(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
          }
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

  
  // --- 🏀 LOGIQUE DE MATCH (Importée depuis App.jsx) ---
  const launchMatch = (matchId) => {
    if (!currentTourney) return;
    setActiveMatch(null); // On vide pour forcer le reset visuel
    setTimeout(() => {
      let match = currentTourney.schedule?.find(m => m.id === matchId);
      if (!match && currentTourney.playoffs) {
        match = currentTourney.playoffs.matches?.find(m => m.id === matchId);
      }
      if (match) {
        setActiveMatch({ ...match, tourneyId: activeTourneyId });
        setView('match');
      }
    }, 10);
  };

  const finishMatch = async (scoreA, scoreB, playersA, playersB) => {
    if (!activeMatch) return;
    const tourney = tournaments.find(t => t.id === activeMatch.tourneyId);
    if (!tourney) return;

    const isPoolMatch = tourney.schedule && tourney.schedule.some(m => m.id === activeMatch.id);
    let newSchedule = tourney.schedule ? [...tourney.schedule] : [];
    let newPlayoffs = tourney.playoffs ? JSON.parse(JSON.stringify(tourney.playoffs)) : null;

    if (isPoolMatch) {
      newSchedule = newSchedule.map(m => 
        m.id === activeMatch.id ? { ...m, status: 'finished', scoreA, scoreB, savedStatsA: playersA, savedStatsB: playersB } : m
      );
    } else if (newPlayoffs && newPlayoffs.matches) {
      newPlayoffs.matches = newPlayoffs.matches.map(m => 
        m.id === activeMatch.id ? { ...m, status: 'finished', scoreA, scoreB, savedStatsA: playersA, savedStatsB: playersB } : m
      );
    }

    const updatedTourney = { ...tourney, schedule: newSchedule, playoffs: newPlayoffs };
    const { error } = await supabase.from('tournaments').update({
      schedule: newSchedule,
      playoffs: newPlayoffs
    }).eq('id', updatedTourney.id);

    if (error) {
      toast.error("Erreur réseau lors de la sauvegarde du match !");
      return;
    }

    setTournaments(prev => prev.map(t => t.id === updatedTourney.id ? updatedTourney : t));
    localStorage.removeItem(`basketMatchSave_${activeMatch.id}`);
    setActiveMatch(null);
    setView('tournament');
  };

  const syncLiveScore = async (newScoreA, newScoreB) => {
    if (!activeMatch) return;
    const tourney = tournaments.find(t => t.id === activeMatch.tourneyId);
    if (!tourney) return;
    
    const isPoolMatch = tourney.schedule && tourney.schedule.some(m => m.id === activeMatch.id);
    if (isPoolMatch) {
      const newSchedule = tourney.schedule.map(m => 
        m.id === activeMatch.id ? { ...m, scoreA: newScoreA, scoreB: newScoreB } : m
      );
      await supabase.from('tournaments').update({ schedule: newSchedule }).eq('id', tourney.id);
    } else if (tourney.playoffs && tourney.playoffs.matches) {
      const newPlayoffMatches = tourney.playoffs.matches.map(m => 
        m.id === activeMatch.id ? { ...m, scoreA: newScoreA, scoreB: newScoreB } : m
      );
      await supabase.from('tournaments').update({ playoffs: { ...tourney.playoffs, matches: newPlayoffMatches } }).eq('id', tourney.id);
    }
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