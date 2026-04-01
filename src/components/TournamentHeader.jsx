import React from 'react';

export default function TournamentHeader({ 
  tourney, 
  canEdit, 
  canManageMatch, 
  session, 
  handleUnlockOtm, 
  activeTab, 
  setActiveTab 
}) {
  return (
    <div className="flex flex-col items-start gap-3 mb-5">
      <div className="flex items-center gap-4 flex-wrap w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-white m-0 flex-1">{tourney.name}</h1>
          
          {canEdit && tourney.pin_code && (
            <span className="bg-[rgba(0,102,204,0.1)] border border-[var(--accent-blue)] text-[var(--accent-blue)] px-3 py-1.5 rounded-md text-sm md:text-base font-bold tracking-wide">
              🔑 CODE OTM : {tourney.pin_code}
            </span>
          )}

          {!canManageMatch && session && (
            <button 
              onClick={handleUnlockOtm} 
              className="bg-[#1a1a1a] border border-dashed border-[var(--accent-blue)] text-[var(--accent-blue)] px-3 py-1.5 rounded-md cursor-pointer font-bold transition-colors hover:bg-[rgba(0,102,204,0.2)] text-sm md:text-base"
            >
              🔓 Débloquer la Table de Marque
            </button>
          )}
      </div>

      {/* ONGLETS SCROLLABLES SUR MOBILE */}
      <div className="flex gap-2 mt-3 overflow-x-auto w-full pb-2 scrollbar-hide">
          <button 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'planning' ? 'bg-[var(--accent-blue)] text-white' : 'bg-[#222] text-gray-400 hover:text-white hover:bg-[#333]'}`} 
            onClick={() => setActiveTab('planning')}
          >
            PLANNING
          </button>
          <button 
            onClick={() => setActiveTab("poules")} 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'poules' ? 'bg-[var(--accent-blue)] text-white' : 'bg-[#222] text-gray-400 hover:text-white hover:bg-[#333]'}`}
          >
            POULES
          </button>
          <button 
            onClick={() => setActiveTab("finale")} 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'finale' ? 'bg-[var(--accent-blue)] text-white' : 'bg-[#222] text-gray-400 hover:text-white hover:bg-[#333]'}`}
          >
            PHASE FINALE
          </button>
          <button 
            onClick={() => setActiveTab("stats")} 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'stats' ? 'bg-[var(--accent-blue)] text-white' : 'bg-[#222] text-gray-400 hover:text-white hover:bg-[#333]'}`}
          >
            STATISTIQUES 📈
          </button>
      </div>
    </div>
  );
}