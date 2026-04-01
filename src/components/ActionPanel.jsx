import React from 'react';
import toast from 'react-hot-toast';

export default function ActionPanel({
  activeAction, setActiveAction,
  pendingFoul, setPendingFoul, handleConfirmFoul,
  pendingAssist, setPendingAssist,
  isForcedSub, handleConfirmSubs, setPendingSubs,
  playersA, playersB, setStartersValidated
}) {
  return (
    <div className={`w-full xl:w-[180px] shrink-0 sticky top-5 p-4 rounded-xl border-2 transition-colors ${activeAction?.type === 'STARTERS' ? 'border-[var(--success)] bg-[rgba(52,199,89,0.1)]' : (pendingAssist ? 'border-[var(--success)] bg-[rgba(52,199,89,0.1)]' : (activeAction?.type === 'SUB' ? 'border-[var(--accent-purple)] bg-[rgba(157,78,221,0.1)]' : (pendingFoul ? 'border-[var(--danger)] bg-[rgba(255,59,48,0.1)]' : 'border-[#444] bg-[#1a1a1a]')))}`}>
      {activeAction?.type === 'STARTERS' ? (
          <div className="flex flex-col gap-3">
              <span className="text-center text-xs font-bold text-[var(--success)] tracking-widest">🏀 SÉLECTION TITULAIRES</span>
              <button className="bg-[var(--success)] text-white border-none py-3 px-2 rounded-lg text-sm font-black cursor-pointer hover:bg-green-600 transition-colors shadow-lg" onClick={() => {
                  const courtA = playersA.filter(p=>p.status==='court').length;
                  const courtB = playersB.filter(p=>p.status==='court').length;
                  if (courtA !== 5 || courtB !== 5) {
                      toast.error(`Il n'y a pas 5 joueurs par équipe ! (A: ${courtA}/5, B: ${courtB}/5)`);
                      return;
                  }
                  setActiveAction(null);
                  setStartersValidated(true); 
              }}>
                  VALIDER LE 5 MAJEUR
              </button>
          </div>
      ) : pendingFoul ? (
        <div className="flex flex-col gap-2">
          <span className="text-center text-xs font-bold text-[var(--danger)] tracking-widest mb-2">TYPE DE FAUTE ?</span>
          <button className="bg-[#333] text-white border border-[#555] py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-[#444]" onClick={() => handleConfirmFoul('P')}>SIMPLE (P)</button>
          <button className="bg-[#333] text-white border border-[#555] py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-[#444]" onClick={() => handleConfirmFoul('PO')}>OFFENSIVE (PO)</button>
          <button className="bg-transparent text-[var(--danger)] border-2 border-[var(--danger)] py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-[var(--danger)] hover:text-white transition-colors" onClick={() => handleConfirmFoul('T')}>TECHNIQUE (T)</button>
          <button className="bg-transparent text-[var(--danger)] border-2 border-[var(--danger)] py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-[var(--danger)] hover:text-white transition-colors" onClick={() => handleConfirmFoul('U')}>ANTISPORTIVE (U)</button>
          <button className="bg-[var(--danger)] text-white border-none py-2.5 rounded font-bold text-sm cursor-pointer hover:bg-red-700" onClick={() => handleConfirmFoul('D')}>DISQ (D)</button>
          <button className="bg-transparent text-[#888] underline border-none py-2.5 rounded font-bold text-xs cursor-pointer hover:text-white mt-2" onClick={() => setPendingFoul(null)}>ANNULER</button>
        </div>
      ) : pendingAssist ? (
        <div className="flex flex-col gap-3">
          <span className="text-center text-xs font-bold text-[var(--success)] tracking-widest">QUI A FAIT LA PASSE ?</span>
          <button className="bg-[#444] text-white border-none py-3 rounded font-bold text-sm cursor-pointer hover:bg-[#555]" onClick={() => setPendingAssist(null)}>SANS PASSEUR</button>
        </div>
      ) : activeAction?.type === 'SUB' ? (
        <div className="flex flex-col gap-3">
          <span className="text-center text-xs font-bold text-[var(--accent-purple)] tracking-widest">MODE REMPLACEMENT</span>
          <button className="bg-[var(--accent-purple)] text-white py-3 rounded-lg font-black text-sm border-none cursor-pointer shadow-lg hover:bg-purple-600 transition-colors" onClick={handleConfirmSubs}>VALIDER CHANGEMENTS</button>
          {!isForcedSub && <button className="bg-transparent text-[#888] underline border-none py-2 rounded font-bold text-xs cursor-pointer hover:text-white" onClick={() => {setActiveAction(null); setPendingSubs([]);}}>ANNULER</button>}
        </div>
      ) : (
        <div className="flex flex-col w-full gap-2">
          <div className="flex gap-1.5">
            {['PLUS1', 'PLUS2', 'PLUS3'].map(type => (
              <button key={type} className={`flex-1 py-2.5 rounded font-black text-base cursor-pointer transition-all border-2 ${activeAction?.type === type ? 'bg-white text-black border-white scale-105' : 'bg-transparent text-white border-[#555] hover:border-white'}`} onClick={() => setActiveAction({type, value: parseInt(type.replace('PLUS', ''))})}>+{type.replace('PLUS', '')}</button>
            ))}
          </div>
          
          <div className="w-full h-px bg-[#333] my-1"></div>

          <div className="flex gap-1.5 w-full">
              <button className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'OREB' ? 'bg-[var(--success)] text-white border-[var(--success)]' : 'bg-transparent text-[var(--success)] border-[var(--success)] hover:bg-[var(--success)] hover:text-white'}`} onClick={() => setActiveAction({type: 'OREB', value: null})}>OREB</button>
              <button className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'DREB' ? 'bg-[var(--success)] text-white border-[var(--success)]' : 'bg-transparent text-[var(--success)] border-[var(--success)] hover:bg-[var(--success)] hover:text-white'}`} onClick={() => setActiveAction({type: 'DREB', value: null})}>DREB</button>
          </div>

          <div className="flex gap-1.5 w-full">
              <button className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'STL' ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]' : 'bg-transparent text-[var(--accent-blue)] border-[var(--accent-blue)] hover:bg-[var(--accent-blue)] hover:text-white'}`} onClick={() => setActiveAction({type: 'STL', value: null})}>STL</button>
              <button className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'BLK' ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]' : 'bg-transparent text-[var(--accent-blue)] border-[var(--accent-blue)] hover:bg-[var(--accent-blue)] hover:text-white'}`} onClick={() => setActiveAction({type: 'BLK', value: null})}>BLK</button>
          </div>

          <div className="flex gap-1.5 w-full">
              <button className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'TOV' ? 'bg-[#888] text-white border-[#888]' : 'bg-transparent text-[#ccc] border-[#666] hover:bg-[#666] hover:text-white'}`} onClick={() => setActiveAction({type: 'TOV', value: null})}>TOV</button>
              <button className={`flex-1 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'FOUL' ? 'bg-[var(--danger)] text-white border-[var(--danger)]' : 'bg-transparent text-[var(--danger)] border-[var(--danger)] hover:bg-[var(--danger)] hover:text-white'}`} onClick={() => setActiveAction({type: 'FOUL', value: null})}>FOUL</button>
          </div>

          <button className={`w-full mt-1 py-2.5 rounded font-black tracking-widest text-xs cursor-pointer transition-colors border-2 ${activeAction?.type === 'SUB' ? 'bg-[var(--accent-purple)] text-white border-[var(--accent-purple)]' : 'bg-transparent text-[var(--accent-purple)] border-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white'}`} onClick={() => setActiveAction({type: 'SUB', value: null})}>SUB</button>

          {activeAction && <button onClick={() => setActiveAction(null)} className="w-full mt-2 py-2 rounded font-bold text-xs bg-transparent text-[#888] underline border-none cursor-pointer hover:text-white">ANNULER</button>}
        </div>
      )}
    </div>
  );
}