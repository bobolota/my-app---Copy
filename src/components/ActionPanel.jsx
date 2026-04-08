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
  
  // 👇 NOUVELLES PROPS À RECEVOIR ICI 👇
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

  // 👇 LOGIQUE DYNAMIQUE POUR LE 1v1 ET LE STREETBALL 👇
  const pointButtons = pointsSystem === 'street' ? ['PLUS1', 'PLUS2'] : ['PLUS1', 'PLUS2', 'PLUS3'];
  const btnSizeClass = courtSize === 1 ? 'px-7 text-sm' : 'px-5 text-[11px]'; // Boutons XXL en 1v1

  return (
    <div className="w-full flex items-center justify-center bg-[#0d0d12] border border-white/5 p-2 rounded-2xl shadow-xl min-h-[85px]">
      
      <div className="flex items-center gap-8 px-4">
        
        {/* --- CONSOLE DE SAISIE / VERROUILLAGE --- */}
        {isForcedSub ? (
          <div className="flex flex-1 items-center justify-center min-w-[600px]">
             <div className="bg-red-600/10 border border-red-500/50 rounded-xl px-8 py-3 flex flex-col items-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
               <span className="text-red-500 font-black text-lg uppercase tracking-widest animate-pulse">
                 🚨 Joueur exclu : Remplacement Obligatoire
               </span>
               <span className="text-white/70 font-bold text-xs mt-1">
                 Sélectionnez un joueur sur le banc puis validez à droite
               </span>
             </div>
          </div>
        ) : !pendingFoul && !pendingAssist && activeAction?.type !== 'STARTERS' ? (
          <div className="flex items-center gap-6">
            
            {/* POINTS (S'adapte dynamiquement avec le bouton LF) */}
            <div className="flex gap-2 bg-orange-500/10 p-1.5 rounded-xl border border-orange-500/20">
              
              {/* Le bouton Lancer Franc (Toujours présent, vaut 1 pt) */}
              <button 
                className={`w-14 h-12 rounded-lg font-black transition-all ${courtSize === 1 ? 'text-lg' : 'text-sm'} ${activeAction?.type === 'FT' ? 'bg-orange-500 text-white shadow-lg' : 'text-orange-500 hover:bg-orange-500/10'}`}
                onClick={() => setActiveAction({type: 'FT', value: 1})}
              >
                LF
              </button>

              {/* Barre de séparation subtile */}
              <div className="w-px h-8 my-auto bg-orange-500/30 mx-1"></div>

              {/* Les boutons de Tirs (+1, +2, +3) */}
              {pointButtons.map(type => (
                <button 
                  key={type} 
                  className={`w-14 h-12 rounded-lg font-black transition-all ${courtSize === 1 ? 'text-lg' : 'text-sm'} ${activeAction?.type === type ? 'bg-orange-500 text-white shadow-lg' : 'text-orange-500 hover:bg-orange-500/10'}`}
                  onClick={() => setActiveAction({type, value: parseInt(type.replace('PLUS', ''))})}
                >
                  +{type.replace('PLUS', '')}
                </button>
              ))}
            </div>

            <div className="h-10 w-px bg-white/10"></div>

            {/* STATS TECHNIQUES (Boutons élargis en 1v1) */}
            <div className="flex gap-2">
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'OREB' ? 'bg-emerald-500 text-white' : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5'}`} onClick={() => setActiveAction({type: 'OREB', value: null})}>REB OFF</button>
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'DREB' ? 'bg-emerald-500 text-white' : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5'}`} onClick={() => setActiveAction({type: 'DREB', value: null})}>REB DEF</button>
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'STL' ? 'bg-blue-500 text-white' : 'border-blue-500/20 text-blue-500 hover:bg-blue-500/5'}`} onClick={() => setActiveAction({type: 'STL', value: null})}>INT</button>
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'BLK' ? 'bg-blue-500 text-white' : 'border-blue-500/20 text-blue-500 hover:bg-blue-500/5'}`} onClick={() => setActiveAction({type: 'BLK', value: null})}>CTR</button>
            </div>

            <div className="h-10 w-px bg-white/10"></div>

            {/* FAUTES ET SUBS */}
            <div className="flex gap-2">
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'TOV' ? 'bg-gray-600 text-white' : 'border-gray-500/30 text-gray-400 hover:bg-white/5'}`} onClick={() => setActiveAction({type: 'TOV', value: null})}>B. PERDUE</button>
              <button className={`h-12 rounded-lg font-black ${btnSizeClass} border ${activeAction?.type === 'FOUL' ? 'bg-red-600 text-white' : 'border-red-600/30 text-red-500 hover:bg-red-600/5'}`} onClick={() => setActiveAction({type: 'FOUL', value: null})}>FAUTE</button>
              
              {/* Le bouton SUB disparaît si courtSize === 1 */}
              {courtSize !== 1 && (
                <button className={`h-12 rounded-lg font-black px-5 text-[11px] border ${activeAction?.type === 'SUB' ? 'bg-purple-600 text-white' : 'border-purple-600/30 text-purple-500 hover:bg-purple-600/5'}`} onClick={() => setActiveAction({type: 'SUB', value: null})}>SUB</button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-w-[500px]">
             {activeAction?.type === 'STARTERS' && (
               <button className="bg-emerald-500 text-black px-12 py-3 rounded-xl font-black text-sm" onClick={() => setActiveAction(null)}>VALIDER LES JOUEURS</button>
             )}
             {pendingFoul && (
               <div className="flex items-center gap-4 animate-fadeIn">
                 <div className="flex gap-2">
                   {['P', 'PO', 'T', 'U', 'D'].map(f => (
                     <button 
                       key={f} 
                       className="w-14 h-12 rounded-lg font-black text-lg border-2 border-red-500/30 text-red-500 bg-transparent hover:bg-red-600 hover:text-white hover:border-red-600 hover:scale-105 transition-all shadow-sm" 
                       onClick={() => handleConfirmFoul(f)}
                     >
                       {f}
                     </button>
                   ))}
                 </div>
               </div>
             )}
            {pendingAssist && (
              <div className="flex items-center gap-4 animate-fadeIn">
                <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">
                  🏀 Passe décisive ?
                </span>
                <button 
                  onClick={() => setPendingAssist(null)}
                  className="px-4 py-4 bg-gray-600/30 hover:bg-gray-500/50 text-gray-300 border border-gray-500/50 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer"
                >
                  SANS PASSEUR
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- ZONE D'ACTION FINALE (DROITE) --- */}
        {(hasActiveProcess) && (
          <div className="flex items-center gap-3 border-l border-transparent/10 pl-8 h-12">
            
            {((activeAction?.type === 'SUB' && pendingSubs?.length > 0) || isForcedSub) && (
              <button 
                onClick={handleConfirmSubs}
                className={`h-full px-8 text-black rounded-xl font-black text-xs shadow-lg transition-all ${
                  isMissingRequiredSub ? 'bg-gray-500 opacity-50 cursor-not-allowed' :
                  canPlayShorthanded ? 'bg-orange-500 animate-pulse' : 
                  'bg-emerald-500 animate-pulse'
                }`}
              >
                {canPlayShorthanded ? 'SORTIR SANS REMPLAÇANT' : 'CONFIRMER'}
              </button>
            )}

            {!isForcedSub && !pendingAssist && (
              <button 
                onClick={resetAll}
                className="h-full px-6 bg-amber-500 text-black rounded-xl font-black text-[10px] flex flex-col items-center justify-center leading-tight shadow-lg"
              >
                <span className="text-xs">✕</span>
                <span>ANNULER</span>
              </button>
            )}

            {isForcedSub && (
              <div className="px-4 text-[var(--danger)] font-black text-[10px] animate-pulse text-center leading-tight">
                SORTIE<br/>OBLIGATOIRE
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}