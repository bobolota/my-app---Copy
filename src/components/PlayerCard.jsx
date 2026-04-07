import React from 'react';

const playerCardAreEqual = (prevProps, nextProps) => {
  return (
    prevProps.player === nextProps.player &&
    prevProps.team === nextProps.team &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.hasGlobalAction === nextProps.hasGlobalAction &&
    prevProps.activeActionType === nextProps.activeActionType &&
    prevProps.pendingAssist === nextProps.pendingAssist &&
    prevProps.pendingAction === nextProps.pendingAction &&
    prevProps.pendingSubs === nextProps.pendingSubs &&
    prevProps.pendingFoul === nextProps.pendingFoul &&
    prevProps.isForcedSub === nextProps.isForcedSub
  );
};

const PlayerCard = React.memo(({ team, player, onPlayerClick, pendingSubs, pendingAction, onConfirm, hasGlobalAction, pendingAssist, activeActionType, canEdit, pendingFoul, isForcedSub, maxFouls }) => {
  
  // --- FORCER LE MODE "SUB" SI SORTIE OBLIGATOIRE ---
  const effectiveActionType = isForcedSub ? 'SUB' : activeActionType;

  const isSubSelected = pendingSubs && pendingSubs.includes(player.id);
  const isPendingScore = pendingAction?.playerId === player.id;
  const isPendingFoul = pendingFoul?.playerId === player.id;
  
  const isExcluded = player.fouls >= maxFouls || (player.techFouls || 0) >= 2 || (player.antiFouls || 0) >= 2 || player.isDisqualified;
  let excluReason = `${maxFouls} FAUTES`;
  if (player.isDisqualified) excluReason = 'DISQ';
  else if ((player.techFouls || 0) >= 2 || (player.antiFouls || 0) >= 2) excluReason = 'EXCLU';

  // 1. ON IDENTIFIE LE JOUEUR QUI DOIT OBLIGATOIREMENT SORTIR
  const isMustLeave = isForcedSub && isExcluded && player.status === 'court';

  // --- LOGIQUE : EST-IL CIBLABLE ? ---
  let isTargetable = false;
  if (canEdit) {
    if (effectiveActionType === 'STARTERS') { 
      isTargetable = true;
    } else if (effectiveActionType === 'SUB') { 
      if (isForcedSub) {
        // VERROUILLAGE : Seuls les joueurs du banc non-exclus sont cliquables
        isTargetable = (player.status === 'bench' && !isExcluded);
      } else {
        // Changement normal
        isTargetable = !(isExcluded && player.status === 'bench');
      }
    } else if (pendingAssist) {
      isTargetable = (team === pendingAssist.team && player.id !== pendingAssist.scorerId && player.status === 'court');
    } else if (hasGlobalAction) {
      isTargetable = (player.status === 'court' && !isPendingScore);
    }
  }

  const minorStats = [
    { label: 'AS', val: player.ast },
    { label: 'RB', val: (player.oreb || 0) + (player.dreb || 0) },
    { label: 'ST', val: player.stl },
    { label: 'BL', val: player.blk },
    { label: 'TO', val: player.tov }
  ].filter(s => s.val > 0);

  // --- GÉNÉRATION DYNAMIQUE DES CLASSES VISUELLES ---
  
  // 1. Transparence de base (Terrain vs Banc)
  const baseStatusClasses = player.status === 'bench' 
    ? 'opacity-60 grayscale-[40%] shadow-none' 
    : `opacity-100 grayscale-0 border ${team === 'A' ? 'border-[var(--accent-orange)] shadow-[0_4px_12px_rgba(255,107,0,0.1)]' : 'border-[var(--accent-blue)] shadow-[0_4px_12px_rgba(0,212,255,0.1)]'}`;

  // 2. Superposition des effets prioritaires
  let priorityClasses = '';
  
  if (isPendingFoul) {
    priorityClasses = 'ring-4 ring-red-500 bg-red-500/20 shadow-[0_0_25px_rgba(239,68,68,0.6)] z-10 scale-105';
  } else if (isMustLeave) {
    // ALERTE VISUELLE : Le joueur fautif clignote en rouge vif
    priorityClasses = 'ring-4 ring-red-600 bg-red-600/30 shadow-[0_0_30px_rgba(239,68,68,0.8)] z-10 animate-pulse';
  } else if (isPendingScore) {
    priorityClasses = 'ring-4 ring-white bg-white/10 z-10 scale-105';
  } else if (isSubSelected) {
    priorityClasses = 'ring-4 ring-[var(--accent-purple)] bg-[rgba(157,78,221,0.2)] z-10 scale-105';
  } else if (isTargetable) {
    priorityClasses = 'cursor-pointer hover:-translate-y-1 ring-2 ring-white/50 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.2)]';
  }

  // 3. Cas de l'exclusion sur le banc (Grisé total)
  if (isExcluded && player.status === 'bench') {
    priorityClasses = 'opacity-30 grayscale pointer-events-none';
  }

  // Fusion finale des classes
  const finalClasses = `relative bg-[#222] rounded-lg p-2 flex flex-col justify-between overflow-hidden transition-all duration-300 ease-in-out select-none ${baseStatusClasses} ${priorityClasses}`;

  return (
    <div 
        className={finalClasses} 
        onClick={() => isTargetable && onPlayerClick(effectiveActionType, team, player.id, null)}
    >
      {isExcluded && <div className="absolute top-0 right-0 bg-[var(--danger)] text-white text-[0.6rem] font-bold px-1 py-0.5 rounded-bl-md z-10">{excluReason}</div>}
      
      {/* LIGNE 1 : Numéro, Nom, Temps */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-black text-[#555] bg-black px-1.5 py-0.5 rounded">{player.number}</span>
        <span className="text-sm font-bold text-white truncate max-w-[80px]" title={player.name}>{player.name}</span>
        <span className="text-[0.65rem] font-bold text-[#888]">{`${Math.floor(player.timePlayed / 60).toString().padStart(2, '0')}:${(player.timePlayed % 60).toString().padStart(2, '0')}`}</span>
      </div>

      {/* LIGNE 2 : Points et Fautes (Séparés sur deux lignes) */}
      <div className="flex flex-col items-center bg-[#1a1a1a] rounded py-1.5 mb-1 gap-1.5">
        
        {/* LIGNE 2A : Les Points au centre */}
        <span className="text-xl font-black text-white leading-none">
          {player.points} <span className="text-[0.65rem] text-[#888] font-bold ml-0.5">PTS</span>
        </span>
        
        {/* LIGNE 2B : Les Fautes en dessous (Générées dynamiquement) */}
        <div className="flex gap-1.5">
          {[...Array(maxFouls)].map((_, idx) => {
            const isFilled = idx < player.fouls;
            const isDanger = isExcluded && idx === (player.fouls - 1);
            const foulLetter = player.foulTypes && player.foulTypes[idx] ? player.foulTypes[idx] : 'P';
            
            return (
              <div 
                key={idx} 
                className={`w-[16px] h-[16px] flex items-center justify-center rounded-[3px] text-[10px] font-normal transition-colors ${
                  isFilled 
                    ? (isDanger 
                        ? 'bg-[var(--danger)] border border-[var(--danger)] text-white shadow-[0_0_5px_var(--danger)]' 
                        : 'bg-white border border-white text-black') 
                    : 'bg-[#111] border border-[#444] text-transparent'
                }`}
              >
                {isFilled ? foulLetter : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* LIGNE 3 : Stats mineures */}
      <div className="flex justify-center gap-2 flex-wrap text-[0.65rem] font-bold text-[#aaa] mt-1">
        {minorStats.length === 0 ? (
          <span className="text-[#444]">Aucune stat</span>
        ) : (
          minorStats.map((stat, i) => (
            <span key={i}>{stat.label}: <span className="text-white">{stat.val}</span></span>
          ))
        )}
      </div>

      {/* VALIDATION SCORE OVERLAY */}
      {isPendingScore && canEdit && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 z-20 backdrop-blur-md px-3" onClick={e => e.stopPropagation()}>
          
          {/* Boutons clairs et explicites */}
          <button 
            className="w-full py-2 rounded border border-emerald-500 bg-emerald-500/20 text-emerald-400 font-black text-xs tracking-widest uppercase hover:bg-emerald-500 hover:text-black transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
            onClick={() => onConfirm('VALIDATED')}
          >
            🎯 Marqué
          </button>
          
          <button 
            className="w-full py-2 rounded border border-red-500 bg-red-500/20 text-red-400 font-black text-xs tracking-widest uppercase hover:bg-red-400 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]" 
            onClick={() => onConfirm('MISSED')}
          >
            ❌ Raté
          </button>
          
          </div>
      )}
    </div>
  );
}, playerCardAreEqual); 

export default PlayerCard;