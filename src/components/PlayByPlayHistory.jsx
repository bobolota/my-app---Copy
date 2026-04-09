import React from 'react';

export default function PlayByPlayHistory({ history, playersA, playersB, isMatchOver, canEdit, onDeleteActionClick }) {
  
  return (
    // bg-app-bg et border-muted-line
    <div className="mt-12 bg-app-bg border border-muted-line p-5 rounded-xl shadow-lg">
      <h3 className="text-white border-b border-muted-line pb-3 mb-5 text-lg font-bold">🗓️ Play-by-Play (Historique)</h3>
      <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {history.length === 0 ? (
          <p className="text-center text-muted italic py-5">Aucune action enregistrée</p>
        ) : (
          history.map((act, i) => {
            const teamPlayers = act.team === 'A' ? playersA : playersB;
            const playerInfo = teamPlayers.find(p => p.id === act.playerId);
            
            // On détermine la classe couleur selon l'équipe
            const actionColorClass = act.team === 'A' ? 'text-secondary' : 'text-action';
            const actionBorderClass = act.team === 'A' ? 'border-l-secondary' : 'border-l-action';
            
            return (
              <div key={i} className={`flex justify-between items-center bg-app-card p-3 rounded-md border-l-4 hover:bg-muted-dark/30 transition-colors ${actionBorderClass}`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 text-center font-mono text-xs">
                    <strong className="text-white block">{act.period}</strong> 
                    <span className="text-muted">{Math.floor(act.time/60)}:{act.time%60 < 10 ? '0'+act.time%60 : act.time%60}</span>
                  </div>
                  
                  <div className="text-sm font-bold tracking-wide">
                    {act.type === 'SUB' && <span className="text-muted-light">🔄 REMPLACEMENT <span className="text-xs font-normal text-muted-dark ml-2 block sm:inline">{act.details}</span></span>}
                    
                    {/* 👇 AFFICHAGE SIMPLE DES TIRS RÉUSSIS 👇 */}
                    {act.status === 'SCORE' && (
                      <span className={actionColorClass}>
                        {act.type === 'FT' ? '🎯 LF RÉUSSI' : 
                         act.value === 1 ? '🏀 1 PT RÉUSSI' : 
                         act.value === 2 ? '🏀 2 PTS RÉUSSI' : 
                         '🔥 3 PTS RÉUSSI'} 
                        <strong className="text-white ml-2">#{playerInfo?.number} {playerInfo?.name}</strong>
                      </span>
                    )}
                    
                    {/* 👇 AFFICHAGE SIMPLE DES TIRS MANQUÉS 👇 */}
                    {act.status === 'MISS' && (
                      <span className="text-muted-dark">
                        {act.type === 'FT' ? '❌ LF MANQUÉ' : 
                         act.value === 1 ? '❌ 1 PT MANQUÉ' : 
                         act.value === 2 ? '❌ 2 PTS MANQUÉ' : 
                         '❌ 3 PTS MANQUÉ'} 
                        <strong className="text-muted ml-2">#{playerInfo?.number} {playerInfo?.name}</strong>
                      </span>
                    )}
                    
                    {/* AUTRES ACTIONS (Fautes, Rebonds...) */}
                    {act.status !== 'SCORE' && act.status !== 'MISS' && act.type !== 'SUB' && (
                      <span className={actionColorClass}>
                        {act.type === 'TIMEOUT' ? '⏱️ TEMPS MORT' : 
                         act.type === 'FOUL' ? `⚠️ FAUTE ${act.foulType === 'PO' ? 'OFFENSIVE' : act.foulType === 'T' ? 'TECHNIQUE' : act.foulType === 'U' ? 'ANTISPORTIVE' : act.foulType === 'D' ? 'DISQUALIFIANTE' : 'PERSONNELLE'}` :
                         `${act.type === 'AST' ? '🤝 PASS D.' : act.type === 'OREB' ? '🛡️ REB OFF' : act.type === 'DREB' ? '🛡️ REB DEF' : act.type === 'STL' ? '🥷 INTERCEPTION' : act.type === 'BLK' ? '🧱 CONTRE' : act.type === 'TOV' ? '🗑️ BALLE PERDUE' : act.type}`}
                         
                         {act.type !== 'TIMEOUT' && <strong className="text-white ml-2">#{playerInfo?.number} {playerInfo?.name}</strong>}
                      </span>
                    )}
                  </div>
                </div>
                
                {(!isMatchOver && canEdit) && (
                  <button 
                    onClick={() => onDeleteActionClick(i)} 
                    className="text-muted-dark bg-transparent border-none text-xl cursor-pointer hover:text-danger p-2 transition-colors" 
                    title="Supprimer l'action"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}