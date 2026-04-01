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

  return (
    <>
      <h1 className="text-white border-b-2 border-[#333] pb-2 text-2xl font-bold">
        👟 Mon Vestiaire
      </h1>
      
      {/* 👇 MAGIE RESPONSIVE : flex-col sur mobile, flex-row (côte à côte) sur grand écran (lg) 👇 */}
      <div className="flex flex-col lg:flex-row gap-8 mt-8">
        
        {/* COLONNE GAUCHE : MES ÉQUIPES */}
        <div className="flex-1 min-w-[300px]">
          <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333] mb-8">
            <h2 className="m-0 mb-5 text-[var(--accent-blue)] text-lg font-bold">🛡️ Mes Équipes</h2>
            
            {myTeams.length === 0 ? (
              <div className="empty-state-container">
                <div className="empty-state-icon">🪑</div>
                <h3 className="empty-state-title">Ton casier est vide !</h3>
                <p className="empty-state-desc">
                  Tu ne fais encore partie d'aucune franchise. Crées-en une sur la droite, ou va dans le "Mercato" pour trouver une équipe à rejoindre.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {myTeams.map(mt => {
                  const team = mt.global_teams;
                  const isCaptain = team.captain_id === session.user.id;
                  
                  // CAS 1 : INVITATION
                  if (mt.status === 'invited') {
                    return (
                      <div key={team.id} className="bg-[#222] p-4 rounded-lg border-l-4 border-[var(--accent-purple)]">
                        <strong className="text-xl block text-white">{team.name}</strong>
                        <span className="text-sm text-[var(--accent-purple)]">✉️ Le capitaine t'invite !</span>
                        
                        <div className="mt-4 flex gap-3">
                          <button 
                            onClick={() => respondToInvite(team.id, true)} 
                            disabled={hasTeam}
                            className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
                              hasTeam 
                                ? 'bg-[#444] text-[#888] cursor-not-allowed' 
                                : 'bg-[var(--success)] text-white hover:bg-green-600 cursor-pointer'
                            }`}
                          >
                            ACCEPTER
                          </button>
                          <button 
                            onClick={() => respondToInvite(team.id, false)} 
                            className="bg-[var(--danger)] text-white hover:bg-red-600 px-3 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors"
                          >
                            REFUSER
                          </button>
                        </div>
                        {hasTeam && <span className="block mt-2 text-xs text-[var(--danger)] font-bold">Quitte d'abord ton équipe actuelle pour accepter.</span>}
                      </div>
                    );
                  }

                  // CAS 2 : ÉQUIPE ACTIVE OU EN ATTENTE
                  const isPending = mt.status === 'pending';
                  return (
                    <div 
                      key={team.id} 
                      onClick={() => !isPending && openTeamManager(team)}
                      // On garde ta classe team-card-interactive pour l'animation que tu avais sûrement dans index.css
                      className={`bg-[#222] p-4 rounded-lg border-l-4 border-y border-r border-y-transparent border-r-transparent transition-all ${
                        !isPending ? "team-card-interactive cursor-pointer border-l-[var(--success)]" : "cursor-default border-l-[var(--accent-orange)]"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-xl block text-white">{team.name}</strong>
                          <span className="text-xs text-gray-400">{team.city || 'Ville non renseignée'}</span>
                        </div>
                        {isCaptain && <span className="bg-[var(--accent-purple)] px-2 py-1 rounded text-[10px] font-bold text-white tracking-wider">CAPITAINE 👑</span>}
                      </div>
                      
                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-sm font-bold">
                          {isPending ? <span className="text-[var(--accent-orange)]">⏳ Candidature en attente...</span> : <span className="text-[var(--success)]">✅ Membre actif</span>}
                        </div>
                        
                        {!isPending ? (
                          <div className="text-xs text-gray-400 font-bold tracking-wider">
                            {isCaptain ? "GÉRER ⚙️" : "EFFECTIF 👁️"}
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              cancelPendingRequest(team.id); 
                            }} 
                            className="bg-transparent text-[var(--danger)] border border-[var(--danger)] px-2 py-1 rounded cursor-pointer text-xs font-bold hover:bg-[var(--danger)] hover:text-white transition-colors"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE : CRÉATION D'ÉQUIPE */}
        <div className="flex-1 min-w-[300px]">
          {hasTeam ? (
            <div className="bg-[#1a1a1a] p-5 rounded-xl border border-dashed border-[var(--danger)] text-center">
              <h2 className="m-0 mb-3 text-[var(--danger)] text-lg font-bold">🚫 Limite de franchise atteinte.</h2>
              <p className="text-gray-400 text-sm">Tu es déjà engagé dans 3 équipes maximum. Quitte l'une d'entre elles pour pouvoir en fonder ou en rejoindre une nouvelle.</p>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] p-5 rounded-xl border border-dashed border-[#444]">
              <h2 className="m-0 mb-5 text-white text-lg font-bold">➕ Fonder une franchise</h2>
              <form onSubmit={handleCreateTeam} className="flex flex-col gap-4">
                <input 
                  type="text" 
                  placeholder="Nom de l'équipe (ex: Chicago Bulls)" 
                  value={newTeamName} 
                  onChange={e => setNewTeamName(e.target.value)} 
                  required 
                  className="p-3 rounded-md border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-orange)] transition-colors"
                />
                <input 
                  type="text" 
                  placeholder="Ville (Obligatoire)" 
                  value={newTeamCity} 
                  onChange={e => setNewTeamCity(e.target.value)} 
                  className="p-3 rounded-md border border-[#444] bg-[#222] text-white focus:outline-none focus:border-[var(--accent-orange)] transition-colors"
                />
                <button 
                  type="submit" 
                  className="p-3 rounded-md bg-[var(--accent-orange)] text-white font-bold cursor-pointer hover:opacity-90 transition-opacity"
                >
                  CRÉER MON ÉQUIPE
                </button>
              </form>
            </div>
          )}
        </div>
        
      </div>
    </>
  );
}