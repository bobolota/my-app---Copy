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
    <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-[9999] p-4">
      <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[var(--accent-blue)] w-full max-w-lg shadow-2xl">
        <h3 className="mt-0 text-[var(--accent-blue)] border-b border-[#333] pb-3 mb-4 text-xl font-bold">👤 Assigner des OTM</h3>
        
        <label className="block mb-2 text-[#ccc] text-sm">Cocher les OTM connectés :</label>
        <div className="flex flex-col gap-2 mb-5 bg-[#222] p-3 rounded-md max-h-[150px] overflow-y-auto custom-scrollbar">
          {otmProfiles.length === 0 ? (
            <span className="text-sm text-[#888] italic">Aucun OTM n'a rejoint le tournoi.</span>
          ) : (
            otmProfiles.map(prof => (
              <label key={prof.id} className="flex items-center gap-3 cursor-pointer text-sm text-white hover:bg-[#333] p-2 rounded transition-colors">
                <input 
                  type="checkbox" 
                  checked={selectedOtms.includes(prof.full_name)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedOtms([...selectedOtms, prof.full_name]);
                    else setSelectedOtms(selectedOtms.filter(name => name !== prof.full_name));
                  }}
                  className="scale-125 cursor-pointer accent-[var(--accent-blue)]"
                />
                {prof.full_name}
              </label>
            ))
          )}
        </div>

        <label className="block mb-2 text-[#ccc] text-sm">Autre (ex: Terrain 1, Bénévoles...) :</label>
        <input 
          type="text" 
          value={customOtm}
          onChange={(e) => setCustomOtm(e.target.value)}
          className="w-full mb-6 p-3 rounded-md border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
          placeholder="Saisir un texte libre..."
        />

        <div className="flex gap-3 justify-end">
          <button onClick={() => setOtmModal(null)} className="bg-[#333] text-white px-4 py-2 rounded-md font-bold hover:bg-[#444] transition-colors cursor-pointer">Annuler</button>
          <button onClick={handleValidate} className="bg-[var(--success)] text-white px-5 py-2 rounded-md text-base font-bold hover:bg-green-600 transition-colors cursor-pointer">Valider</button>
        </div>
      </div>
    </div>
  );
}