import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient'; // 👈 AJOUTE CECI

// En haut du fichier
import { useAppContext } from '../context/AppContext';

export default function MatchCard({ match, tourney, currentUserName, canEdit, handleLaunchMatch, isPublicScoreboard, update }) {
  
  // 👇 AJOUTE CETTE LIGNE AU TOUT DÉBUT DU COMPOSANT 👇
  const { fetchTournaments, setTournaments } = useAppContext();
  const isFinished = match.status === 'finished';
  const isCanceled = match.status === 'canceled';
  const isForfeit = match.status === 'forfeit';
  
  let hasStarted = match.status === 'ongoing' || match.startersValidated === true;
  if (!hasStarted) {
      try {
          const localSave = localStorage.getItem(`basketMatchSave_${match.id}`);
          if (localSave) hasStarted = JSON.parse(localSave).startersValidated === true;
      } catch(e) {}
  }
  
  const isLive = !isFinished && !isCanceled && !isForfeit && hasStarted;
  const isUpcoming = !isFinished && !isCanceled && !isForfeit && !hasStarted;

  const canLaunchThisMatch = canEdit || (currentUserName && match.otm && match.otm.includes(currentUserName));
  
  // NOUVEAU : On récupère l'équipe "fraîche" depuis le tournoi pour avoir les derniers joueurs ajoutés
  const teamA = tourney?.teams?.find(t => t.id === match.teamA?.id) || match.teamA;
  const teamB = tourney?.teams?.find(t => t.id === match.teamB?.id) || match.teamB;

  // 1. On récupère la taille de l'équipe attendue pour ce tournoi
  const courtSize = parseInt(tourney?.matchsettings?.courtSize) || 5;
  
 // 2. On vérifie la taille avec les équipes FRAÎCHES (teamA et teamB) au lieu de match.teamA
  const isReady = teamA?.players?.length >= courtSize && teamB?.players?.length >= courtSize;
  
  // NOUVEAU : La carte est strictement bloquée pour TOUT LE MONDE si l'effectif est insuffisant
  const canClick = isReady || isFinished;
  const phaseLabel = match.group ? `POULE ${match.group}` : (match.label ? match.label.toUpperCase() : 'PHASE FINALE');

  // LOGIQUE D'AUTORISATION POUR LES SPECTATEURS
  const isSpectator = !canLaunchThisMatch;
  const canSpectateLive = isLive && isPublicScoreboard;
  const canViewStats = isFinished;
  const isLockedForUser = isCanceled || isForfeit || (isSpectator && !canSpectateLive && !canViewStats);

  let statusBadgeClass = 'bg-muted-dark text-muted-light';
  if (isLive) statusBadgeClass = 'bg-secondary/15 text-secondary border border-secondary/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]';
  else if (isFinished) statusBadgeClass = 'bg-primary/15 text-primary border border-primary/20';
  else if (isCanceled) statusBadgeClass = 'bg-muted-dark text-muted-light line-through border border-transparent';
  else if (isForfeit) statusBadgeClass = 'bg-danger/15 text-danger border border-danger/20';

  let statusText = isLive ? '🔥 EN DIRECT' : (isFinished ? '🏁 TERMINÉ' : (isCanceled ? '❌ ANNULÉ' : (isForfeit ? '🏳️ FORFAIT' : 'À VENIR')));

  // --- GESTION MANUELLE DU SCORE ---
  const [isEditingScore, setIsEditingScore] = useState(false);
  const [tempScoreA, setTempScoreA] = useState(match.scoreA || 0);
  const [tempScoreB, setTempScoreB] = useState(match.scoreB || 0);

  // --- GESTION MANUELLE DU SCORE (VERSION BLINDÉE) ---
  const handleSaveScore = async (e) => {
    e.stopPropagation();
    
    // 1. On sécurise les chiffres
    const finalScoreA = parseInt(tempScoreA, 10) || 0;
    const finalScoreB = parseInt(tempScoreB, 10) || 0;

    // 2. Sauvegarde directe dans la base de données
    const { error } = await supabase.from('matches').update({
      score_a: finalScoreA,
      score_b: finalScoreB,
      status: 'finished'
      // 🚨 On a supprimé 'startersValidated: true' qui faisait planter la BDD
    }).eq('id', match.id);

    if (error) {
      toast.error("Erreur réseau lors de la sauvegarde !");
      return;
    }

    // 3. Mise à jour de l'affichage instantané (Optimistic UI)
    if (update && tourney) {
      const newMatches = (tourney.matches || []).map(m => 
        m.id === match.id ? { ...m, scoreA: finalScoreA, scoreB: finalScoreB, score_a: finalScoreA, score_b: finalScoreB, status: 'finished' } : m
      );
      update({ matches: newMatches });
    }

    // 4. LA FRAPPE ATOMIQUE : On force l'app entière à se synchroniser
    if (fetchTournaments) {
      await fetchTournaments();
    } else if (setTournaments) {
      setTournaments(prev => [...prev]);
    }
    
    // On ferme les cases
    setIsEditingScore(false);
    toast.success("Score validé sur le planning ! ✅");
  };

  const currentDt = match.datetime ? match.datetime.replace(' ', 'T') : '';
  const [currentDateStr, currentTimeStr] = currentDt.split('T');
  const dateVal = currentDateStr || '';
  const timeVal = currentTimeStr ? currentTimeStr.substring(0, 5) : '';

  // --- GESTION DE L'HEURE, DATE ET TERRAIN (V2 BDD) ---
  const handleDateTimeChange = async (field, value) => {
    let d = dateVal;
    let t = timeVal;
    let c = match.court || '';
    
    if (field === 'date') d = value;
    if (field === 'time') t = value;
    if (field === 'court') c = value;

    const newDatetime = d ? `${d}T${t || '00:00'}` : null;
    
    // 1. Sauvegarde directe dans la BDD
    await supabase.from('matches').update({
      datetime: newDatetime,
      court: c
    }).eq('id', match.id);

    // 2. Mise à jour de l'affichage
    const newMatches = (tourney.matches || []).map(m => 
      m.id === match.id ? { ...m, datetime: newDatetime, court: c } : m
    );
    update({ matches: newMatches });
  };

  return (
    <div 
      onClick={() => {
        if (isEditingScore) return; // 👈 NOUVEAU: Bloque le clic global si on est en train d'éditer
        
        if (isLockedForUser) {
           if (isSpectator && isLive && !canSpectateLive) {
               toast.error("La diffusion en direct n'est pas activée par l'organisateur.", { id: 'live-locked' });
           } else if (!isFinished && !isCanceled && !isForfeit) {
                toast.error("Match indisponible : les équipes sont incomplètes ou le match n'a pas commencé.", { id: 'not-ready' });
           }
           return;
        }

        if (!canClick && !['canceled', 'forfeit'].includes(match.status)) {
          toast.error("Match indisponible : les équipes sont incomplètes.");
          return;
        }
        
        handleLaunchMatch(match.id, canLaunchThisMatch);
      }}
      className={`bg-app-card rounded-xl p-5 border transition-all duration-200 flex flex-col gap-4 relative overflow-hidden
          ${isLive && !isLockedForUser ? 'border-secondary shadow-[0_5px_15px_rgba(249,115,22,0.15)] cursor-pointer hover:scale-[1.02]' : ''}
          ${canClick && !isCanceled && !isForfeit && !isLockedForUser && !isEditingScore ? 'border-muted-line hover:border-action cursor-pointer hover:scale-[1.02]' : ''}
          ${isLockedForUser || isEditingScore ? 'border-muted-dark opacity-80 cursor-default' : ''}
      `}
    >
      
      {/* 📅 GESTION DE LA DATE ET L'HEURE */}
      <div className="flex justify-between items-start pb-3 border-b border-muted-line">
        {canEdit && !isFinished && !isCanceled && !isForfeit ? (
          <div className="flex flex-wrap items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
            <input 
              type="date" 
              value={dateVal}
              onChange={(e) => handleDateTimeChange('date', e.target.value)}
              className="bg-app-input border border-muted-line text-secondary text-xs p-1.5 rounded-lg focus:outline-none focus:border-secondary transition-colors cursor-pointer font-black tracking-wider shadow-inner w-[135px]"
              title="Date du match"
            />
            <input 
              type="time" 
              value={timeVal}
              onChange={(e) => handleDateTimeChange('time', e.target.value)}
              className="bg-app-input border border-muted-line text-white text-xs p-1.5 rounded-lg focus:outline-none focus:border-secondary transition-colors cursor-pointer font-black tracking-wider shadow-inner w-[70px]"
              title="Heure du match"
            />
            {/* NOUVEAU : Champ pour le Terrain (Correction de la frappe) */}
            <input 
              type="text" 
              placeholder="Terrain..."
              defaultValue={match.court || ''}
              key={`court-card-${match.id}-${match.court || ''}`}
              onBlur={(e) => {
                  if (e.target.value !== match.court) {
                      handleDateTimeChange('court', e.target.value);
                  }
              }}
              onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur(); // Sauvegarde instantanée si on tape "Entrée"
              }}
              className="bg-app-input border border-muted-line text-white text-xs p-1.5 rounded-lg focus:outline-none focus:border-action transition-colors shadow-inner flex-1 min-w-[70px]"
              title="Terrain (ex: Court 1, Gymnase Nord...)"
            />
          </div>
        ) : match.datetime ? (
          <div className="flex items-center gap-1 bg-secondary/10 border border-secondary/20 w-fit px-2 py-1 rounded-lg shadow-sm">
            <span className="text-[10px]">📅</span>
            <span className="text-secondary text-[10px] font-black uppercase tracking-widest">
              {new Date(match.datetime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </span>
            <span className="text-white text-[10px] font-black bg-secondary px-1.5 py-0.5 rounded ml-1">
              {new Date(match.datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'H')}
            </span>
          </div>
        ) : (
          <div className="text-muted-dark text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-muted-line">
            🕒 Horaire à définir
          </div>
        )}
      </div>

      <div className="flex justify-between items-start text-xs font-bold pt-3">
        <div className="flex flex-col gap-2">
          <span className={`tracking-widest ${match.group ? 'text-purple-400' : 'text-action'}`}>
            🏆 {phaseLabel}
          </span>
          {match.court && (
            <span className="bg-black/20 px-2 py-1 rounded-lg border border-muted-line text-muted-light text-[9px] font-black uppercase tracking-widest w-fit" title={match.court}>
              📍 {match.court}
            </span>
          )}
        </div>
        <span className={`px-2.5 py-1 rounded-md text-[10px] tracking-wider ${statusBadgeClass}`}>
          {statusText}
        </span>
      </div>

      {/* AFFICHAGE ET ÉDITION DU SCORE */}
      {isEditingScore ? (
        <div className="flex flex-col gap-3 my-2 bg-app-input p-4 rounded-xl border border-muted-line shadow-inner relative z-10" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center gap-2">
            
            {/* Équipe A */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <span className="text-[10px] text-muted-light font-black uppercase tracking-widest truncate w-full text-center mb-2 px-1">
                {match.teamA?.name || 'Équipe A'}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <input 
                  type="number" 
                  min="0" 
                  value={tempScoreA} 
                  onChange={e => setTempScoreA(e.target.value)} 
                  className="w-12 sm:w-14 p-2 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner text-lg" 
                />
              </div>
            </div>
            
            <span className="text-muted-dark font-black text-xs px-2">VS</span>

            {/* Équipe B */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <span className="text-[10px] text-muted-light font-black uppercase tracking-widest truncate w-full text-center mb-2 px-1">
                {match.teamB?.name || 'Équipe B'}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <input 
                  type="number" 
                  min="0" 
                  value={tempScoreB} 
                  onChange={e => setTempScoreB(e.target.value)} 
                  className="w-12 sm:w-14 p-2 text-center bg-app-panel text-white font-black border border-muted-line rounded-lg focus:outline-none focus:border-secondary shadow-inner text-lg" 
                />
              </div>
            </div>

          </div>

          <div className="flex gap-2 mt-2 pt-3 border-t border-muted-line">
            <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(false); }} className="flex-1 text-[10px] font-bold text-muted hover:text-white py-2.5 transition-colors uppercase tracking-widest cursor-pointer border border-transparent bg-transparent">Annuler</button>
            {/* Note: Assure-toi que ton handleSaveScore dans MatchCard fait bien le parseInt avant d'envoyer à Supabase ! */}
            <button onClick={handleSaveScore} className="flex-1 text-[10px] font-black bg-secondary/20 text-secondary hover:bg-secondary hover:text-white rounded-lg py-2.5 transition-all shadow-md uppercase tracking-widest cursor-pointer border border-secondary/30">Valider</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center my-2 gap-1 relative">
          
          {/* ÉQUIPE A ET SON SCORE */}
          <div className="flex-1 flex items-center justify-end gap-3 pr-2 min-w-0">
            <span 
              className={`text-base sm:text-lg truncate font-black ${isUpcoming ? 'text-white' : (!isCanceled && (match.scoreA ?? match.score_a ?? 0) > (match.scoreB ?? match.score_b ?? 0) ? 'text-primary' : 'text-white')} ${isCanceled ? 'line-through opacity-50' : ''}`}
              title={match.teamA?.name || 'TBD'}
            >
              {match.teamA?.name || 'TBD'}
            </span>
            {!isUpcoming && (
              <span className={`text-xl sm:text-2xl font-black ${!isCanceled && (match.scoreA ?? match.score_a ?? 0) > (match.scoreB ?? match.score_b ?? 0) ? 'text-primary' : 'text-white'} ${isCanceled ? 'opacity-50' : ''}`}>
                {match.scoreA ?? match.score_a ?? 0}
              </span>
            )}
          </div>

          {/* CENTRE : CRAYON (ORGA) OU VS/TIRET (USERS) */}
          <div className="flex items-center justify-center shrink-0 w-10 relative h-10">
            {(canEdit && !['canceled', 'forfeit'].includes(match.status)) ? (
              <div 
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  setIsEditingScore(true); 
                  setTempScoreA(match.scoreA ?? match.score_a ?? 0); 
                  setTempScoreB(match.scoreB ?? match.score_b ?? 0); 
                }}
                className="p-3 sm:p-4 cursor-pointer z-20 group/btn absolute"
                title="Modifier le score manuellement"
              >
                <button 
                  type="button"
                  className="w-8 h-8 rounded-full bg-app-panel border border-muted-line text-muted-light flex items-center justify-center transition-all shadow-md group-hover/btn:scale-110 group-hover/btn:bg-secondary group-hover/btn:text-white group-hover/btn:border-secondary text-xs"
                >
                  ✏️
                </button>
              </div>
            ) : (
              <span className={`font-black ${isUpcoming ? 'text-muted-dark text-lg' : 'text-white text-2xl'} ${isCanceled ? 'opacity-50' : ''}`}>
                {isUpcoming ? 'VS' : '-'}
              </span>
            )}
          </div>

          {/* SCORE ÉQUIPE B ET SON NOM */}
          <div className="flex-1 flex items-center justify-start gap-3 pl-2 min-w-0">
            {!isUpcoming && (
              <span className={`text-xl sm:text-2xl font-black ${!isCanceled && (match.scoreB ?? match.score_b ?? 0) > (match.scoreA ?? match.score_a ?? 0) ? 'text-primary' : 'text-white'} ${isCanceled ? 'opacity-50' : ''}`}>
                {match.scoreB ?? match.score_b ?? 0}
              </span>
            )}
            <span 
              className={`text-base sm:text-lg truncate font-black ${isUpcoming ? 'text-white' : (!isCanceled && (match.scoreB ?? match.score_b ?? 0) > (match.scoreA ?? match.score_a ?? 0) ? 'text-primary' : 'text-white')} ${isCanceled ? 'line-through opacity-50' : ''}`}
              title={match.teamB?.name || 'TBD'}
            >
              {match.teamB?.name || 'TBD'}
            </span>
          </div>
        </div>
      )}
      
       {/* 👈 L'ACCOLADE ET LA BALISE MANQUANTES ÉTAIENT LÀ */}

      <div className="text-center text-sm text-muted border-t border-dashed border-muted-dark pt-3 font-bold tracking-widest mt-auto flex flex-col gap-1">
         {isLive && canSpectateLive && <span className="text-secondary text-[10px]">Cliquer pour suivre le direct</span>}
         {isFinished && <span className="text-muted-light text-[10px]">Cliquer pour voir les stats</span>}
         {isUpcoming && !canEdit && <span className="text-muted-dark text-[10px]">Préparez-vous pour le match</span>}
      </div>
    </div>
  );
}