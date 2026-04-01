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
  return (
    <div className="p-5 max-w-[900px] mx-auto text-white w-full">
      <button 
        onClick={() => { setManagingTeam(null); localStorage.removeItem('managingTeamId'); }} 
        className="bg-transparent border border-[#444] text-[#888] px-4 py-2 rounded-md font-bold mb-5 hover:bg-[#333] hover:text-white transition-colors cursor-pointer"
      >
        ⬅ RETOUR
      </button>
      
      <h1 className="text-xl sm:text-2xl text-[var(--accent-blue)] border-b-2 border-[#333] pb-3 mb-6 flex justify-between items-center flex-wrap gap-4">
        <span>{isCaptainView ? '👑 Gestion' : '🏀 Équipe'} : {managingTeam.name}</span>
        {isCaptainView && (
          <div className="flex gap-3">
            {acceptedPlayers.length > 1 && (
              <button 
                onClick={() => setTransferModalOpen(true)} 
                className="bg-transparent text-[var(--accent-orange)] border border-[var(--accent-orange)] px-3 py-2 rounded-md text-xs font-bold cursor-pointer hover:bg-[var(--accent-orange)] hover:text-white transition-colors"
              >
                👑 LÉGUER LE BRASSARD
              </button>
            )}
            <button 
              onClick={handleDeleteTeam} 
              className="bg-[var(--danger)] text-white border-none px-3 py-2 rounded-md text-xs font-bold cursor-pointer hover:bg-red-700 transition-colors"
            >
              DISSOUDRE 💥
            </button>
          </div>
        )}
      </h1>

      <div className="flex flex-col md:flex-row gap-6 mt-6">
        {/* COLONNE GAUCHE (Demandes et Invitations) */}
        {isCaptainView && (
          <div className="flex-1 min-w-[300px] flex flex-col gap-6">
            
            <div className="bg-[#222] p-5 rounded-xl border border-[var(--accent-orange)] shadow-md">
              <h2 className="m-0 mb-4 text-[var(--accent-orange)] text-lg">⏳ Candidatures ({pendingPlayers.length})</h2>
              {pendingPlayers.length === 0 && <p className="text-[#888] italic m-0">Aucune demande.</p>}
              <div className="flex flex-col gap-3">
                {pendingPlayers.map(p => (
                  <div key={p.id || p.player_id} className="flex justify-between items-center bg-[#111] p-3 rounded-lg border border-[#333]">
                    <strong onClick={() => viewPlayerProfile({ id: p.player_id, full_name: p.full_name })} className="cursor-pointer hover:text-[var(--accent-purple)] transition-colors" title="Voir le profil">{p.full_name}</strong>
                    <div className="flex gap-2">
                      <button onClick={() => acceptPlayer(p.player_id)} className="bg-[var(--success)] text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer hover:bg-green-600 transition-colors">ACCEPTER</button>
                      <button onClick={() => removePlayer(p.player_id, false)} className="bg-[var(--danger)] text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer hover:bg-red-600 transition-colors">REFUSER</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#222] p-5 rounded-xl border border-dashed border-[var(--accent-blue)]">
              <h2 className="m-0 mb-4 text-[var(--accent-blue)] text-lg">✉️ Invitations ({invitedPlayers.length})</h2>
              {invitedPlayers.length === 0 && <p className="text-[#888] italic text-sm m-0">Aucune invitation en attente.</p>}
              <div className="flex flex-col gap-3">
                {invitedPlayers.map(p => (
                  <div key={p.id || p.player_id} className="flex justify-between items-center bg-[#111] p-3 rounded-lg border-l-4 border-l-[var(--accent-blue)]">
                    <strong onClick={() => viewPlayerProfile({ id: p.player_id, full_name: p.full_name })} className="cursor-pointer hover:text-[var(--accent-purple)] transition-colors" title="Voir le profil">{p.full_name}</strong>
                    <button onClick={() => removePlayer(p.player_id, false)} className="bg-transparent text-[var(--danger)] border border-[var(--danger)] px-2 py-1 rounded cursor-pointer text-xs hover:bg-[var(--danger)] hover:text-white transition-colors">Annuler</button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
        
        {/* COLONNE DROITE (Effectif actuel) */}
        <div className="flex-1 min-w-[300px] bg-[#1a1a1a] p-5 rounded-xl border border-[#333] shadow-md">
          <h2 className="m-0 mb-5 text-[var(--success)] text-lg">✅ Effectif ({acceptedPlayers.length})</h2>
          <div className="flex flex-col gap-3">
            {acceptedPlayers.map(p => {
              const isMe = p.player_id === session.user.id;
              const isTheCaptain = p.player_id === managingTeam.captain_id;
              return (
                <div key={p.id || p.player_id || p.manual_name} className="flex justify-between items-center bg-[#222] p-3 rounded-lg border-l-4 border-l-[var(--success)] flex-wrap gap-2">
                  <strong 
                    onClick={() => !p.isGhost && viewPlayerProfile({ id: p.player_id, full_name: p.full_name })}
                    className={`${!p.isGhost ? "cursor-pointer hover:underline" : ""} ${isTheCaptain ? 'text-[var(--accent-purple)]' : 'text-white'}`}
                  >
                    {p.full_name} {isTheCaptain && '👑'} {isMe && '(Toi)'}
                    {p.isGhost && <span className="text-xs text-[#888] ml-2 font-normal">(Ajout Manuel)</span>}
                  </strong>
                  
                  <div className="flex gap-2">
                    {!isCaptainView && isMe && (
                      <button onClick={() => removePlayer(p.player_id, false, true)} className="bg-transparent text-[var(--danger)] border border-[var(--danger)] px-2 py-1 rounded text-xs cursor-pointer hover:bg-[var(--danger)] hover:text-white transition-colors">Quitter</button>
                    )}
                    
                    {isCaptainView && !isTheCaptain && (
                      <button onClick={() => removePlayer(p.isGhost ? p.manual_name : p.player_id, p.isGhost)} className="bg-transparent text-[var(--danger)] border-none text-xl p-1 cursor-pointer hover:scale-110 transition-transform" title="Retirer ce joueur">✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isCaptainView && (
            <form onSubmit={handleAddGhostPlayer} className="flex gap-2 mt-6 pt-5 border-t border-dashed border-[#333]">
              <input 
                type="text" 
                value={newGhostName} 
                onChange={e => setNewGhostName(e.target.value)} 
                placeholder="Nom du joueur sans compte..." 
                className="flex-1 p-2.5 rounded-md bg-[#111] text-white border border-[#444] focus:border-[var(--accent-orange)] outline-none transition-colors text-sm"
              />
              <button type="submit" disabled={!newGhostName.trim()} className={`px-4 rounded-md font-bold text-sm transition-all ${newGhostName.trim() ? 'bg-[var(--success)] text-white cursor-pointer hover:bg-green-600' : 'bg-[#333] text-[#888] cursor-not-allowed'}`}>
                AJOUTER
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}