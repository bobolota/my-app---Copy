import React, { useState, useEffect } from 'react';

export default function OtmAssignModal({ 
  otmModal, 
  setOtmModal, 
  otmProfiles, 
  tourney, 
  update 
}) {
  const [selectedOtms, setSelectedOtms] = useState([]); 
  const [customOtm, setCustomOtm] = useState("");

  useEffect(() => {
    if (otmModal) {
      const currentOtmsArray = (otmModal.currentOtm || "").split(' - ').map(s => s.trim()).filter(Boolean);
      const knownProfiles = otmProfiles.map(p => p.full_name);
      
      setSelectedOtms(currentOtmsArray.filter(name => knownProfiles.includes(name)));
      setCustomOtm(currentOtmsArray.filter(name => !knownProfiles.includes(name)).join(' - '));
    }
  }, [otmModal, otmProfiles]);

  if (!otmModal) return null;

  const handleValidate = () => {
    const finalVal = [...selectedOtms, customOtm.trim()].filter(Boolean).join(' - ');
    
    if (otmModal.isPlayoff) {
      const newMatches = tourney.playoffs.matches.map(m => m.id === otmModal.matchId ? { ...m, otm: finalVal } : m);
      update({ playoffs: { ...tourney.playoffs, matches: newMatches } });
    } else {
      const newSchedule = tourney.schedule.map(m => m.id === otmModal.matchId ? { ...m, otm: finalVal } : m);
      update({ schedule: newSchedule });
    }
    setOtmModal(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
      {/* bg-app-panel et border-muted-line */}
      <div className="bg-app-panel/95 backdrop-blur-xl p-8 rounded-3xl border border-muted-line w-full max-w-[500px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Ligne LED Bleue (action) et Lueur d'ambiance */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-action to-action-light shadow-[0_0_15px_rgba(59,130,246,0.4)] opacity-80"></div>
        <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full pointer-events-none opacity-20 bg-action"></div>

        {/* text-action remplace text-blue-400 */}
        <h3 className="mt-2 mb-8 text-action text-2xl font-black tracking-wide drop-shadow-md flex items-center gap-3 relative z-10 uppercase">
          <span className="text-3xl">👤</span> Assigner des OTM
        </h3>
        
        <div className="relative z-10 flex flex-col gap-6">
          
          {/* Liste des OTM connectés */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Cocher les OTM connectés :</label>
            <div className="flex flex-col gap-2 bg-app-input border border-muted-line p-4 rounded-2xl max-h-[180px] overflow-y-auto custom-scrollbar shadow-inner">
              {otmProfiles.length === 0 ? (
                <span className="text-xs font-bold text-muted-dark uppercase tracking-wider text-center py-4">Aucun OTM n'a rejoint le tournoi</span>
              ) : (
                otmProfiles.map(prof => (
                  <label key={prof.id} className="flex items-center gap-4 cursor-pointer text-sm font-bold text-muted-light hover:text-white hover:bg-white/5 p-3 rounded-xl transition-all border border-transparent hover:border-muted-line group shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={selectedOtms.includes(prof.full_name)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedOtms([...selectedOtms, prof.full_name]);
                        else setSelectedOtms(selectedOtms.filter(name => name !== prof.full_name));
                      }}
                      // accent-action permet de garder la case cochée bleue
                      className="w-4 h-4 cursor-pointer accent-action"
                    />
                    <span className="group-hover:translate-x-1 transition-transform">{prof.full_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Autre OTM (Saisie Libre) */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Autre (ex: Terrain 1, Bénévoles...) :</label>
            <input 
              type="text" 
              value={customOtm}
              onChange={(e) => setCustomOtm(e.target.value)}
              className="w-full p-4 rounded-xl bg-app-input border border-muted-line text-white placeholder:text-muted-dark focus:outline-none focus:border-action focus:bg-app-bg transition-all shadow-inner text-sm font-medium"
              placeholder="Saisir un texte libre..."
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-4 justify-end mt-4">
            <button 
              onClick={() => setOtmModal(null)} 
              className="px-6 py-3.5 bg-app-input text-muted border border-muted-line rounded-xl cursor-pointer font-black text-xs tracking-widest uppercase hover:bg-white/10 hover:text-white transition-all shadow-inner"
            >
              Annuler
            </button>
            <button 
              onClick={handleValidate} 
              className="px-8 py-3.5 border-none rounded-xl cursor-pointer font-black tracking-widest uppercase text-xs text-white shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-r from-primary to-primary-dark hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)]"
            >
              Valider
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}