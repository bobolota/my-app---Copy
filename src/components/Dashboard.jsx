import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import KanbanColumn from './KanbanColumn';

export default function Dashboard() {
  const [name, setName] = useState("");
  const [draggedId, setDraggedId] = useState(null);
  const [pinCode, setPinCode] = useState("");
  const { session } = useAuth();
  
  // On récupère toutes les données nécessaires depuis l'AppContext
  const { tournaments, setTournaments, setActiveTourneyId, setView, userRole, userSubscription, myTeams, userProfile } = useAppContext();

  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const closeConfirm = () => setConfirmData(prev => ({ ...prev, isOpen: false }));
  
  const [promptData, setPromptData] = useState({ isOpen: false, title: '', message: '', placeholder: '', onConfirm: null });
  const closePrompt = () => setPromptData(prev => ({ ...prev, isOpen: false }));

  const [periodCount, setPeriodCount] = useState(4);
  const [periodDuration, setPeriodDuration] = useState(10);
  const [timeoutsHalf1, setTimeoutsHalf1] = useState(2);
  const [timeoutsHalf2, setTimeoutsHalf2] = useState(3);

  const canCreate = userRole === 'ADMIN' || userSubscription === 'PRO';

  // ==========================================
  // 🧠 CALCUL DES SECTIONS SELON LE RÔLE (UX)
  // ==========================================

  // 1. On liste les ID des équipes dans lesquelles le joueur est validé
  const myAcceptedTeamIds = useMemo(() => {
    return (myTeams || []).filter(m => m.status === 'accepted').map(m => m.global_teams?.id);
  }, [myTeams]);

  const userName = userProfile?.full_name || '';

  // 2. Les tournois que je gère en tant qu'organisateur
  const myOrganizedTourneys = useMemo(() => {
    return tournaments.filter(t => t.organizer_id === session?.user?.id || userRole === 'ADMIN');
  }, [tournaments, session, userRole]);

  // 3. Mes matchs (en tant que Joueur) et Mes matchs (en tant qu'OTM)
  const { myUpcomingMatches, myOtmMatches } = useMemo(() => {
    let upcoming = [];
    let otm = [];

    tournaments.forEach(t => {
      // On ignore les tournois terminés ou supprimés
      if (t.status === 'finished' || t.status === 'delete' || t.status === 'deleted') return;
      
      const matches = [...(t.schedule || []), ...(t.playoffs?.matches || [])];
      
      matches.forEach(m => {
        // On ignore les matchs terminés ou annulés
        if (m.status === 'finished' || m.status === 'canceled' || m.status === 'forfeit') return;
        
        // 🚨 Suis-je désigné comme OTM sur ce match ?
        if (m.otm && m.otm.includes(userName)) {
          otm.push({ ...m, tourneyId: t.id, tourneyName: t.name });
        }
        
        // 🏀 Suis-je joueur sur ce match ? (Une de mes équipes y participe)
        const isTeamA = m.teamA?.global_id && myAcceptedTeamIds.includes(m.teamA.global_id);
        const isTeamB = m.teamB?.global_id && myAcceptedTeamIds.includes(m.teamB.global_id);
        if (isTeamA || isTeamB) {
          upcoming.push({ ...m, tourneyId: t.id, tourneyName: t.name });
        }
      });
    });

    return { myUpcomingMatches: upcoming, myOtmMatches: otm };
  }, [tournaments, myAcceptedTeamIds, userName]);

  // ==========================================
  // 🛠️ FONCTIONS D'ACTION (Organisateur)
  // ==========================================

  const create = async () => {
    if (!canCreate || !name.trim()) return;
    const generatedPin = Math.random().toString(36).substring(2, 8).toUpperCase();
    const validUuid = crypto.randomUUID(); 
    const newT = { 
      id: validUuid, name, teams: [], schedule: [], status: 'preparing', 
      date: new Date().toLocaleDateString(), organizer_id: session.user.id,
      pin_code: generatedPin, otm_ids: [],
      matchsettings: { periodCount: parseInt(periodCount) || 4, periodDuration: parseInt(periodDuration) || 10, timeoutsHalf1: parseInt(timeoutsHalf1) || 2, timeoutsHalf2: parseInt(timeoutsHalf2) || 3 }
    };
    
    setTournaments([...tournaments, newT]);
    setName(""); setPeriodCount(4); setPeriodDuration(10); setTimeoutsHalf1(2); setTimeoutsHalf2(3);

    const { error } = await supabase.from('tournaments').insert([newT]);
    if (error) toast.error(`Erreur Cloud : ${error.message}`); 
    else toast.success("Tournoi créé avec succès ! 🚀");
  };

  const onDragStart = (e, tourney) => {
    if (!canCreate) { e.preventDefault(); return; }
    setDraggedId(tourney.id);
    e.dataTransfer.setData("tourneyId", tourney.id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnd = () => setDraggedId(null);
  const onDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('bg-[rgba(255,255,255,0.05)]'); };
  const onDragLeave = (e) => e.currentTarget.classList.remove('bg-[rgba(255,255,255,0.05)]');
  const onDrop = async (e, newStatus) => {
    e.preventDefault(); onDragLeave(e);
    const id = e.dataTransfer.getData("tourneyId");
    if (!id || !canCreate) return; 

    const updated = tournaments.map(t => t.id === id ? { ...t, status: newStatus } : t);
    setTournaments(updated);
    const { error } = await supabase.from('tournaments').update({ status: newStatus }).eq('id', id);
    if (error) toast.error("Erreur lors du déplacement du tournoi.");
  };

  const deleteTourney = (e, id) => {
    e.stopPropagation(); 
    setConfirmData({
      isOpen: true, title: "Supprimer le tournoi ? 🙈", message: "Veux-tu supprimer ce tournoi DÉFINITIVEMENT ?", isDanger: true, 
      onConfirm: async () => {
        setTournaments(tournaments.filter(t => t.id !== id));
        const { error } = await supabase.from('tournaments').update({ status: 'deleted' }).eq('id', id);
        if (error) toast.error("Erreur de connexion avec le cloud.");
        else toast.success("Le tournoi a été supprimé !"); 
      }
    });
  };

  // ==========================================
  // 💻 RENDU DE LA PAGE
  // ==========================================
  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1400px] mx-auto relative">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-white/10 pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">🛰️</span> 
          Centre de Contrôle
        </h1>
        <p className="mt-2 text-[#888] font-medium text-sm text-left">
          Espace d'administration et de gestion pour organiser tes événements sportifs.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        
        {/* 🚨 SECTION 1 : OTM (Priorité Absolue) */}
        

        {/* 🏀 SECTION 2 : JOUEUR (Mes prochains matchs) */}
          

        {/* 👑 SECTION 3 : ORGANISATEUR (Création et Gestion Kanban) */}
        {canCreate && (
          <section className="mt-2">
            
            {/* Formulaire de création PREMIUM */}
            <div className="bg-[#15151e]/80 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden mb-10 w-full xl:max-w-[950px] group">
              {/* Ligne LED décorative */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.6)]"></div>
              
              <strong className="flex items-center gap-2 text-sm text-purple-400 mb-6 uppercase tracking-widest font-black">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,1)]"></span>
                Créer un nouveau tournoi
              </strong>
              
              <input 
                className="w-full p-4 rounded-xl border border-white/10 bg-black/40 text-white placeholder-[#555] focus:outline-none focus:border-purple-500 focus:bg-black/60 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner mb-5 font-medium"
                placeholder="Nom de l'événement (ex: Summer League 2026)..." 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
              
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.65rem] text-[#888] font-bold uppercase tracking-widest">Périodes</label>
                  <input type="number" min="1" max="10" className="w-[80px] p-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-center focus:outline-none focus:border-purple-500 transition-all shadow-inner font-bold" value={periodCount} onChange={e => setPeriodCount(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.65rem] text-[#888] font-bold uppercase tracking-widest">Min/Période</label>
                  <input type="number" min="1" max="60" className="w-[90px] p-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-center focus:outline-none focus:border-purple-500 transition-all shadow-inner font-bold" value={periodDuration} onChange={e => setPeriodDuration(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.65rem] text-[#888] font-bold uppercase tracking-widest">TM 1ère MT</label>
                  <input type="number" min="0" max="10" className="w-[80px] p-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-center focus:outline-none focus:border-purple-500 transition-all shadow-inner font-bold" value={timeoutsHalf1} onChange={e => setTimeoutsHalf1(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.65rem] text-[#888] font-bold uppercase tracking-widest">TM 2ème MT</label>
                  <input type="number" min="0" max="10" className="w-[80px] p-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-center focus:outline-none focus:border-purple-500 transition-all shadow-inner font-bold" value={timeoutsHalf2} onChange={e => setTimeoutsHalf2(e.target.value)} />
                </div>
                
                <button 
                  onClick={create} 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none rounded-xl px-8 py-2.5 font-black tracking-widest cursor-pointer hover:shadow-[0_6px_20px_rgba(168,85,247,0.5)] transition-all shadow-[0_4px_15px_rgba(168,85,247,0.3)] hover:-translate-y-0.5 ml-auto sm:ml-0 text-sm h-[42px] mt-auto"
                >
                  CRÉER 🚀
                </button>
              </div>
            </div>

            {/* Kanban Organisateur PREMIUM */}
            <h3 className="text-[#888] font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="text-lg">🗂️</span> Mes tournois gérés
            </h3>
            <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-5 custom-scrollbar">
              <KanbanColumn 
                title="PRÉPARATION" status="preparing" accentHex="#9d4edd"
                visibleTournaments={myOrganizedTourneys} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                userRole={userRole} session={session} onDragStart={onDragStart} onDragEnd={onDragEnd}
                setActiveTourneyId={setActiveTourneyId} setView={setView} draggedId={draggedId} deleteTourney={deleteTourney}
              />
              <KanbanColumn 
                title="EN COURS" status="ongoing" accentHex="#3b82f6" // Changé en bleu pour correspondre au nouveau style
                visibleTournaments={myOrganizedTourneys} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                userRole={userRole} session={session} onDragStart={onDragStart} onDragEnd={onDragEnd}
                setActiveTourneyId={setActiveTourneyId} setView={setView} draggedId={draggedId} deleteTourney={deleteTourney}
              />
              <KanbanColumn 
                title="TERMINÉ" status="finished" accentHex="#10b981" // Changé en vert émeraude premium
                visibleTournaments={myOrganizedTourneys} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                userRole={userRole} session={session} onDragStart={onDragStart} onDragEnd={onDragEnd}
                setActiveTourneyId={setActiveTourneyId} setView={setView} draggedId={draggedId} deleteTourney={deleteTourney}
              />
            </div>
          </section>
        )}

        {/* 🟢 SECTION 4 : COMPTE VIDE (Raccourcis) */}
        {!canCreate && myUpcomingMatches.length === 0 && myOtmMatches.length === 0 && (
          <div className="bg-[#15151e]/60 backdrop-blur-md border border-white/5 rounded-3xl p-10 sm:p-14 text-center mt-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
            {/* Lueur de fond douce */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="text-6xl mb-6 drop-shadow-2xl">👋</div>
            <h2 className="text-2xl sm:text-3xl text-white font-black mb-3 tracking-wide">Bienvenue dans ton Espace !</h2>
            <p className="text-[#888] max-w-md mb-10 leading-relaxed text-sm font-medium">
              Tu n'as aucun match prévu pour le moment. Rejoins une équipe ou explore les tournois publics pour commencer l'aventure.
            </p>
            
            <div className="flex gap-4 flex-wrap justify-center relative z-10">
              <button 
                onClick={() => setView('explorer')} 
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-3.5 rounded-xl font-black tracking-widest text-sm shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] transition-all hover:-translate-y-1"
              >
                EXPLORER 🌍
              </button>
              <button 
                onClick={() => setView('vestiaire')} 
                className="bg-black/50 backdrop-blur-sm border border-white/10 text-white px-8 py-3.5 rounded-xl font-black tracking-widest text-sm hover:bg-white/10 transition-colors shadow-lg"
              >
                VESTIAIRE 👟
              </button>
            </div>
          </div>
        )}

      </div>

      <ConfirmModal 
        isOpen={confirmData.isOpen} title={confirmData.title} message={confirmData.message}
        onConfirm={() => { if (confirmData.onConfirm) confirmData.onConfirm(); closeConfirm(); }}
        onCancel={closeConfirm} isDanger={confirmData.isDanger}
      />

      <PromptModal 
        isOpen={promptData.isOpen} title={promptData.title} message={promptData.message} placeholder={promptData.placeholder}
        onConfirm={(value) => { if (promptData.onConfirm) promptData.onConfirm(value); closePrompt(); }}
        onCancel={closePrompt}
      />
    </div>
  );
}