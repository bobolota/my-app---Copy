import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import KanbanColumn from './KanbanColumn';

export default function Dashboard() {
  const [name, setName] = useState("");
  const [tourneyDate, setTourneyDate] = useState("");
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
  const [maxFouls, setMaxFouls] = useState(5);
  const [bonusFouls, setBonusFouls] = useState(4);
  const [courtSize, setCourtSize] = useState(5);
  const [pointsSystem, setPointsSystem] = useState('classic'); // 'classic' (2/3 pts) ou 'street' (1/2 pts)
  const [targetScore, setTargetScore] = useState(''); // vide = pas de limite de score

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
      
      // 🚀 V2 : On lit en priorité la nouvelle table "matches"
      const matches = [
        ...(t.matches || []),
        ...(t.matches ? [] : (t.schedule || [])),
        ...(t.matches ? [] : (t.playoffs?.matches || []))
      ];
      
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
      id: validUuid, name, teams: [], status: 'preparing', // 👈 On a retiré schedule: [] ici !
      date: tourneyDate || null, organizer_id: session.user.id,
      pin_code: generatedPin, otm_ids: [],
      matchsettings: { 
          courtSize: parseInt(courtSize) || 5, 
          periodCount: parseInt(courtSize) === 5 ? (parseInt(periodCount) || 4) : 1, 
          // ... le reste de tes paramètres 
          periodDuration: parseInt(periodDuration) || 10, 
          timeoutsHalf1: parseInt(timeoutsHalf1) || 2, 
          timeoutsHalf2: parseInt(courtSize) === 5 ? (parseInt(timeoutsHalf2) || 3) : 0, 
          maxFouls: parseInt(courtSize) === 5 ? (parseInt(maxFouls) || 5) : 99,
          bonusFouls: parseInt(bonusFouls) || 4, 
          pointsSystem: (parseInt(courtSize) === 1 || parseInt(courtSize) === 3) ? pointsSystem : 'classic', 
          targetScore: (parseInt(courtSize) === 1 || parseInt(courtSize) === 3) && targetScore ? parseInt(targetScore) : null 
      }
    };
    
    setTournaments([...tournaments, newT]);
    setName(""); setTourneyDate(""); setPeriodCount(4); setPeriodDuration(10); setTimeoutsHalf1(2); setTimeoutsHalf2(3); setCourtSize(5); setMaxFouls(5); setBonusFouls(4);

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
  // 🪄 LA MAGIE DU LIEN D'INVITATION DIRECT (INTELLIGENT)
  // ==========================================
  useEffect(() => {
    // On vérifie que la liste des tournois est bien chargée
    if (tournaments && tournaments.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetTourneyId = params.get('t');

      if (targetTourneyId) {
        const tourneyExists = tournaments.find(t => t.id === targetTourneyId);
        
        if (tourneyExists) {
          // 1. On vérifie si l'utilisateur est DÉJÀ inscrit
          const myAcceptedTeamIds = (myTeams || []).filter(m => m.status === 'accepted').map(m => m.global_teams?.id);
          const isRegistered = tourneyExists.teams?.some(team => {
              const isOfficial = myAcceptedTeamIds.includes(team.global_id);
              const isPhantom = team.players?.some(p => p.id === session?.user?.id || p.profile_id === session?.user?.id);
              return isOfficial || isPhantom;
          });
          
          const isOrganizer = tourneyExists.organizer_id === session?.user?.id;

          // 2. 🚦 REDIRECTION INTELLIGENTE
          if (!isRegistered && !isOrganizer && tourneyExists.status === 'preparing') {
             // 👉 Il n'est pas inscrit : On l'envoie sur l'Explorer (qui chargera PlayerDashboard)
             setView('explorer');
             
             // ⚠️ TRÈS IMPORTANT : On NE NETTOIE PAS l'URL ici ! 
             // On laisse le "?t=" pour que PlayerDashboard puisse le lire et ouvrir la modale.
             
          } else {
             // 👉 Il est inscrit ou orga : On ouvre directement le tableau de bord du tournoi
             setActiveTourneyId(targetTourneyId);
             setView('tournament');
             
             // Ici on peut nettoyer l'URL, car on n'a pas besoin d'ouvrir de modale
             window.history.replaceState({}, document.title, window.location.pathname);
          }
          
        } else {
           // Si le tournoi n'existe pas ou a été supprimé
           toast.error("Le tournoi recherché n'existe pas ou est privé.");
           window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [tournaments, myTeams, session, setActiveTourneyId, setView]);

  // ==========================================
  // 💻 RENDU DE LA PAGE
  // ==========================================
  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1400px] mx-auto relative">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-muted-line pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">🛰️</span> 
          Centre de Contrôle
        </h1>
        <p className="mt-2 text-muted font-medium text-sm text-left">
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
            <div className="bg-app-panel/80 backdrop-blur-md p-6 rounded-2xl border border-muted-line shadow-2xl relative overflow-hidden mb-10 w-full xl:max-w-[950px] group">
              {/* Ligne LED décorative (Action vers Primary) */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-action to-primary shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
              
              <strong className="flex items-center gap-2 text-sm text-action mb-6 uppercase tracking-widest font-black">
                <span className="w-2 h-2 rounded-full bg-action animate-pulse shadow-[0_0_8px_rgba(59,130,246,1)]"></span>
                Créer un nouveau tournoi
              </strong>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                <input 
                  className="flex-1 p-4 rounded-xl border border-muted-line bg-app-input text-white placeholder:text-muted-dark focus:outline-none focus:border-action focus:bg-app-bg focus:ring-1 focus:ring-action transition-all shadow-inner font-medium"
                  placeholder="Nom de l'événement (ex: Summer League 2026)..." 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
                <input 
                  type="date" 
                  className="w-full sm:w-[200px] p-4 rounded-xl border border-muted-line bg-app-input text-muted-light focus:outline-none focus:border-action focus:bg-app-bg focus:ring-1 focus:ring-action transition-all shadow-inner font-medium"
                  value={tourneyDate} 
                  onChange={e => setTourneyDate(e.target.value)} 
                  title="Date de l'événement"
                />
              </div>

              {/* FORMAT DE JEU */}
              <div className="flex flex-col gap-1.5 mb-5">
                <label className="text-[0.65rem] text-muted font-bold uppercase tracking-widest">Format</label>
                <div className="flex gap-2 h-[42px]">
                  {[
                    { label: '5x5', value: 5 },
                    { label: '3x3', value: 3 },
                    { label: '1x1', value: 1 }
                  ].map(format => (
                    <button
                      key={format.value}
                      type="button"
                      onClick={() => setCourtSize(format.value)}
                      className={`px-4 rounded-xl font-black tracking-widest text-xs transition-all border ${
                        courtSize === format.value 
                          ? 'bg-gradient-to-r from-action to-primary text-white border-transparent shadow-[0_4px_10px_rgba(59,130,246,0.3)]' 
                          : 'bg-transparent text-muted-dark border-muted-line hover:border-action/30 hover:text-white'
                      }`}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* NOUVELLES OPTIONS 1v1 / 3x3 (Points & Score Cible) */}
              {(courtSize === 1 || courtSize === 3) && (
                <div className="flex flex-wrap items-end gap-4 mb-5 p-5 bg-action/10 border border-action/20 rounded-xl shadow-inner relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-action/50"></div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] text-action-light font-bold uppercase tracking-widest">Valeur des Paniers</label>
                    <div className="flex gap-2 h-[42px]">
                      <button
                        type="button"
                        onClick={() => setPointsSystem('classic')}
                        className={`px-4 rounded-xl font-black tracking-widest text-[10px] transition-all border ${pointsSystem === 'classic' ? 'bg-action text-white border-transparent shadow-md' : 'bg-app-input text-muted border-muted-line hover:border-action/30 hover:text-white'}`}
                      >
                        2 PTS / 3 PTS
                      </button>
                      <button
                        type="button"
                        onClick={() => setPointsSystem('street')}
                        className={`px-4 rounded-xl font-black tracking-widest text-[10px] transition-all border ${pointsSystem === 'street' ? 'bg-action text-white border-transparent shadow-md' : 'bg-app-input text-muted border-muted-line hover:border-action/30 hover:text-white'}`}
                      >
                        1 PT / 2 PTS
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] text-action-light font-bold uppercase tracking-widest" title="Le match se termine automatiquement si atteint">Score Cible (Optionnel)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="1" 
                        placeholder="ex: 21" 
                        className="w-[140px] h-[42px] p-2.5 rounded-xl border border-muted-line bg-app-input text-white text-center focus:outline-none focus:border-action transition-all shadow-inner font-black placeholder:text-muted-dark placeholder:font-medium" 
                        value={targetScore} 
                        onChange={e => setTargetScore(e.target.value)} 
                      />
                      {targetScore && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted">PTS</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* RÉGLAGES ALIGNÉS SELON LE FORMAT */}
              <div className="flex flex-wrap items-end gap-4">
                
                {/* 5x5 UNIQUEMENT */}
                {courtSize === 5 && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.65rem] text-muted font-bold uppercase tracking-widest">Périodes</label>
                      <input type="number" min="1" max="10" className="w-[80px] h-[42px] p-2.5 rounded-xl border border-muted-line bg-app-input text-white text-center focus:outline-none focus:border-action transition-all shadow-inner font-bold" value={periodCount} onChange={e => setPeriodCount(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.65rem] text-muted font-bold uppercase tracking-widest">Min/Période</label>
                      <input type="number" min="1" max="60" className="w-[90px] h-[42px] p-2.5 rounded-xl border border-muted-line bg-app-input text-white text-center focus:outline-none focus:border-action transition-all shadow-inner font-bold" value={periodDuration} onChange={e => setPeriodDuration(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.65rem] text-muted font-bold uppercase tracking-widest">TM 1ère MT</label>
                      <input type="number" min="0" max="10" className="w-[80px] h-[42px] p-2.5 rounded-xl border border-muted-line bg-app-input text-white text-center focus:outline-none focus:border-action transition-all shadow-inner font-bold" value={timeoutsHalf1} onChange={e => setTimeoutsHalf1(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.65rem] text-muted font-bold uppercase tracking-widest">TM 2ème MT</label>
                      <input type="number" min="0" max="10" className="w-[80px] h-[42px] p-2.5 rounded-xl border border-muted-line bg-app-input text-white text-center focus:outline-none focus:border-action transition-all shadow-inner font-bold" value={timeoutsHalf2} onChange={e => setTimeoutsHalf2(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.65rem] text-muted font-bold uppercase tracking-widest" title="Fautes avant exclusion">Fautes Max</label>
                      <input type="number" min="1" max="15" className="w-[80px] h-[42px] p-2.5 rounded-xl border border-muted-line bg-app-input text-white text-center focus:outline-none focus:border-action transition-all shadow-inner font-bold" value={maxFouls} onChange={e => setMaxFouls(e.target.value)} />
                    </div>
                  </>
                )}

                {/* 3x3 ET 1v1 UNIQUEMENT */}
                {(courtSize === 3 || courtSize === 1) && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.65rem] text-muted font-bold uppercase tracking-widest">Chrono (Min)</label>
                      <input type="number" min="1" max="60" className="w-[90px] h-[42px] p-2.5 rounded-xl border border-muted-line bg-app-input text-white text-center focus:outline-none focus:border-action transition-all shadow-inner font-bold" value={periodDuration} onChange={e => setPeriodDuration(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.65rem] text-muted font-bold uppercase tracking-widest">Temps Morts</label>
                      <input type="number" min="0" max="10" className="w-[90px] h-[42px] p-2.5 rounded-xl border border-muted-line bg-app-input text-white text-center focus:outline-none focus:border-action transition-all shadow-inner font-bold" value={timeoutsHalf1} onChange={e => setTimeoutsHalf1(e.target.value)} />
                    </div>
                  </>
                )}

                {/* COMMUN À TOUS */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.65rem] text-muted font-bold uppercase tracking-widest" title="Fautes d'équipe avant pénalité">Pénalité ÉQ.</label>
                  <input type="number" min="1" max="15" className="w-[80px] h-[42px] p-2.5 rounded-xl border border-muted-line bg-app-input text-white text-center focus:outline-none focus:border-action transition-all shadow-inner font-bold" value={bonusFouls} onChange={e => setBonusFouls(e.target.value)} />
                </div>
                
                <button 
                  onClick={create} 
                  className="bg-gradient-to-r from-action to-primary text-white border-none rounded-xl px-8 py-2.5 font-black tracking-widest cursor-pointer hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] transition-all shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 ml-auto sm:ml-0 text-sm h-[42px] mt-auto"
                >
                  CRÉER 🚀
                </button>
              </div>
            </div>

            {/* Kanban Organisateur PREMIUM */}
            <h3 className="text-muted font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="text-lg">🗂️</span> Mes tournois gérés
            </h3>
            <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-5 custom-scrollbar">
              <KanbanColumn 
                title="PRÉPARATION" status="preparing" accentHex="#f97316" // Orange (secondary)
                visibleTournaments={myOrganizedTourneys} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                userRole={userRole} session={session} onDragStart={onDragStart} onDragEnd={onDragEnd}
                setActiveTourneyId={setActiveTourneyId} setView={setView} draggedId={draggedId} deleteTourney={deleteTourney}
              />
              <KanbanColumn 
                title="EN COURS" status="ongoing" accentHex="#3b82f6" // Bleu (action)
                visibleTournaments={myOrganizedTourneys} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                userRole={userRole} session={session} onDragStart={onDragStart} onDragEnd={onDragEnd}
                setActiveTourneyId={setActiveTourneyId} setView={setView} draggedId={draggedId} deleteTourney={deleteTourney}
              />
              <KanbanColumn 
                title="TERMINÉ" status="finished" accentHex="#10b981" // Vert (primary)
                visibleTournaments={myOrganizedTourneys} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                userRole={userRole} session={session} onDragStart={onDragStart} onDragEnd={onDragEnd}
                setActiveTourneyId={setActiveTourneyId} setView={setView} draggedId={draggedId} deleteTourney={deleteTourney}
              />
            </div>
          </section>
        )}

        {/* 🟢 SECTION 4 : COMPTE VIDE (Raccourcis) */}
        {!canCreate && myUpcomingMatches.length === 0 && myOtmMatches.length === 0 && (
          <div className="bg-app-panel/60 backdrop-blur-md border border-muted-line rounded-3xl p-10 sm:p-14 text-center mt-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
            {/* Lueur de fond douce */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-action/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="text-6xl mb-6 drop-shadow-2xl">👋</div>
            <h2 className="text-2xl sm:text-3xl text-white font-black mb-3 tracking-wide">Bienvenue dans ton Espace !</h2>
            <p className="text-muted max-w-md mb-10 leading-relaxed text-sm font-medium">
              Tu n'as aucun match prévu pour le moment. Rejoins une équipe ou explore les tournois publics pour commencer l'aventure.
            </p>
            
            <div className="flex gap-4 flex-wrap justify-center relative z-10">
              <button 
                onClick={() => setView('explorer')} 
                className="bg-gradient-to-r from-action to-action-light text-white px-8 py-3.5 rounded-xl font-black tracking-widest text-sm shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] transition-all hover:-translate-y-1"
              >
                EXPLORER 🌍
              </button>
              <button 
                onClick={() => setView('vestiaire')} 
                className="bg-app-input/50 backdrop-blur-sm border border-muted-line text-white px-8 py-3.5 rounded-xl font-black tracking-widest text-sm hover:bg-muted-line transition-colors shadow-lg"
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