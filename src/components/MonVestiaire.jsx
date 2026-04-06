import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function MonVestiaire({     
  myTeams, 
  hasTeam, 
  respondToInvite, 
  openTeamManager, 
  handleCreateTeam, 
  newTeamName, 
  setNewTeamName, 
  newTeamCity, 
  setNewTeamCity,
  cancelPendingRequest
}) {

  const { session } = useAuth();

  // On trie les équipes pour un affichage plus clair
  const invitations = myTeams.filter(mt => mt.status === 'invited');
  const activeTeams = myTeams.filter(mt => mt.status === 'accepted');
  const pendingTeams = myTeams.filter(mt => mt.status === 'pending');

  // Générateur d'écusson mis à jour avec le style Premium
  const TeamBadge = ({ name, colorClass = "from-orange-500 to-red-500" }) => (
    <div className={`w-14 h-14 shrink-0 rounded-full bg-gradient-to-tr ${colorClass} flex items-center justify-center text-2xl font-black text-white shadow-lg border border-white/10`}>
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );

  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1400px] mx-auto relative">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-white/10 pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">👟</span>
          Mon Vestiaire
        </h1>
        <p className="mt-2 text-[#888] font-medium text-sm text-left">
          Gère tes franchises, réponds à tes invitations ou fonde une nouvelle équipe.
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        
        {/* COLONNE GAUCHE : MES ÉQUIPES */}
        <div className="flex-[2] w-full flex flex-col gap-8">
          
          {/* 1. LES INVITATIONS (Priorité d'affichage) */}
          {invitations.length > 0 && (
            <section className="bg-[#15151e]/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 flex flex-col shadow-2xl relative overflow-hidden group">
              {/* Ligne LED décorative violette */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] opacity-80"></div>
              
              <h2 className="m-0 mb-6 text-purple-400 text-sm flex items-center gap-2 uppercase tracking-widest font-black relative z-10">
                <span className="animate-pulse text-lg">📩</span> INVITATIONS EN ATTENTE
              </h2>
              
              <div className="flex flex-col gap-4 relative z-10">
                {invitations.map(mt => {
                  const team = mt.global_teams;
                  return (
                    <div key={team.id} className="bg-[#1e1e2a] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg hover:border-purple-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <TeamBadge name={team.name} colorClass="from-purple-600 to-pink-500" />
                        <div>
                          <strong className="text-xl block text-white font-black tracking-wide">{team.name}</strong>
                          <span className="text-[10px] text-[#888] font-bold tracking-widest uppercase bg-black/30 px-2 py-0.5 rounded w-fit mt-1 border border-white/5 block">
                            📍 {team.city || 'Ville inconnue'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => respondToInvite(team.id, true)} 
                          disabled={hasTeam}
                          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-black tracking-widest transition-all ${
                            hasTeam 
                              ? 'bg-black/40 text-[#555] border border-white/5 cursor-not-allowed shadow-none' 
                              : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 cursor-pointer'
                          }`}
                        >
                          ACCEPTER
                        </button>
                        <button 
                          onClick={() => respondToInvite(team.id, false)} 
                          className="flex-1 sm:flex-none bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-lg text-xs font-black tracking-widest transition-all cursor-pointer"
                        >
                          REFUSER
                        </button>
                      </div>
                      {hasTeam && <span className="w-full text-xs text-red-400 font-bold sm:hidden">Limite de 3 équipes atteinte.</span>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. MES FRANCHISES ACTIVES */}
          <section className="bg-[#15151e]/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 flex flex-col shadow-2xl relative overflow-hidden group">
            {/* Ligne LED décorative bleue */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] opacity-80"></div>
            
            <h2 className="m-0 mb-6 text-blue-400 text-sm flex items-center gap-2 uppercase tracking-widest font-black relative z-10">
              <span className="text-lg">🛡️</span> MES FRANCHISES
            </h2>
            
            {activeTeams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-50 text-center relative z-10">
                <span className="text-5xl mb-4 drop-shadow-md">🪑</span>
                <h3 className="text-white text-lg font-black mb-2 tracking-wide">Ton casier est vide</h3>
                <p className="text-[#888] font-bold text-xs uppercase tracking-wider m-0 leading-relaxed max-w-sm">
                  Tu ne fais encore partie d'aucune équipe. Crées-en une ou rejoins des amis !
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 relative z-10">
                {activeTeams.map(mt => {
                  const team = mt.global_teams;
                  const isCaptain = team.captain_id === session.user.id;

                  return (
                    <div key={team.id} className="bg-[#1e1e2a] border border-white/5 p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 hover:border-blue-500/30 transition-all hover:-translate-y-0.5 shadow-lg group/item">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative">
                          <TeamBadge name={team.name} colorClass="from-blue-600 to-cyan-400" />
                          {isCaptain && <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[0.6rem] px-1.5 py-0.5 rounded shadow-sm font-black border border-[#111] tracking-wider">CAPITAINE</div>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h3 className="text-xl font-black text-white m-0 truncate group-hover/item:text-blue-300 transition-colors">{team.name}</h3>
                          <div className="text-[10px] text-[#888] font-bold tracking-widest uppercase bg-black/30 px-2 py-0.5 rounded w-fit mt-1 border border-white/5">
                            📍 {team.city || 'Ville non renseignée'}
                          </div>
                        </div>
                      </div>
                      
                      {isCaptain ? (
                        <button onClick={() => openTeamManager(team)} className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl text-xs font-black tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.5)] hover:-translate-y-0.5 transition-all cursor-pointer">
                          ⚙️ GÉRER L'ÉQUIPE
                        </button>
                      ) : (
                        <button onClick={() => openTeamManager(team)} className="w-full sm:w-auto bg-black/40 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-black tracking-widest hover:bg-white/10 transition-colors shadow-inner cursor-pointer">
                          👁️ VOIR EFFECTIF
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. CANDIDATURES EN ATTENTE */}
          {pendingTeams.length > 0 && (
            <section className="bg-[#15151e]/60 backdrop-blur-md border border-white/5 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <h2 className="m-0 mb-5 text-[#888] text-xs font-black uppercase tracking-widest flex items-center gap-2">
                ⏳ Demandes envoyées
              </h2>
              <div className="flex flex-col gap-3">
                {pendingTeams.map(mt => (
                  <div key={mt.global_teams.id} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-white font-bold">{mt.global_teams.name}</span>
                      <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-1">En attente de validation</span>
                    </div>
                    <button 
                      onClick={() => cancelPendingRequest(mt.global_teams.id)} 
                      className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black tracking-wider px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                    >
                      ANNULER
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* COLONNE DROITE : CRÉATION D'ÉQUIPE */}
        <div className="flex-1 w-full lg:max-w-[420px] shrink-0 lg:sticky lg:top-6">
          {hasTeam ? (
            <div className="bg-[#15151e]/80 backdrop-blur-md p-8 rounded-3xl border border-red-500/30 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none"></div>
              <div className="text-5xl mb-4 relative z-10 drop-shadow-lg">🚫</div>
              <h2 className="m-0 mb-3 text-red-400 text-lg font-black uppercase tracking-widest relative z-10">Limite atteinte</h2>
              <p className="text-[#888] text-sm font-medium leading-relaxed mb-0 relative z-10">
                Tu es déjà engagé dans 3 équipes maximum. Quitte l'une d'entre elles pour pouvoir en fonder ou en rejoindre une nouvelle.
              </p>
            </div>
          ) : (
            <div className="bg-[#15151e]/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
              {/* Lueur de fond orange */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/20 opacity-50 blur-[80px] rounded-full pointer-events-none transition-opacity group-hover:opacity-80"></div>
              
              <h2 className="m-0 mb-8 text-white text-xl font-black flex items-center gap-3 relative z-10">
                <span className="text-2xl drop-shadow-md">➕</span> Fonder une franchise
              </h2>

              {/* Aperçu en temps réel */}
              <div className="bg-black/40 p-4 rounded-2xl border border-white/10 mb-8 flex items-center gap-4 shadow-inner relative z-10">
                <TeamBadge name={newTeamName} colorClass="from-orange-500 to-red-500" />
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="text-white font-black text-lg truncate">{newTeamName || "Nouvelle Équipe"}</div>
                  <div className="text-[#888] text-[10px] font-bold uppercase tracking-widest truncate mt-1">📍 {newTeamCity || "Ville"}</div>
                </div>
              </div>

              <form onSubmit={handleCreateTeam} className="flex flex-col gap-5 relative z-10">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-[#888] font-black uppercase tracking-widest ml-1">Nom de la franchise</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Chicago Bulls" 
                    value={newTeamName} 
                    onChange={e => setNewTeamName(e.target.value)} 
                    required 
                    className="p-4 rounded-xl border border-white/10 bg-black/40 text-white placeholder-[#666] focus:outline-none focus:border-orange-500 focus:bg-black/60 transition-all shadow-inner font-medium text-sm"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-[#888] font-black uppercase tracking-widest ml-1">Ville de rattachement</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Lyon" 
                    value={newTeamCity} 
                    onChange={e => setNewTeamCity(e.target.value)} 
                    className="p-4 rounded-xl border border-white/10 bg-black/40 text-white placeholder-[#666] focus:outline-none focus:border-orange-500 focus:bg-black/60 transition-all shadow-inner font-medium text-sm"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={!newTeamName.trim()}
                  className={`mt-4 p-4 rounded-xl font-black tracking-widest text-sm transition-all ${
                    newTeamName.trim() 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-[0_4px_15px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 cursor-pointer' 
                      : 'bg-black/40 text-[#555] cursor-not-allowed border border-white/5 shadow-none'
                  }`}
                >
                  CRÉER MON ÉQUIPE 🚀
                </button>
              </form>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}