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
    <div className="flex justify-center items-stretch gap-2 md:gap-8 mb-10 bg-transparent p-4 rounded-xl border border-muted-line shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      
      {/* SCORE ÉQUIPE A */}
      <div className="flex flex-col items-center flex-1">
        <h2 className="text-sm md:text-xl font-black text-white m-0 truncate w-full text-center tracking-wider">{teamA?.name || 'Équipe A'}</h2>
        <p className="text-5xl md:text-7xl font-black text-secondary my-2 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]">{scoreA}</p>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.65rem] text-muted font-bold tracking-widest">FAUTES ÉQUIPE</span>
          <div className="flex items-center gap-2 h-4">
            <div className="flex gap-1">
              {foulSquares.map(idx => (
                <div 
                  key={idx} 
                  className={`w-3.5 h-3.5 rounded-sm border border-muted-dark ${
                    idx <= teamFoulsA 
                      ? (idx > bonusFouls ? 'bg-danger border-danger shadow-[0_0_8px_rgba(239,68,68,1)]' : 'bg-secondary border-secondary') 
                      : 'bg-transparent'
                  }`} 
                />
              ))}
            </div>
            {/* Le tag BONUS apparaît seulement si les fautes dépassent la limite */}
            {teamFoulsA > bonusFouls && <span className="bg-danger text-white px-1.5 py-0.5 rounded font-bold text-[0.6rem] tracking-widest animate-pulse">BONUS</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 bg-white/5 px-3 py-1.5 rounded-lg">
          <span className="text-[0.65rem] text-muted-light font-bold">TM</span>
          <div className="flex gap-1 mr-1">
            {Array.from({ length: timeoutsA }).map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_5px_rgba(249,115,22,1)]" />)}
          </div>
          {canEdit && <button onClick={() => handleTeamAction('TIMEOUT', 'A')} className="bg-app-input border border-muted-line text-muted-light text-[0.6rem] px-2 py-1 rounded cursor-pointer hover:bg-muted-dark hover:text-white transition-colors">DEMANDER</button>}
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
              <button onClick={handleSaveTime} className="ml-2 bg-primary text-white text-sm font-bold px-3 py-1 rounded cursor-pointer">OK</button>
            </div>
          ) : (
            <span className="cursor-pointer hover:text-muted-light transition-colors" onClick={(e) => { if(!isMatchOver && canEdit) { e.stopPropagation(); setIsEditing(true); setEditMin(Math.floor(time/60)); setEditSec(time%60); }}}>
              {Math.floor(time/60)}:{time%60 < 10 ? '0'+time%60 : time%60}
            </span>
          )}
        </div>
        {(!isMatchOver && canEdit && activeAction?.type !== 'STARTERS') && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => setIsRunning(!isRunning)} className={`px-4 py-2 rounded-lg font-black tracking-wider text-sm shadow-lg transition-all ${isRunning ? 'bg-danger text-white hover:bg-red-600' : 'bg-primary text-white hover:bg-emerald-600'}`}>
              {isRunning ? 'PAUSE' : 'START'}
            </button>
            <button onClick={handleResetTime} className="bg-app-input text-muted-light px-3 py-2 rounded-lg font-bold text-xs hover:bg-muted-dark hover:text-white transition-colors">RESET</button>
          </div>
        )}
        <div className="flex flex-col items-center gap-3 mt-4">
          <button onClick={(canEdit && !isMatchOver) ? nextPeriod : null} className={`text-muted font-bold text-xs bg-white/5 border border-muted-line px-3 py-1.5 rounded-full tracking-widest ${(!canEdit || isMatchOver) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10 hover:text-white transition-colors'}`}>
            PÉRIODE : {period}
          </button>
          <div 
              onClick={() => (!isMatchOver && canEdit) && setPossession(p => p === 'A' ? 'B' : 'A')}
              className={`flex items-center gap-5 bg-app-card px-5 py-1.5 rounded-full border border-muted-line select-none ${(!isMatchOver && canEdit) ? 'cursor-pointer' : 'cursor-default'} ${possession ? 'shadow-inner' : ''}`}
          >
              <span className={`text-2xl transition-all duration-200 ${possession === 'A' ? 'text-secondary drop-shadow-[0_0_8px_rgba(249,115,22,1)]' : 'text-muted-dark'}`}>◀</span>
              <span className="text-[0.65rem] font-bold text-muted tracking-widest">POSSESSION</span>
              <span className={`text-2xl transition-all duration-200 ${possession === 'B' ? 'text-action drop-shadow-[0_0_8px_rgba(59,130,246,1)]' : 'text-muted-dark'}`}>▶</span>
          </div>
        </div>
      </div>

      {/* SCORE ÉQUIPE B */}
      <div className="flex flex-col items-center flex-1">
        <h2 className="text-sm md:text-xl font-black text-white m-0 truncate w-full text-center tracking-wider">{teamB?.name || 'Équipe B'}</h2>
        <p className="text-5xl md:text-7xl font-black text-action my-2 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]">{scoreB}</p>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.65rem] text-muted font-bold tracking-widest">FAUTES ÉQUIPE</span>
          <div className="flex items-center gap-2 h-4">
            <div className="flex gap-1">
              {foulSquares.map(idx => (
                <div 
                  key={idx} 
                  className={`w-3.5 h-3.5 rounded-sm border border-muted-dark ${
                    idx <= teamFoulsB 
                      ? (idx > bonusFouls ? 'bg-danger border-danger shadow-[0_0_8px_rgba(239,68,68,1)]' : 'bg-action border-action') 
                      : 'bg-transparent'
                  }`} 
                />
              ))}
            </div>
            {/* Le tag BONUS apparaît seulement si les fautes dépassent la limite */}
            {teamFoulsB > bonusFouls && <span className="bg-danger text-white px-1.5 py-0.5 rounded font-bold text-[0.6rem] tracking-widest animate-pulse">BONUS</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 bg-white/5 px-3 py-1.5 rounded-lg">
          <span className="text-[0.65rem] text-muted-light font-bold">TM</span>
          <div className="flex gap-1 mr-1">
            {Array.from({ length: timeoutsB }).map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-action shadow-[0_0_5px_rgba(59,130,246,1)]" />)}
          </div>
          {canEdit && <button onClick={() => handleTeamAction('TIMEOUT', 'B')} className="bg-app-input border border-muted-line text-muted-light text-[0.6rem] px-2 py-1 rounded cursor-pointer hover:bg-muted-dark hover:text-white transition-colors">DEMANDER</button>}
        </div>
      </div>

    </div>
  );
}