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
    prevProps.pendingSubs === nextProps.pendingSubs
  );
};

const PlayerCard = React.memo(({ team, player, onPlayerClick, pendingSubs, pendingAction, onConfirm, hasGlobalAction, pendingAssist, activeActionType, canEdit }) => {
  const isSubSelected = pendingSubs && pendingSubs.includes(player.id);
  const isPendingScore = pendingAction?.playerId === player.id;
  
  const isExcluded = player.fouls >= 5 || (player.techFouls || 0) >= 2 || (player.antiFouls || 0) >= 2 || player.isDisqualified;
  let excluReason = '5 FAUTES';
  if (player.isDisqualified) excluReason = 'DISQ';
  else if ((player.techFouls || 0) >= 2 || (player.antiFouls || 0) >= 2) excluReason = 'EXCLU';

  let isTargetable = false;
  if (canEdit) {
    if (activeActionType === 'STARTERS') isTargetable = true;
    else if (activeActionType === 'SUB') isTargetable = !(isExcluded && player.status === 'bench');
    else if (pendingAssist) isTargetable = (team === pendingAssist.team && player.id !== pendingAssist.scorerId && player.status === 'court');
    else if (hasGlobalAction) isTargetable = (player.status === 'court' && !isPendingScore);
  }

  const minorStats = [
    { label: 'AS', val: player.ast },
    { label: 'RB', val: (player.oreb || 0) + (player.dreb || 0) },
    { label: 'ST', val: player.stl },
    { label: 'BL', val: player.blk },
    { label: 'TO', val: player.tov }
  ].filter(s => s.val > 0);

  // Génération dynamique des classes Tailwind pour le PlayerCard
  const statusClasses = player.status === 'bench' 
    ? 'opacity-60 scale-95 grayscale-[40%] border-[#222] shadow-none' 
    : `opacity-100 scale-100 grayscale-0 border ${team === 'A' ? 'border-[var(--accent-orange)] shadow-[0_4px_12px_rgba(255,107,0,0.15)]' : 'border-[var(--accent-blue)] shadow-[0_4px_12px_rgba(0,212,255,0.15)]'}`;

  return (
    <div 
        className={`relative bg-[#222] rounded-lg p-2 flex flex-col justify-between overflow-hidden transition-all duration-300 ease-in-out select-none ${isSubSelected ? 'ring-2 ring-[var(--accent-purple)] bg-[rgba(157,78,221,0.15)]' : ''} ${isPendingScore ? 'ring-2 ring-white bg-[rgba(255,255,255,0.1)]' : ''} ${isTargetable ? 'cursor-pointer hover:-translate-y-1' : ''} ${(isExcluded && player.status === 'bench') ? 'opacity-30 grayscale pointer-events-none' : ''} ${statusClasses}`} 
        onClick={() => isTargetable && onPlayerClick(activeActionType, team, player.id, null)}
    >
      {isExcluded && <div className="absolute top-0 right-0 bg-[var(--danger)] text-white text-[0.6rem] font-bold px-1 py-0.5 rounded-bl-md z-10">{excluReason}</div>}
      
      {/* LIGNE 1 : Numéro, Nom, Temps */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-black text-[#555] bg-black px-1.5 py-0.5 rounded">{player.number}</span>
        <span className="text-sm font-bold text-white truncate max-w-[80px]" title={player.name}>{player.name}</span>
        <span className="text-[0.65rem] font-bold text-[#888]">{`${Math.floor(player.timePlayed / 60).toString().padStart(2, '0')}:${(player.timePlayed % 60).toString().padStart(2, '0')}`}</span>
      </div>

      {/* LIGNE 2 : Points et Points de Fautes */}
      <div className="flex justify-between items-center bg-[#1a1a1a] rounded px-2 py-1 mb-1">
        <span className="text-xl font-black text-white">{player.points} <span className="text-[0.65rem] text-[#888] font-bold">PTS</span></span>
        <div className="flex gap-[2px]">
          {[0, 1, 2, 3, 4].map(idx => {
            const isFilled = idx < player.fouls;
            const isDanger = isExcluded && idx === (player.fouls - 1);
            return <div key={idx} className={`w-2 h-2 rounded-full border border-[#555] ${isFilled ? (isDanger ? 'bg-[var(--danger)] border-[var(--danger)] shadow-[0_0_5px_var(--danger)]' : 'bg-[var(--accent-orange)] border-[var(--accent-orange)]') : 'bg-transparent'}`}></div>;
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
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-2 z-20 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
          <button className="w-10 h-10 rounded-full border-2 border-[var(--success)] bg-transparent text-[var(--success)] font-bold text-lg hover:bg-[var(--success)] hover:text-white transition-colors cursor-pointer" onClick={() => onConfirm('VALIDATED')}>V</button>
          <button className="w-10 h-10 rounded-full border-2 border-[var(--danger)] bg-transparent text-[var(--danger)] font-bold text-lg hover:bg-[var(--danger)] hover:text-white transition-colors cursor-pointer" onClick={() => onConfirm('MISSED')}>X</button>
        </div>
      )}
    </div>
  );
}, playerCardAreEqual); 

export default PlayerCard;