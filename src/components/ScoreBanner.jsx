import React from 'react';

export default function ScoreBanner({
  teamA, teamB, scoreA, scoreB,
  teamFoulsA, teamFoulsB, timeoutsA, timeoutsB,
  canEdit, isMatchOver, handleTeamAction,
  isEditing, setIsEditing, editMin, setEditMin, editSec, setEditSec,
  time, isRunning, setIsRunning, handleSaveTime, handleResetTime,
  nextPeriod, period, possession, setPossession, activeAction,
  bonusFouls = 4 // 👈 NOUVEAU : On récupère la variable avec 4 par défaut
}) {

  // On crée un tableau dynamique selon la limite de fautes de l'organisateur (+1 pour la case rouge de pénalité)
  const foulSquares = [...Array(bonusFouls + 1)].map((_, i) => i + 1);

  return (
    <div className="flex justify-center items-stretch gap-2 md:gap-8 mb-10 bg-transparent p-4 rounded-xl border border-[#333] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      
      {/* SCORE ÉQUIPE A */}
      <div className="flex flex-col items-center flex-1">
        <h2 className="text-sm md:text-xl font-black text-white m-0 truncate w-full text-center tracking-wider">{teamA?.name || 'Équipe A'}</h2>
        <p className="text-5xl md:text-7xl font-black text-[var(--accent-orange)] my-2 drop-shadow-[0_0_15px_rgba(255,107,0,0.4)]">{scoreA}</p>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.65rem] text-[#888] font-bold tracking-widest">FAUTES ÉQUIPE</span>
          <div className="flex items-center gap-2 h-4">
            <div className="flex gap-1">
              {foulSquares.map(idx => (
                <div 
                  key={idx} 
                  className={`w-3.5 h-3.5 rounded-sm border border-[#555] ${
                    idx <= teamFoulsA 
                      ? (idx > bonusFouls ? 'bg-[var(--danger)] border-[var(--danger)] shadow-[0_0_8px_var(--danger)]' : 'bg-[var(--accent-orange)] border-[var(--accent-orange)]') 
                      : 'bg-transparent'
                  }`} 
                />
              ))}
            </div>
            {/* Le tag BONUS apparaît seulement si les fautes dépassent la limite */}
            {teamFoulsA > bonusFouls && <span className="bg-[var(--danger)] text-white px-1.5 py-0.5 rounded font-bold text-[0.6rem] tracking-widest animate-pulse">BONUS</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 bg-white/5 px-3 py-1.5 rounded-lg">
          <span className="text-[0.65rem] text-[#ccc] font-bold">TM</span>
          <div className="flex gap-1 mr-1">
            {Array.from({ length: timeoutsA }).map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-[var(--accent-orange)] shadow-[0_0_5px_var(--accent-orange)]" />)}
          </div>
          {canEdit && <button onClick={() => handleTeamAction('TIMEOUT', 'A')} className="bg-[#333] border border-[#555] text-white text-[0.6rem] px-2 py-1 rounded cursor-pointer hover:bg-[#444]">DEMANDER</button>}
        </div>
      </div>
      
      {/* LE CHRONOMÈTRE */}
      <div className="flex flex-col items-center justify-center px-4 md:px-8 bg-transparent">
        <div className="text-4xl md:text-6xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          {isEditing ? (
            <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
              <input type="number" value={editMin} onChange={e => setEditMin(e.target.value)} className="w-12 md:w-16 bg-transparent text-center border-b-2 border-white text-4xl md:text-6xl text-white outline-none" />
              <span>:</span>
              <input type="number" value={editSec} onChange={e => setEditSec(e.target.value)} className="w-12 md:w-16 bg-transparent text-center border-b-2 border-white text-4xl md:text-6xl text-white outline-none" />
              <button onClick={handleSaveTime} className="ml-2 bg-[var(--success)] text-white text-sm font-bold px-3 py-1 rounded cursor-pointer">OK</button>
            </div>
          ) : (
            <span className="cursor-pointer hover:text-gray-300 transition-colors" onClick={(e) => { if(!isMatchOver && canEdit) { e.stopPropagation(); setIsEditing(true); setEditMin(Math.floor(time/60)); setEditSec(time%60); }}}>
              {Math.floor(time/60)}:{time%60 < 10 ? '0'+time%60 : time%60}
            </span>
          )}
        </div>
        {(!isMatchOver && canEdit && activeAction?.type !== 'STARTERS') && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => setIsRunning(!isRunning)} className={`px-4 py-2 rounded-lg font-black tracking-wider text-sm shadow-lg transition-all ${isRunning ? 'bg-[var(--danger)] text-white hover:bg-red-600' : 'bg-[var(--success)] text-white hover:bg-green-600'}`}>
              {isRunning ? 'PAUSE' : 'START'}
            </button>
            <button onClick={handleResetTime} className="bg-[#333] text-white px-3 py-2 rounded-lg font-bold text-xs hover:bg-[#444] transition-colors">RESET</button>
          </div>
        )}
        <div className="flex flex-col items-center gap-3 mt-4">
          <button onClick={(canEdit && !isMatchOver) ? nextPeriod : null} className={`text-[#aaa] font-bold text-xs bg-white/5 border border-[#333] px-3 py-1.5 rounded-full tracking-widest ${(!canEdit || isMatchOver) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10 hover:text-white transition-colors'}`}>
            PÉRIODE : {period}
          </button>
          <div 
              onClick={() => (!isMatchOver && canEdit) && setPossession(p => p === 'A' ? 'B' : 'A')}
              className={`flex items-center gap-5 bg-[#1a1a1a] px-5 py-1.5 rounded-full border border-[#333] select-none ${(!isMatchOver && canEdit) ? 'cursor-pointer' : 'cursor-default'} ${possession ? 'shadow-inner' : ''}`}
          >
              <span className={`text-2xl transition-all duration-200 ${possession === 'A' ? 'text-[var(--accent-orange)] drop-shadow-[0_0_8px_var(--accent-orange)]' : 'text-[#333]'}`}>◀</span>
              <span className="text-[0.65rem] font-bold text-[#666] tracking-widest">POSSESSION</span>
              <span className={`text-2xl transition-all duration-200 ${possession === 'B' ? 'text-[var(--accent-blue)] drop-shadow-[0_0_8px_var(--accent-blue)]' : 'text-[#333]'}`}>▶</span>
          </div>
        </div>
      </div>

      {/* SCORE ÉQUIPE B */}
      <div className="flex flex-col items-center flex-1">
        <h2 className="text-sm md:text-xl font-black text-white m-0 truncate w-full text-center tracking-wider">{teamB?.name || 'Équipe B'}</h2>
        <p className="text-5xl md:text-7xl font-black text-[var(--accent-blue)] my-2 drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]">{scoreB}</p>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.65rem] text-[#888] font-bold tracking-widest">FAUTES ÉQUIPE</span>
          <div className="flex items-center gap-2 h-4">
            <div className="flex gap-1">
              {foulSquares.map(idx => (
                <div 
                  key={idx} 
                  className={`w-3.5 h-3.5 rounded-sm border border-[#555] ${
                    idx <= teamFoulsB 
                      ? (idx > bonusFouls ? 'bg-[var(--danger)] border-[var(--danger)] shadow-[0_0_8px_var(--danger)]' : 'bg-[var(--accent-blue)] border-[var(--accent-blue)]') 
                      : 'bg-transparent'
                  }`} 
                />
              ))}
            </div>
            {/* Le tag BONUS apparaît seulement si les fautes dépassent la limite */}
            {teamFoulsB > bonusFouls && <span className="bg-[var(--danger)] text-white px-1.5 py-0.5 rounded font-bold text-[0.6rem] tracking-widest animate-pulse">BONUS</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 bg-white/5 px-3 py-1.5 rounded-lg">
          <span className="text-[0.65rem] text-[#ccc] font-bold">TM</span>
          <div className="flex gap-1 mr-1">
            {Array.from({ length: timeoutsB }).map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-[var(--accent-blue)] shadow-[0_0_5px_var(--accent-blue)]" />)}
          </div>
          {canEdit && <button onClick={() => handleTeamAction('TIMEOUT', 'B')} className="bg-[#333] border border-[#555] text-white text-[0.6rem] px-2 py-1 rounded cursor-pointer hover:bg-[#444]">DEMANDER</button>}
        </div>
      </div>

    </div>
  );
}