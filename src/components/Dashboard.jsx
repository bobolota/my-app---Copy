import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';

// 👇 On importe notre colonne Kanban !
import KanbanColumn from './KanbanColumn';

export default function Dashboard() {
  const [name, setName] = useState("");
  const [draggedId, setDraggedId] = useState(null);
  const [pinCode, setPinCode] = useState("");
  const { session } = useAuth();
  
  const { tournaments, setTournaments, setActiveTourneyId, setView, userRole, userSubscription } = useAppContext();

  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false });
  const closeConfirm = () => setConfirmData(prev => ({ ...prev, isOpen: false }));
  
  const [promptData, setPromptData] = useState({ isOpen: false, title: '', message: '', placeholder: '', onConfirm: null });
  const closePrompt = () => setPromptData(prev => ({ ...prev, isOpen: false }));

  const [periodCount, setPeriodCount] = useState(4);
  const [periodDuration, setPeriodDuration] = useState(10);
  const [timeoutsHalf1, setTimeoutsHalf1] = useState(2);
  const [timeoutsHalf2, setTimeoutsHalf2] = useState(3);

  const canCreate = userRole === 'ADMIN' || userSubscription === 'PRO';

  const visibleTournaments = tournaments.filter(t => {
    if (userRole === 'ADMIN') return true;       
    if (userRole === 'SPECTATOR') return true;   
    
    const isOwner = t.organizer_id === session.user.id;
    const isInvitedOtm = t.otm_ids && t.otm_ids.includes(session.user.id);
    
    return isOwner || isInvitedOtm;
  });

  const create = async () => {
    if (!canCreate || !name.trim()) return;
    
    const generatedPin = Math.random().toString(36).substring(2, 8).toUpperCase();
    const validUuid = crypto.randomUUID(); // 👈 ON GÉNÈRE UN VRAI UUID VALIDE ICI !

    const newT = { 
      id: validUuid, // 👈 On l'envoie à Supabase
      name, 
      teams: [], 
      schedule: [], 
      status: 'preparing', 
      date: new Date().toLocaleDateString(),
      organizer_id: session.user.id,
      pin_code: generatedPin,
      otm_ids: [],
      matchsettings: {
        periodCount: parseInt(periodCount) || 4,
        periodDuration: parseInt(periodDuration) || 10,
        timeoutsHalf1: parseInt(timeoutsHalf1) || 2,
        timeoutsHalf2: parseInt(timeoutsHalf2) || 3
      }
    };
    
    // Mise à jour immédiate de l'interface pour que ce soit fluide
    setTournaments([...tournaments, newT]);
    setName("");
    setPeriodCount(4);
    setPeriodDuration(10);
    setTimeoutsHalf1(2); setTimeoutsHalf2(3);

    // Envoi au cloud Supabase
    const { error } = await supabase.from('tournaments').insert([newT]);
    
    if (error) {
      console.error("Détail de l'erreur Supabase :", error);
      // On affiche le vrai message d'erreur de Supabase pour comprendre si ça bloque encore
      toast.error(`Erreur Cloud : ${error.message}`); 
    } else {
      toast.success("Tournoi créé avec succès ! 🚀");
    }
  };

  const joinAsOtm = async () => {
    if (!pinCode.trim()) return;
    
    try {
      const { data, error } = await supabase.rpc('join_as_otm', { pin: pinCode.trim().toUpperCase() });
      if (error) throw error;
      
      toast.success("Succès ! Vous êtes maintenant OTM sur ce tournoi.");
      setPinCode("");
      
    } catch (error) {
      toast.error(error.message || "Code PIN invalide.");
    }
  };

  const onDragStart = (e, tourney) => {
    const canEditTourney = userRole === 'ADMIN' || tourney.organizer_id === session.user.id;
    if (!canEditTourney) { e.preventDefault(); return; }
    
    setDraggedId(tourney.id);
    e.dataTransfer.setData("tourneyId", tourney.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragEnd = (e, tourney) => {
    setDraggedId(null);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-[rgba(255,255,255,0.05)]');
  };

  const onDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-[rgba(255,255,255,0.05)]');
  };

  const onDrop = async (e, newStatus) => {
    e.preventDefault();
    onDragLeave(e);
    
    const id = e.dataTransfer.getData("tourneyId");
    if (!id) return; 

    const tourney = tournaments.find(t => t.id === id);
    if (userRole !== 'ADMIN' && tourney.organizer_id !== session.user.id) {
        toast.error("Seul l'organisateur peut déplacer le tournoi.");
        return;
    }

    const updated = tournaments.map(t => t.id === id ? { ...t, status: newStatus } : t);
    setTournaments(updated);

    const { error } = await supabase.from('tournaments').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error("Erreur de mise à jour :", error);
      toast.error("Erreur lors du déplacement du tournoi.");
    }
  };

  const deleteTourney = (e, id) => {
    e.stopPropagation(); 
    
    setConfirmData({
      isOpen: true,
      title: "Supprimer le tournoi ? 🙈",
      message: "Veux-tu supprimer ce tournoi DÉFINITIVEMENT ?",
      isDanger: true, 
      onConfirm: async () => {
        setTournaments(tournaments.filter(t => t.id !== id));

        const { error } = await supabase
          .from('tournaments')
          .update({ status: 'deleted' })
          .eq('id', id);

        if (error) {
          console.error("Erreur lors de la mise à jour du statut :", error);
          toast.error("Erreur de connexion avec le cloud.");
        } else {
          toast.success("Le tournoi a été supprimé !"); 
        }
      }
    });
  };

  return (
    <div className="flex flex-col w-full h-full max-w-[1920px] mx-auto p-2 sm:p-5">
      <div className="mb-8">
        <h1 className="text-2xl text-white border-b-2 border-[#333] pb-3 mb-6 font-bold"> 
          🛰️ Centre de Contrôle
        </h1>
        
        {canCreate && (
          <div className="bg-[#1a1a1a] p-5 rounded-xl border border-dashed border-[var(--accent-purple)] w-full xl:max-w-[800px] shadow-lg">
            <strong className="block text-base text-[var(--accent-purple)] mb-4 uppercase tracking-widest">
              🛠 Créer un nouveau tournoi
            </strong>
            
            <input 
              className="w-full p-3 rounded-lg border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-purple)] transition-colors mb-4 text-lg"
              placeholder="Nom de l'événement (ex: Summer League 2026)..." 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
            
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[0.75rem] text-[#888] font-bold uppercase tracking-wider">Périodes</label>
                <input type="number" min="1" max="10" className="w-[70px] p-2.5 rounded-lg border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-purple)]" value={periodCount} onChange={e => setPeriodCount(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.75rem] text-[#888] font-bold uppercase tracking-wider">Min/Période</label>
                <input type="number" min="1" max="60" className="w-[85px] p-2.5 rounded-lg border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-purple)]" value={periodDuration} onChange={e => setPeriodDuration(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.75rem] text-[#888] font-bold uppercase tracking-wider">TM 1ère MT</label>
                <input type="number" min="0" max="10" className="w-[80px] p-2.5 rounded-lg border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-purple)]" value={timeoutsHalf1} onChange={e => setTimeoutsHalf1(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.75rem] text-[#888] font-bold uppercase tracking-wider">TM 2ème MT</label>
                <input type="number" min="0" max="10" className="w-[80px] p-2.5 rounded-lg border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-purple)]" value={timeoutsHalf2} onChange={e => setTimeoutsHalf2(e.target.value)} />
              </div>
              
              <button 
                onClick={create} 
                className="bg-[var(--accent-purple)] text-white border-none rounded-lg px-6 py-2.5 font-bold cursor-pointer hover:bg-purple-600 transition-all shadow-[0_4px_15px_rgba(157,78,221,0.3)] hover:-translate-y-0.5 ml-auto sm:ml-0"
              >
                + CRÉER
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-5 custom-scrollbar">
        {/* 👇 Les 3 colonnes sont générées via notre nouveau composant ! 👇 */}
        <KanbanColumn 
          title="PRÉPARATION" status="preparing" accentHex="#9d4edd"
          visibleTournaments={visibleTournaments} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          userRole={userRole} session={session} onDragStart={onDragStart} onDragEnd={onDragEnd}
          setActiveTourneyId={setActiveTourneyId} setView={setView} draggedId={draggedId} deleteTourney={deleteTourney}
        />
        <KanbanColumn 
          title="EN COURS" status="ongoing" accentHex="#ff6b00"
          visibleTournaments={visibleTournaments} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          userRole={userRole} session={session} onDragStart={onDragStart} onDragEnd={onDragEnd}
          setActiveTourneyId={setActiveTourneyId} setView={setView} draggedId={draggedId} deleteTourney={deleteTourney}
        />
        <KanbanColumn 
          title="TERMINÉ" status="finished" accentHex="#2ecc71"
          visibleTournaments={visibleTournaments} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          userRole={userRole} session={session} onDragStart={onDragStart} onDragEnd={onDragEnd}
          setActiveTourneyId={setActiveTourneyId} setView={setView} draggedId={draggedId} deleteTourney={deleteTourney}
        />
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