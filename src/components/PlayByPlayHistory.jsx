import React from 'react';

export default function PlayByPlayHistory({ history, playersA, playersB, isMatchOver, canEdit, onDeleteActionClick }) {
  return (
    <div className="mt-12 bg-[#111] border border-[#222] p-5 rounded-xl shadow-lg">
      <h3 className="text-white border-b border-[#333] pb-3 mb-5 text-lg font-bold">🗓️ Play-by-Play (Historique)</h3>
      <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {history.length === 0 ? (
          <p className="text-center text-[#666] italic py-5">Aucune action enregistrée</p>
        ) : (
          history.map((act, i) => {
            const teamPlayers = act.team === 'A' ? playersA : playersB;
            const playerInfo = teamPlayers.find(p => p.id === act.playerId);
            const actionColor = act.team === 'A' ? 'var(--accent-orange)' : 'var(--accent-blue)';
            
            return (
              <div key={i} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-md border-l-4 hover:bg-[#222] transition-colors" style={{ borderLeftColor: actionColor }}>
                <div className="flex items-center gap-4">
                  <div className="w-16 text-center font-mono text-xs">
                    <strong className="text-white block">{act.period}</strong> 
                    <span className="text-[#888]">{Math.floor(act.time/60)}:{act.time%60 < 10 ? '0'+act.time%60 : act.time%60}</span>
                  </div>
                  
                  <div className="text-sm font-bold tracking-wide">
                    {act.type === 'SUB' && <span className="text-[#aaa]">🔄 REMPLACEMENT <span className="text-xs font-normal text-[#666] ml-2 block sm:inline">{act.details}</span></span>}
                    
                    {act.type === 'SCORE' && (
                      <span style={{ color: actionColor }}>
                        {act.value === 1 ? '🎯 LF RÉUSSI (+1)' : act.value === 3 ? '🔥 3 PTS RÉUSSI (+3)' : '🏀 TIR RÉUSSI (+2)'} 
                        <strong className="text-white ml-2">#{playerInfo?.number} {playerInfo?.name}</strong>
                      </span>
                    )}
                    
                    {act.type === 'MISS' && (
                      <span className="text-[#777]">
                        {act.value === 1 ? '❌ LF MANQUÉ' : act.value === 3 ? '❌ 3 PTS MANQUÉ' : '❌ TIR MANQUÉ'} 
                        <strong className="text-[#aaa] ml-2">#{playerInfo?.number} {playerInfo?.name}</strong>
                      </span>
                    )}
                    
                    {!['SUB', 'SCORE', 'MISS'].includes(act.type) && (
                      <span style={{ color: actionColor }}>
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
                    className="text-[#555] bg-transparent border-none text-xl cursor-pointer hover:text-[var(--danger)] p-2 transition-colors" 
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