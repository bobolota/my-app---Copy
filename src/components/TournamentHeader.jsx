import React from 'react';

export default function TournamentHeader({ 
  tourney, 
  canEdit, 
  canManageMatch, 
  session, 
  handleUnlockOtm, 
  activeTab, 
  setActiveTab,
  update // 👈 On ajoute la fonction update ici pour pouvoir sauvegarder l'état
}) {
  return (
    <div className="flex flex-col items-start gap-4 mb-6">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-black text-white m-0 tracking-wide flex-1">{tourney.name}</h1>
          
          <div className="flex flex-wrap items-center gap-3">
            {canEdit && tourney.pin_code && (
              <span className="bg-[rgba(0,102,204,0.1)] border border-[var(--accent-blue)] text-[var(--accent-blue)] px-3 py-1.5 rounded-lg text-sm font-bold tracking-wide shadow-sm">
                🔑 CODE OTM : {tourney.pin_code}
              </span>
            )}

            {/* 👇 LE FAMEUX BOUTON DE DIFFUSION (Visible que par l'orga) 👇 */}
            {canEdit && (
              <button 
                onClick={() => update({ isPublicScoreboard: !tourney.isPublicScoreboard })}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 border cursor-pointer hover:-translate-y-0.5 ${
                  tourney.isPublicScoreboard 
                    ? 'bg-[rgba(46,204,113,0.15)] text-[var(--success)] border-[var(--success)]' 
                    : 'bg-[#222] text-[#888] border-[#444] hover:bg-[#333]'
                }`}
                title="Autoriser les spectateurs à ouvrir la table de marque en lecture seule"
              >
                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_5px] ${tourney.isPublicScoreboard ? 'bg-[var(--success)] shadow-[var(--success)] animate-pulse' : 'bg-[#555]'}`}></div>
                {tourney.isPublicScoreboard ? 'DIFFUSION DIRECT : ON' : 'DIFFUSION DIRECT : OFF'}
              </button>
            )}

            {!canManageMatch && session && (
              <button 
                onClick={handleUnlockOtm} 
                className="bg-[#1a1a1a] border border-dashed border-[var(--accent-blue)] text-[var(--accent-blue)] px-3 py-1.5 rounded-lg cursor-pointer font-bold transition-colors hover:bg-[rgba(0,102,204,0.2)] text-sm shadow-sm"
              >
                🔓 Accès OTM
              </button>
            )}
          </div>
      </div>

      {/* ONGLETS SCROLLABLES SUR MOBILE */}
      <div className="flex gap-2 overflow-x-auto w-full pb-2 custom-scrollbar">
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