import React from 'react';

export default function TournamentRegistrationModal({
  registerModalTourney,
  setRegisterModalTourney,
  selectedTeamToRegister,
  setSelectedTeamToRegister,
  myCaptainTeams,
  submitRegistration
}) {
  // Si aucun tournoi n'est sélectionné pour l'inscription, on n'affiche rien
  if (!registerModalTourney) return null;

  return (
    <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-[1000] p-4">
      <div className="bg-[#1a1a1a] p-8 rounded-xl border-2 border-[var(--accent-blue)] w-full max-w-[500px] relative shadow-2xl">
        <button 
          onClick={() => { setRegisterModalTourney(null); setSelectedTeamToRegister(""); }} 
          className="absolute top-4 right-4 bg-transparent border-none text-[#888] text-2xl cursor-pointer hover:text-white transition-colors"
        >
          ✕
        </button>
        
        <h2 className="mt-0 mb-1 text-white text-2xl font-bold">S'inscrire au tournoi</h2>
        <h3 className="m-0 text-[var(--accent-blue)] text-lg">{registerModalTourney.name}</h3>
        
        <div className="mt-8">
          <label className="block mb-3 text-[#aaa] text-sm font-bold">Sélectionne l'équipe :</label>
          <select 
            value={selectedTeamToRegister} 
            onChange={e => setSelectedTeamToRegister(e.target.value)} 
            className="w-full p-3 bg-[#222] text-white border border-[#444] rounded-lg mb-6 focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
          >
            <option value="">-- Choisir une équipe --</option>
            {myCaptainTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          
          <button 
            onClick={submitRegistration} 
            className="w-full bg-[var(--success)] text-white border-none p-4 rounded-lg font-bold text-base cursor-pointer hover:bg-green-600 transition-colors shadow-lg"
          >
            VALIDER L'INSCRIPTION ✅
          </button>
        </div>
      </div>
    </div>
  );
}