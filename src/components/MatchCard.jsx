import React from 'react';
import toast from 'react-hot-toast';

export default function MatchCard({ match, currentUserName, canEdit, handleLaunchMatch, isPublicScoreboard }) {
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
  const isReady = match.teamA?.players?.length >= 5 && match.teamB?.players?.length >= 5;
  const canClick = isReady || isFinished;
  const phaseLabel = match.group ? `POULE ${match.group}` : (match.label ? match.label.toUpperCase() : 'PHASE FINALE');

  // NOUVELLE LOGIQUE D'AUTORISATION POUR LES SPECTATEURS
  const isSpectator = !canLaunchThisMatch;
  const canSpectateLive = isLive && isPublicScoreboard;
  const canViewStats = isFinished;
  // On bloque l'accès si c'est annulé/forfait, OU si c'est un spectateur qui n'a ni accès au direct, ni aux stats.
  const isLockedForUser = isCanceled || isForfeit || (isSpectator && !canSpectateLive && !canViewStats);

  let statusBadgeClass = 'bg-[#333] text-[#888]';
  if (isLive) statusBadgeClass = 'bg-[rgba(255,107,0,0.15)] text-[var(--accent-orange)] border border-[rgba(255,107,0,0.3)] shadow-[0_0_10px_rgba(255,107,0,0.2)]';
  else if (isFinished) statusBadgeClass = 'bg-[rgba(46,204,113,0.15)] text-[var(--success)]';
  else if (isCanceled) statusBadgeClass = 'bg-[#333] text-[#888] line-through';
  else if (isForfeit) statusBadgeClass = 'bg-[rgba(231,76,60,0.15)] text-[var(--danger)]';

  let statusText = isLive ? '🔥 EN DIRECT' : (isFinished ? '🏁 TERMINÉ' : (isCanceled ? '❌ ANNULÉ' : (isForfeit ? '🏳️ FORFAIT' : 'À VENIR')));

  return (
    <div 
      onClick={() => {
        // Logique de blocage : on empêche l'action si le match est verrouillé pour l'utilisateur
        if (isLockedForUser) {
           if (isSpectator && isLive && !canSpectateLive) {
               toast.error("La diffusion en direct n'est pas activée par l'organisateur.", { id: 'live-locked' });
           } else if (!isFinished && !isCanceled && !isForfeit) {
                // Reste un clic sur un match non prêt
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
      className={`bg-[#1a1a1a] rounded-xl p-5 border transition-all duration-200 flex flex-col gap-4 
          ${isLive && !isLockedForUser ? 'border-[var(--accent-orange)] shadow-[0_5px_15px_rgba(255,107,0,0.15)] cursor-pointer hover:scale-[1.02]' : ''}
          ${canClick && !isCanceled && !isForfeit && !isLockedForUser ? 'border-[#333] hover:border-[var(--accent-blue)] cursor-pointer hover:scale-[1.02]' : ''}
          ${isLockedForUser ? 'border-[#222] opacity-80 cursor-default' : ''}
      `}
    >
      <div className="flex justify-between items-start text-xs font-bold">
        <div className="flex flex-col gap-1.5">
          <span className={`tracking-widest ${match.group ? 'text-[var(--accent-purple)]' : 'text-[var(--accent-blue)]'}`}>
            🏆 {phaseLabel}
          </span>
          <span className="text-gray-400 truncate max-w-[120px]" title={match.court || 'Terrain à définir'}>
            📍 {match.court || 'Terrain à définir'}
          </span>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-[10px] tracking-wider ${statusBadgeClass}`}>
          {statusText}
        </span>
      </div>

      <div className="flex justify-between items-center my-2">
        <div className="flex-1 text-right text-base sm:text-lg font-black text-white truncate px-2" title={match.teamA?.name || 'TBD'}>
          {match.teamA?.name || 'TBD'}
        </div>
        <div className={`px-2 text-2xl font-black ${isUpcoming ? 'text-[#555]' : 'text-white'}`}>
          {isUpcoming ? 'VS' : `${match.scoreA || 0} - ${match.scoreB || 0}`}
        </div>
        <div className="flex-1 text-left text-base sm:text-lg font-black text-white truncate px-2" title={match.teamB?.name || 'TBD'}>
          {match.teamB?.name || 'TBD'}
        </div>
      </div>

      <div className="text-center text-sm text-[#888] border-t border-dashed border-[#333] pt-3 font-bold tracking-widest mt-auto flex flex-col gap-1">
         <span>⏰ {match.time || 'Horaire non défini'}</span>
         {/* Petit indicateur d'action */}
         {isLive && canSpectateLive && <span className="text-[var(--accent-orange)] text-[10px]">Cliquer pour suivre le direct</span>}
         {isFinished && <span className="text-[#aaa] text-[10px]">Cliquer pour voir les stats</span>}
      </div>
    </div>
  );
}