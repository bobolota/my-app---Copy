import React from 'react';
import toast from 'react-hot-toast';

export default function ActionPanel({
  activeAction, setActiveAction,
  pendingFoul, setPendingFoul, handleConfirmFoul,
  pendingAssist, setPendingAssist,
  isForcedSub, 
  handleConfirmSubs, 
  pendingSubs,
  pendingAction, setPendingAction,
  setPendingSubs,
  playersA, playersB, setStartersValidated,
  courtSize, pointsSystem 
}) {
  
  const resetAll = () => {
    if (isForcedSub) return;
    setActiveAction(null);
    setPendingFoul(null);
    setPendingAssist(null);
    if (setPendingAction) setPendingAction(null);
    if (setPendingSubs) setPendingSubs([]);
  };

  const hasActiveProcess = activeAction || pendingFoul || pendingAssist || pendingAction || pendingSubs?.length > 0 || isForcedSub;
  const isPlayerExcluded = (p) => p.fouls >= 5 || (p.techFouls || 0) >= 2 || (p.antiFouls || 0) >= 2 || p.isDisqualified;

  let availableBenchCount = 0;
  if (isForcedSub) {
    const forcedA = playersA?.find(p => p.status === 'court' && isPlayerExcluded(p));
    if (forcedA) availableBenchCount = playersA.filter(p => p.status === 'bench' && !isPlayerExcluded(p)).length;
    else {
      const forcedB = playersB?.find(p => p.status === 'court' && isPlayerExcluded(p));
      if (forcedB) availableBenchCount = playersB.filter(p => p.status === 'bench' && !isPlayerExcluded(p)).length;
    }
  }
  
  const isMissingRequiredSub = isForcedSub && pendingSubs?.length === 0 && availableBenchCount > 0;
  const canPlayShorthanded = isForcedSub && pendingSubs?.length === 0 && availableBenchCount === 0;
  const btnSizeClass = courtSize === 1 ? 'px-7 text-sm' : 'px-5 text-[11px]'; 

  return (
    <div className="w-full flex items-center justify-center bg-app-bg border border-muted-line p-2 rounded-2xl shadow-xl min-h-[85px]">
      <div className="flex items-center gap-8 px-4">
        
        {isForcedSub ? (
          <div className="flex flex-1 items-center justify-center min-w-[600px]">
             <div className="bg-danger/10 border border-danger/50 rounded-xl px-8 py-3 flex flex-col items-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
               <span className="text-danger font-black text-lg uppercase tracking-widest animate-pulse">
                 🚨 Joueur exclu : Remplacement Obligatoire
               </span>
               <span className="text-white/70 font-bold text-xs mt-1">Sélectionnez un joueur sur le banc puis validez à droite</span>
             </div>
          </div>
        ) : !pendingFoul && !pendingAssist && activeAction?.type !== 'STARTERS' ? (
          <div className="flex items-center gap-6">
            <div className="flex gap-2 bg-secondary/10 p-1.5 rounded-xl border border-secondary/20">
              {(pointsSystem === 'street' || (!pointsSystem && courtSize !== 5)
                ? [ { label: 'LF', type: 'FT', val: 1 }, { label: '+1', type: 'PLUS1', val: 1 }, { label: '+2', type: 'PLUS2', val: 2 } ]
                : [ { label: 'LF', type: 'FT', val: 1 }, { label: '+2', type: 'PLUS2', val: 2 }, { label: '+3', type: 'PLUS3', val: 3 } ]
              ).map(btn => (
                <button 
                  key={btn.type} 
                  className={`w-14 h-12 rounded-lg font-black transition-all ${courtSize === 1 ? 'text-lg' : 'text-sm'} ${activeAction?.type === btn.type ? 'bg-secondary text-white shadow-lg' : 'text-secondary hover:bg-secondary/10'}`}
                  onClick={() => setActiveAction({type: btn.type, value: btn.val})}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="h-10 w-px bg-muted-line"></div>

            <div className="flex gap-2">
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'OREB' ? 'bg-primary text-white' : 'border-primary/20 text-primary hover:bg-primary/10'}`} onClick={() => setActiveAction({type: 'OREB', value: null})}>REB OFF</button>
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'DREB' ? 'bg-primary text-white' : 'border-primary/20 text-primary hover:bg-primary/10'}`} onClick={() => setActiveAction({type: 'DREB', value: null})}>REB DEF</button>
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'STL' ? 'bg-action text-white' : 'border-action/20 text-action hover:bg-action/10'}`} onClick={() => setActiveAction({type: 'STL', value: null})}>INT</button>
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'BLK' ? 'bg-action text-white' : 'border-action/20 text-action hover:bg-action/10'}`} onClick={() => setActiveAction({type: 'BLK', value: null})}>CTR</button>
            </div>

            <div className="h-10 w-px bg-muted-line"></div>

            <div className="flex gap-2">
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'TOV' ? 'bg-muted-dark text-white' : 'border-muted/30 text-muted-light hover:bg-white/5'}`} onClick={() => setActiveAction({type: 'TOV', value: null})}>B. PERDUE</button>
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'FOUL' ? 'bg-danger text-white' : 'border-danger/30 text-danger hover:bg-danger/10'}`} onClick={() => setActiveAction({type: 'FOUL', value: null})}>FAUTE</button>
              {courtSize !== 1 && (
                <button className={`h-12 rounded-lg font-black px-5 text-[11px] border ${activeAction?.type === 'SUB' ? 'bg-purple-600 text-white' : 'border-purple-600/30 text-purple-500 hover:bg-purple-600/10'}`} onClick={() => setActiveAction({type: 'SUB', value: null})}>SUB</button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-w-[500px]">
             {activeAction?.type === 'STARTERS' && (
               <button className="bg-primary text-black px-12 py-3 rounded-xl font-black text-sm" onClick={() => { setActiveAction(null); if (setStartersValidated) setStartersValidated(true); }}>VALIDER LES JOUEURS</button>
             )}
             {pendingFoul && (
               <div className="flex gap-2">
                 {['P', 'PO', 'T', 'U', 'D'].map(f => (
                   <button key={f} className="w-14 h-12 rounded-lg font-black text-lg border-2 border-danger/30 text-danger hover:bg-danger hover:text-white transition-all" onClick={() => handleConfirmFoul(f)}>{f}</button>
                 ))}
               </div>
             )}
            {pendingAssist && (
              <div className="flex items-center gap-4 animate-fadeIn">
                <span className="text-primary-light font-black text-xs uppercase tracking-widest">🏀 Passe décisive ?</span>
                <button onClick={() => setPendingAssist(null)} className="px-4 py-4 bg-muted-dark/30 text-muted-light border border-muted/50 rounded-lg font-black text-[11px] uppercase transition-all">SANS PASSEUR</button>
              </div>
            )}
          </div>
        )}

        {hasActiveProcess && (
          <div className="flex items-center gap-3 border-l border-muted-line pl-8 h-12">
            {((activeAction?.type === 'SUB' && pendingSubs?.length > 0) || isForcedSub) && (
              <button 
                onClick={handleConfirmSubs}
                className={`h-full px-8 text-black rounded-xl font-black text-xs shadow-lg transition-all ${isMissingRequiredSub ? 'bg-muted cursor-not-allowed' : canPlayShorthanded ? 'bg-secondary animate-pulse' : 'bg-primary animate-pulse'}`}
              >
                {canPlayShorthanded ? 'SORTIR SANS REMPLAÇANT' : 'CONFIRMER'}
              </button>
            )}
            {!isForcedSub && !pendingAssist && (
              <button onClick={resetAll} className="h-full px-6 bg-warning text-black rounded-xl font-black text-[10px] flex flex-col items-center justify-center leading-tight shadow-lg">
                <span className="text-xs">✕</span><span>ANNULER</span>
              </button>
            )}
            {isForcedSub && <div className="px-4 text-danger font-black text-[10px] animate-pulse text-center leading-tight">SORTIE<br/>OBLIGATOIRE</div>}
          </div>
        )}
      </div>
    </div>
  );
}