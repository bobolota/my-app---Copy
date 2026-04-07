import React from 'react';

export default function TournamentRegistrationModal({
  registerModalTourney,
  setRegisterModalTourney,
  selectedTeamToRegister,
  setSelectedTeamToRegister,
  myCaptainTeams,
  submitRegistration
}) {
  // Si aucun tournoi n'est sélectionné, on n'affiche rien
  if (!registerModalTourney) return null;

  // On vérifie si c'est un tournoi 1v1
  const is1v1 = registerModalTourney.matchsettings?.courtSize === 1;

  return (
    <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-[1000] p-4 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 w-full max-w-[500px] relative shadow-2xl">
        <button 
          onClick={() => { setRegisterModalTourney(null); setSelectedTeamToRegister(""); }} 
          className="absolute top-4 right-4 bg-transparent border-none text-[#888] text-2xl cursor-pointer hover:text-white transition-colors"
        >
          ✕
        </button>
        
        <h2 className="mt-0 mb-1 text-white text-2xl font-black tracking-wide">
          {is1v1 ? "Rejoindre le tournoi" : "Inscrire une équipe"}
        </h2>
        <h3 className="m-0 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 font-bold text-lg">
          {registerModalTourney.name}
        </h3>
        
        <div className="mt-8">
          {is1v1 ? (
            /* --- AFFICHAGE 1 V 1 --- */
            <div className="mb-6 flex flex-col gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <span className="text-4xl block mb-2">👤</span>
                <p className="text-white font-bold text-sm">Format King of the Court (1v1)</p>
                <p className="text-[#888] text-xs mt-1">Vous allez participer en votre nom propre. Aucune équipe n'est requise.</p>
              </div>
            </div>
          ) : (
            /* --- AFFICHAGE CLASSIQUE (3x3, 5x5) --- */
            <div className="mb-6">
              <label className="block mb-3 text-[#aaa] text-xs uppercase tracking-widest font-bold">Sélectionne ton équipe :</label>
              <select 
                value={selectedTeamToRegister} 
                onChange={e => setSelectedTeamToRegister(e.target.value)} 
                className="w-full p-4 bg-black/40 text-white border border-white/10 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-bold appearance-none cursor-pointer"
              >
                <option value="">-- Choisir une équipe --</option>
                {myCaptainTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          
          <button 
            onClick={submitRegistration} 
            className={`w-full text-white border-none p-4 rounded-xl font-black text-sm tracking-widest cursor-pointer transition-all shadow-lg hover:-translate-y-0.5 ${
              is1v1 
                ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-[0_4px_15px_rgba(249,115,22,0.4)]' 
                : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)]'
            }`}
          >
            {is1v1 ? 'REJOINDRE LE TOURNOI 🔥' : "VALIDER L'INSCRIPTION ✅"}
          </button>
        </div>
      </div>
    </div>
  );
}