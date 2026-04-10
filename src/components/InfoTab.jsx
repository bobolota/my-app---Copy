import React from 'react';

export default function InfoTab({ tourney }) {
  const s = tourney?.matchsettings || {};
  const courtSize = parseInt(s.courtSize) || 5;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* SECTION 1 : CONFIGURATION DU MATCH */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary shadow-lg shadow-secondary/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div>
            <h3 className="text-white uppercase tracking-[0.2em] font-black text-sm m-0">Structure du Match</h3>
            <p className="text-muted-dark text-[10px] font-bold uppercase mt-1">Format et timing</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-app-card border border-muted-line p-5 rounded-2xl shadow-xl">
            <span className="block text-muted text-[10px] uppercase font-black tracking-widest mb-2">Format</span>
            <span className="text-xl text-white font-black">{courtSize}x{courtSize} </span>
          </div>
          
          <div className="bg-app-card border border-muted-line p-5 rounded-2xl shadow-xl">
            <span className="block text-muted text-[10px] uppercase font-black tracking-widest mb-2">Nombre de périodes</span>
            <span className="text-xl text-white font-black">{s.periodCount || 4}</span>
          </div>

          <div className="bg-app-card border border-muted-line p-5 rounded-2xl shadow-xl">
            <span className="block text-muted text-[10px] uppercase font-black tracking-widest mb-2">Minutes / Période</span>
            <span className="text-xl text-white font-black">{s.periodDuration || 10} min</span>
          </div>
        </div>
      </section>

      {/* SECTION 2 : RÈGLEMENT TECHNIQUE (FAUTES & TM) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center text-danger shadow-lg shadow-danger/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
          </div>
          <div>
            <h3 className="text-white uppercase tracking-[0.2em] font-black text-sm m-0">Règlement & Sanctions</h3>
            <p className="text-muted-dark text-[10px] font-bold uppercase mt-1">Limites et bonus de fautes</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-app-card border border-muted-line p-5 rounded-2xl border-l-4 border-l-danger/50 shadow-xl">
            <span className="block text-muted text-[10px] uppercase font-black tracking-widest mb-2">Fautes Perso. Max</span>
            <span className="text-xl text-white font-black">
              {courtSize === 1 ? '∞' : (s.maxFouls || 5)}
            </span>
          </div>
          
          <div className="bg-app-card border border-muted-line p-5 rounded-2xl border-l-4 border-l-secondary/50 shadow-xl">
            <span className="block text-muted text-[10px] uppercase font-black tracking-widest mb-2 text-secondary-light">Bonus (Lancers-francs)</span>
            <span className="text-lg text-white font-black leading-tight">
              Après la {s.teamFoulBonus || 4}e <br/>
              <span className="text-xs text-muted-dark uppercase">faute d'équipe</span>
            </span>
          </div>

          <div className="bg-app-card border border-muted-line p-5 rounded-2xl shadow-xl">
            <span className="block text-muted text-[10px] uppercase font-black tracking-widest mb-2">TM Mi-temps 1</span>
            <span className="text-xl text-action font-black">{s.timeoutsHalf1 || 0}</span>
          </div>

          <div className="bg-app-card border border-muted-line p-5 rounded-2xl shadow-xl">
            <span className="block text-muted text-[10px] uppercase font-black tracking-widest mb-2">TM Mi-temps 2</span>
            <span className="text-xl text-action font-black">{s.timeoutsHalf2 || 0}</span>
          </div>
        </div>
      </section>

      {/* SECTION 3 : ÉQUIPES ENGAGÉES */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-action/20 flex items-center justify-center text-action shadow-lg shadow-action/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <h3 className="text-white uppercase tracking-[0.2em] font-black text-sm m-0">Équipes ({tourney?.teams?.length || 0})</h3>
            <p className="text-muted-dark text-[10px] font-bold uppercase mt-1">Participants officiels</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tourney?.teams?.map((team, idx) => (
            <div key={idx} className="bg-app-card border border-muted-line p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-all group shadow-lg">
              <div className="w-12 h-12 bg-app-input rounded-xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                🛡️
              </div>
              <span className="text-white font-black tracking-wide">{team.name}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}