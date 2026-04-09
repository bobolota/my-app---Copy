import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function InfoTab({ tourney }) {
  const { tournaments, setTournaments } = useAppContext();
  const { session } = useAuth();
  
  const s = tourney?.matchsettings || {};
  const courtSize = parseInt(s.courtSize) || 5;

  // Détecte si l'utilisateur est le créateur du tournoi
  const isOwnerOrAdmin = session?.user?.id === tourney?.organizer_id;

  // États pour la modale d'édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(tourney?.name || "");
  const [editDate, setEditDate] = useState(tourney?.date || "");
  const [editCourtSize, setEditCourtSize] = useState(s.courtSize || 5);
  const [editPeriodCount, setEditPeriodCount] = useState(s.periodCount || 4);
  const [editPeriodDuration, setEditPeriodDuration] = useState(s.periodDuration || 10);
  const [editMaxFouls, setEditMaxFouls] = useState(s.maxFouls || 5);
  const [editTeamFoulBonus, setEditTeamFoulBonus] = useState(s.teamFoulBonus || 4);
  const [editTimeoutsHalf1, setEditTimeoutsHalf1] = useState(s.timeoutsHalf1 || 2);
  const [editTimeoutsHalf2, setEditTimeoutsHalf2] = useState(s.timeoutsHalf2 || 3);

  // Fonction de sauvegarde
  const handleUpdateTourney = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const updatedSettings = {
      courtSize: editCourtSize, periodCount: editPeriodCount, periodDuration: editPeriodDuration,
      maxFouls: editMaxFouls, teamFoulBonus: editTeamFoulBonus,
      timeoutsHalf1: editTimeoutsHalf1, timeoutsHalf2: editTimeoutsHalf2
    };

    const { data, error } = await supabase
      .from('tournaments')
      .update({ name: editName, date: editDate || null, matchsettings: updatedSettings })
      .eq('id', tourney.id)
      .select();

    if (!error && data) {
      // Met à jour l'interface en temps réel sans recharger la page !
      setTournaments(tournaments.map(t => t.id === tourney.id ? data[0] : t));
      setIsEditModalOpen(false);
    }
    setIsSaving(false);
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* BOUTON MODIFIER (Organisateur uniquement) */}
      {isOwnerOrAdmin && (
        <div className="flex justify-end -mb-4">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="bg-app-input border border-muted-line text-primary hover:text-white hover:bg-primary/20 px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all cursor-pointer shadow-inner flex items-center gap-2"
          >
            ⚙️ Paramètres du tournoi
          </button>
        </div>
      )}

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
            <span className="block text-action text-[10px] uppercase font-black tracking-widest mb-2">TM Mi-temps 1</span>
            <span className="text-xl text-action font-black">{s.timeoutsHalf1 || 0}</span>
          </div>

          <div className="bg-app-card border border-muted-line p-5 rounded-2xl shadow-xl">
            <span className="block text-action text-[10px] uppercase font-black tracking-widest mb-2">TM Mi-temps 2</span>
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

      {/* MODALE D'ÉDITION */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-app-panel border border-muted-line rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-white m-0 uppercase tracking-widest">⚙️ Paramètres</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-muted hover:text-white text-2xl transition-colors bg-transparent border-none cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleUpdateTourney} className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Nom du tournoi</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required className="w-full p-4 mt-1 rounded-xl bg-app-input border border-muted-line text-white focus:border-primary focus:outline-none transition-colors shadow-inner" />
                </div>
                <div className="w-full sm:w-[200px]">
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Date</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full p-4 mt-1 rounded-xl bg-app-input border border-muted-line text-muted-light focus:border-primary focus:outline-none transition-colors shadow-inner" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-muted-line pt-5 mt-2">
                <div>
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Format</label>
                  <select value={editCourtSize} onChange={e => setEditCourtSize(parseInt(e.target.value))} className="w-full p-3 mt-1 rounded-xl bg-app-input border border-muted-line text-white focus:border-primary outline-none shadow-inner">
                    <option value={1}>1x1</option>
                    <option value={3}>3x3</option>
                    <option value={5}>5x5</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Périodes</label>
                  <input type="number" min="1" value={editPeriodCount} onChange={e => setEditPeriodCount(parseInt(e.target.value))} className="w-full p-3 mt-1 rounded-xl bg-app-input border border-muted-line text-white focus:border-primary outline-none shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Min / Période</label>
                  <input type="number" min="1" value={editPeriodDuration} onChange={e => setEditPeriodDuration(parseInt(e.target.value))} className="w-full p-3 mt-1 rounded-xl bg-app-input border border-muted-line text-white focus:border-primary outline-none shadow-inner" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-muted-line pt-5 mt-2">
                <div>
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1" title="Fautes max par joueur">Fautes Perso</label>
                  <input type="number" min="1" value={editMaxFouls} onChange={e => setEditMaxFouls(parseInt(e.target.value))} className="w-full p-3 mt-1 rounded-xl bg-app-input border border-muted-line text-white focus:border-primary outline-none shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] text-secondary font-black uppercase tracking-widest ml-1" title="Fautes d'équipe avant lancers">Bonus LF</label>
                  <input type="number" min="1" value={editTeamFoulBonus} onChange={e => setEditTeamFoulBonus(parseInt(e.target.value))} className="w-full p-3 mt-1 rounded-xl bg-app-input border border-muted-line text-white focus:border-primary outline-none shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">TM Mi-temps 1</label>
                  <input type="number" min="0" value={editTimeoutsHalf1} onChange={e => setEditTimeoutsHalf1(parseInt(e.target.value))} className="w-full p-3 mt-1 rounded-xl bg-app-input border border-muted-line text-white focus:border-primary outline-none shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">TM Mi-temps 2</label>
                  <input type="number" min="0" value={editTimeoutsHalf2} onChange={e => setEditTimeoutsHalf2(parseInt(e.target.value))} className="w-full p-3 mt-1 rounded-xl bg-app-input border border-muted-line text-white focus:border-primary outline-none shadow-inner" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-3 rounded-xl font-black text-xs tracking-widest bg-app-input text-muted hover:text-white transition-colors cursor-pointer border border-muted-line">ANNULER</button>
                <button type="submit" disabled={isSaving} className="px-6 py-3 rounded-xl font-black text-xs tracking-widest bg-primary text-app-bg hover:bg-primary-light transition-colors cursor-pointer border-none disabled:opacity-50">
                  {isSaving ? 'SAUVEGARDE...' : 'ENREGISTRER ✅'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}