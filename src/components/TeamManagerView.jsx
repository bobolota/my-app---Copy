import React from 'react';

export default function TeamManagerView({
  session,
  managingTeam,
  setManagingTeam,
  roster,
  acceptedPlayers,
  pendingPlayers,
  invitedPlayers,
  isCaptainView,
  setTransferModalOpen,
  handleDeleteTeam,
  viewPlayerProfile,
  acceptPlayer,
  removePlayer,
  handleAddGhostPlayer,
  newGhostName,
  setNewGhostName
}) {

  const TeamBadge = ({ name, colorClass = "from-blue-600 to-cyan-400" }) => (
    <div className={`w-16 h-16 shrink-0 rounded-full bg-gradient-to-tr ${colorClass} flex items-center justify-center text-3xl font-black text-white shadow-lg border-2 border-white/10 relative z-10`}>
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );

  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1400px] mx-auto relative">
      
      {/* BOUTON RETOUR PREMIUM */}
      <button 
        onClick={() => { setManagingTeam(null); localStorage.removeItem('managingTeamId'); }} 
        className="w-fit mb-6 bg-black/40 border border-white/10 text-[#aaa] px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 hover:-translate-x-1 cursor-pointer shadow-inner"
      >
        ⬅ RETOUR AU VESTIAIRE
      </button>
      
      {/* EN-TÊTE DE L'ÉQUIPE PREMIUM */}
      <div className="bg-[#15151e]/80 backdrop-blur-md border border-white/5 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 relative overflow-hidden group">
        {/* Lueur de fond bleue */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none transition-opacity group-hover:opacity-100 opacity-60"></div>
        {/* Ligne LED */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] opacity-80"></div>
        
        <div className="flex items-center gap-5 relative z-10 w-full lg:w-auto">
          <TeamBadge name={managingTeam.name} />
          <div className="flex flex-col flex-1 min-w-0">
            <h1 className="m-0 text-2xl sm:text-3xl font-black text-white tracking-wide flex items-center flex-wrap gap-3">
              <span className="truncate">{managingTeam.name}</span>
              {isCaptainView && (
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] px-2.5 py-1 rounded-md shadow-sm font-black uppercase tracking-widest shrink-0">
                  👑 Mode Capitaine
                </span>
              )}
            </h1>
            <span className="text-[#888] font-bold tracking-widest uppercase text-xs mt-1.5 block bg-black/30 px-2.5 py-1 rounded-md w-fit border border-white/5">
              📍 {managingTeam.city || 'Ville inconnue'}
            </span>
          </div>
        </div>

        {/* ACTIONS CAPITAINE : Séparées pour gérer les conditions correctement */}
        {isCaptainView && (
          <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full lg:w-auto mt-2 lg:mt-0">
            {/* On ne peut léguer que s'il y a d'autres joueurs */}
            {acceptedPlayers.length > 1 && (
              <button 
                onClick={() => setTransferModalOpen(true)} 
                className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3.5 rounded-xl text-xs font-black tracking-widest hover:shadow-[0_4px_15px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                👑 LÉGUER LE BRASSARD
              </button>
            )}

            {/* Mais on peut toujours dissoudre ! */}
            <button 
              onClick={handleDeleteTeam} 
              className="w-full sm:w-auto bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-3.5 rounded-xl text-xs font-black tracking-widest hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              DISSOUDRE ⚠️
            </button>
          </div>
        )}
      </div>

      {/* Formulaire Ajout Ghost PREMIUM */}
          {isCaptainView && (
            <form 
              onSubmit={handleAddGhostPlayer} 
              // 👇 J'ai remplacé mt-8 par mt-4 et ajouté mb-8 ici 👇
              className="flex flex-col sm:flex-row gap-4 mt-4 mb-8 pt-6 border-t border-white/5 relative z-10 bg-black/20 p-5 rounded-2xl shadow-inner"
            >
              <div className="flex-1 flex flex-col gap-2">
                 <label className="text-[10px] text-[#888] font-black uppercase tracking-widest ml-1">Inviter un joueur sans compte (Manuel)</label>
                 <input 
                   type="text" 
                   value={newGhostName} 
                   onChange={e => setNewGhostName(e.target.value)} 
                   placeholder="Saisis un nom complet..." 
                   className="w-full p-4 rounded-xl bg-black/40 text-white placeholder-[#666] border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner text-sm font-medium"
                 />
              </div>
              <button 
                type="submit" 
                disabled={!newGhostName.trim()} 
                className={`sm:self-end px-8 py-4 rounded-xl font-black tracking-widest text-xs transition-all ${newGhostName.trim() ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white cursor-pointer hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5' : 'bg-black/40 text-[#555] cursor-not-allowed border border-white/5 shadow-none'}`}
              >
                AJOUTER 👤
              </button>
            </form>
          )}

      {/* CONTENU PRINCIPAL */}
      <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10">
        
        {/* COLONNE GAUCHE (Demandes et Invitations) - Uniquement Capitaine */}
        {isCaptainView && (
          <div className="flex-1 w-full flex flex-col gap-8 lg:max-w-[450px]">
            
            {/* CANDIDATURES */}
            <section className="bg-[#15151e]/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_15px_rgba(249,115,22,0.4)] opacity-80"></div>
              
              <h2 className="m-0 mb-6 text-orange-400 text-sm font-black uppercase tracking-widest flex items-center justify-between gap-2 relative z-10">
                <span className="flex items-center gap-2"><span className="text-lg">⏳</span> Candidatures</span>
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs px-3 py-1 rounded-lg shadow-inner">{pendingPlayers.length}</span>
              </h2>
              
              {pendingPlayers.length === 0 ? (
                 <div className="bg-black/40 border border-white/5 p-6 rounded-2xl text-center text-[#666] text-xs font-bold uppercase tracking-wider relative z-10 shadow-inner">
                   Aucune demande en attente
                 </div>
              ) : (
                <div className="flex flex-col gap-4 relative z-10 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {pendingPlayers.map(p => (
                    <div key={p.id || p.player_id} className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-[#1e1e2a] p-4 rounded-2xl border border-white/5 gap-4 hover:border-orange-500/30 transition-all shadow-lg">
                      <strong 
                        onClick={() => viewPlayerProfile({ id: p.player_id, full_name: p.full_name })} 
                        className="cursor-pointer text-white font-black text-base hover:text-orange-400 transition-colors truncate max-w-[200px]" 
                        title="Voir le profil"
                      >
                        {p.full_name}
                      </strong>
                      <div className="flex gap-2 w-full xl:w-auto shrink-0">
                        <button onClick={() => acceptPlayer(p.player_id)} className="flex-1 xl:flex-none bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2.5 rounded-xl text-xs font-black tracking-widest hover:shadow-[0_4px_10px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-0.5 cursor-pointer">
                          ACCEPTER
                        </button>
                        <button onClick={() => removePlayer(p.player_id, false)} className="flex-1 xl:flex-none bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-black tracking-widest hover:bg-red-500 hover:text-white transition-all cursor-pointer">
                          REFUSER
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* INVITATIONS */}
            <section className="bg-[#15151e]/60 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
               <h2 className="m-0 mb-6 text-[#aaa] text-sm font-black uppercase tracking-widest flex items-center justify-between gap-2 relative z-10">
                <span className="flex items-center gap-2"><span className="text-lg">✉️</span> Invitations</span>
                <span className="bg-black/40 text-[#aaa] border border-white/10 text-xs px-3 py-1 rounded-lg shadow-inner">{invitedPlayers.length}</span>
              </h2>
              
              {invitedPlayers.length === 0 ? (
                 <div className="bg-black/40 border border-white/5 p-6 rounded-2xl text-center text-[#666] text-xs font-bold uppercase tracking-wider relative z-10 shadow-inner">
                   Aucune invitation en cours
                 </div>
              ) : (
                <div className="flex flex-col gap-3 relative z-10 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {invitedPlayers.map(p => (
                    <div key={p.id || p.player_id} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors shadow-inner">
                      <strong 
                        onClick={() => viewPlayerProfile({ id: p.player_id, full_name: p.full_name })} 
                        className="cursor-pointer text-[#ccc] font-bold text-sm hover:text-white transition-colors truncate" 
                      >
                        {p.full_name}
                      </strong>
                      <button onClick={() => removePlayer(p.player_id, false)} className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-colors cursor-pointer shrink-0 ml-3">
                        Annuler
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
        
        {/* COLONNE DROITE (Effectif actuel) */}
        <section className={`bg-[#15151e]/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden flex flex-col ${isCaptainView ? 'flex-[2]' : 'w-full'}`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] opacity-80"></div>
          
          <h2 className="m-0 mb-8 text-emerald-400 text-sm font-black uppercase tracking-widest flex items-center justify-between gap-2 relative z-10">
            <span className="flex items-center gap-2"><span className="text-lg">✅</span> Effectif Actuel</span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-lg shadow-inner">
              {acceptedPlayers.length} / 12
            </span>
          </h2>
          
          {/* 👇 LA MODIFICATION EST ICI 👇 */}
          <div className="flex flex-col gap-4 relative z-10">
            {acceptedPlayers.map(p => {
              const isMe = p.player_id === session.user.id;
              const isTheCaptain = p.player_id === managingTeam.captain_id;
              return (
                <div key={p.id || p.player_id || p.manual_name} className="flex justify-between items-center bg-[#1e1e2a] p-4 rounded-2xl border-l-[4px] border-l-emerald-500 border border-white/5 hover:border-white/20 transition-all group shadow-lg">
                  <div className="flex items-center gap-4">
                    
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white shadow-inner text-lg border border-white/10 shrink-0 ${isTheCaptain ? 'bg-gradient-to-tr from-orange-500 to-red-500' : 'bg-black/40'}`}>
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex flex-col">
                      <strong 
                        onClick={() => !p.isGhost && viewPlayerProfile({ id: p.player_id, full_name: p.full_name })}
                        className={`text-base sm:text-lg tracking-wide font-black ${!p.isGhost ? "cursor-pointer hover:text-emerald-400 transition-colors" : ""} ${isTheCaptain ? 'text-orange-400' : 'text-white'}`}
                      >
                        {p.full_name} {isTheCaptain && <span className="text-sm ml-1" title="Capitaine">👑</span>} {isMe && <span className="text-[#888] text-[10px] uppercase tracking-widest ml-2 bg-black/40 px-2 py-0.5 rounded border border-white/5">Toi</span>}
                      </strong>
                      {p.isGhost && <span className="text-[10px] text-[#666] font-bold uppercase tracking-widest mt-1 bg-black/30 px-2 py-0.5 rounded w-fit border border-white/5">Profil Hors-Ligne (Manuel)</span>}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 shrink-0 ml-3">
                    {!isCaptainView && isMe && (
                      <button onClick={() => removePlayer(p.player_id, false, true)} className="bg-red-500/10 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-xl text-xs font-black tracking-widest hover:bg-red-500 hover:text-white transition-colors cursor-pointer">
                        QUITTER
                      </button>
                    )}
                    
                    {isCaptainView && !isTheCaptain && (
                      <button 
                        onClick={() => removePlayer(p.isGhost ? p.manual_name : p.player_id, p.isGhost)} 
                        className="bg-black/40 text-[#666] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 text-lg shadow-inner" 
                        title="Exclure ce joueur"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          
        </section>
      </div>

    </div>
  );
}