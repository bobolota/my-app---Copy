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

  // On vérifie la taille du terrain (courtSize) pour déterminer le format
  const courtSize = registerModalTourney.matchsettings?.courtSize || 5;
  const is1v1 = courtSize === 1;
  const tourneyFormat = courtSize === 3 ? '3x3' : '5x5';

  // 👇 ON FILTRE LES ÉQUIPES SELON LE FORMAT DU TOURNOI 👇
  const eligibleTeams = myCaptainTeams.filter(t => (t.format || '5x5') === tourneyFormat);

  // Sécurité pour le bouton de validation
  const canSubmit = is1v1 || (selectedTeamToRegister && eligibleTeams.length > 0);

  return (
    <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-[1000] p-4 backdrop-blur-sm">
      <div className="bg-[#15151e] p-8 rounded-3xl border border-white/10 w-full max-w-[500px] relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Lueur de fond adaptée au format */}
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20 ${is1v1 ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>

        <button 
          onClick={() => { setRegisterModalTourney(null); setSelectedTeamToRegister(""); }} 
          className="absolute top-6 right-6 bg-black/40 border border-white/10 w-10 h-10 rounded-full flex items-center justify-center text-[#888] text-xl cursor-pointer hover:text-white hover:bg-white/10 transition-all shadow-inner z-20"
        >
          ✕
        </button>
        
        <h2 className="mt-0 mb-2 text-white text-2xl sm:text-3xl font-black tracking-wide relative z-10">
          {is1v1 ? "Rejoindre le tournoi" : "Inscrire une équipe"}
        </h2>
        <h3 className="m-0 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 font-black text-lg uppercase tracking-widest relative z-10">
          {registerModalTourney.name}
        </h3>
        
        <div className="mt-8 relative z-10">
          {is1v1 ? (
            /* --- AFFICHAGE 1 V 1 --- */
            <div className="mb-8 flex flex-col gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center shadow-inner">
                <span className="text-5xl block mb-3 drop-shadow-md">👤</span>
                <p className="text-white font-black text-base uppercase tracking-widest mb-2">Format King of the Court</p>
                <p className="text-[#888] text-xs leading-relaxed">Tu vas participer en ton nom propre. Aucune équipe n'est requise pour ce format de duel.</p>
              </div>
            </div>
          ) : (
            /* --- AFFICHAGE CLASSIQUE (3x3, 5x5) AVEC CARTES --- */
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <label className="text-[#aaa] text-xs uppercase tracking-widest font-black">Sélectionne ton équipe :</label>
                <span className="bg-white/10 text-white px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-inner">
                  Format {tourneyFormat}
                </span>
              </div>
              
              {eligibleTeams.length === 0 ? (
                <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl text-center shadow-inner">
                  <span className="text-red-400 font-black text-sm block mb-1">🚫 Aucune équipe {tourneyFormat} éligible</span>
                  <p className="text-[#888] text-xs m-0">
                    Tu dois être capitaine d'une équipe au format <b>{tourneyFormat}</b> pour t'inscrire à ce tournoi. Fonde-en une dans ton vestiaire !
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                  {eligibleTeams.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setSelectedTeamToRegister(t.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all shadow-sm group ${
                        selectedTeamToRegister === t.id 
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                          : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      {/* Faux bouton radio stylisé */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedTeamToRegister === t.id ? 'border-emerald-500' : 'border-[#555] group-hover:border-[#888]'
                      }`}>
                        {selectedTeamToRegister === t.id && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>}
                      </div>
                      
                      <div className="flex flex-col flex-1">
                        <span className={`text-base font-black tracking-wide ${selectedTeamToRegister === t.id ? 'text-white' : 'text-[#aaa] group-hover:text-white'}`}>
                          {t.name}
                        </span>
                        <span className="text-[10px] text-[#666] font-bold uppercase tracking-widest mt-0.5">
                          📍 {t.city || 'Ville inconnue'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <button 
            onClick={submitRegistration} 
            disabled={!canSubmit}
            className={`w-full border-none p-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all shadow-lg ${
              !canSubmit 
                ? 'bg-black/50 text-[#555] cursor-not-allowed shadow-none border border-white/5'
                : is1v1 
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-[0_4px_15px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 cursor-pointer' 
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 cursor-pointer'
            }`}
          >
            {is1v1 ? 'REJOINDRE LE TOURNOI 🔥' : "VALIDER L'INSCRIPTION ✅"}
          </button>
        </div>
      </div>
    </div>
  );
}