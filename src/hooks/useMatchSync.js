import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function useMatchSync(
  matchId,
  canEdit,
  state,       // Les variables d'état actuelles
  setters,     // Les fonctions pour modifier l'état
  stateRef     // La référence pour avoir l'état instantané
) {
  // 1. État de la connexion réseau
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // 2. Ref pour éviter les boucles infinies de mise à jour réseau
  const isRemoteUpdate = useRef(false);

  // --- GESTION DU RÉSEAU ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- ÉCOUTE SUPABASE (RÉCEPTION) ---
  useEffect(() => {
    const channel = supabase.channel(`match_live_${matchId}`);
    
    channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
      if (canEdit) isRemoteUpdate.current = true; 
      setters.setPlayersA(payload.playersA);
      setters.setPlayersB(payload.playersB);
      setters.setTime(payload.time);
      setters.setPeriod(payload.period);
      setters.setHistory(payload.history);
      setters.setIsRunning(payload.isRunning);
      
      // 👇 AJOUT : On met à jour la possession chez le spectateur
      if (payload.possession !== undefined) setters.setPossession(payload.possession);

      // Si la tablette principale a déjà validé, on ferme le panneau ici aussi !
      if (payload.startersValidated || payload.history?.length > 0 || payload.playersA?.some(p => p.status === 'court')) {
          setters.setStartersValidated(true);
          setters.setActiveAction(prev => prev?.type === 'STARTERS' ? null : prev);
      }
    });

    if (canEdit) {
      channel.on('broadcast', { event: 'request_sync' }, () => {
        // On répond à l'appel même si le match est à 0-0 mais que le 5 majeur est prêt
        const hasStarted = stateRef.current.history.length > 0 || stateRef.current.playersA.some(p => p.points > 0) || stateRef.current.startersValidated;
        if (hasStarted) {
            channel.send({
              type: 'broadcast', event: 'sync',
              payload: stateRef.current
            });
        }
      });
    }

    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' && canEdit) {
            channel.send({ type: 'broadcast', event: 'request_sync' });
        }
    });

    return () => { supabase.removeChannel(channel); };
  }, [matchId, canEdit]);

  // --- ÉMISSION SUPABASE (ENVOI) ---
  useEffect(() => {
    if (canEdit && isOnline) {
      if (isRemoteUpdate.current) {
         isRemoteUpdate.current = false;
         return;
      }
      supabase.channel(`match_live_${matchId}`).send({
        type: 'broadcast', event: 'sync',
        payload: { 
          playersA: state.playersA, 
          playersB: state.playersB, 
          time: state.time, 
          period: state.period, 
          history: state.history, 
          isRunning: state.isRunning, 
          startersValidated: state.startersValidated,
          possession: state.possession // 👇 AJOUT : On envoie la possession dans le payload
        }
      });
    }
  }, [
    canEdit, isOnline, matchId, 
    state.playersA, state.playersB, state.time, 
    state.period, state.history, state.isRunning, state.startersValidated,
    state.possession // 👇 AJOUT : On déclenche l'envoi quand la possession change
  ]);

  return { isOnline };
}