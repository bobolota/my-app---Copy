import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function MonVestiaire({     
  myTeams, 
  hasTeam, 
  hasMax5x5,
  hasMax3x3,
  newTeamFormat,
  setNewTeamFormat,
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

  const invitations = myTeams.filter(mt => mt.status === 'invited');
  const activeTeams = myTeams.filter(mt => mt.status === 'accepted');
  const pendingTeams = myTeams.filter(mt => mt.status === 'pending');

  const TeamBadge = ({ name, colorClass = "from-secondary to-secondary-dark" }) => (
    <div className={`w-14 h-14 shrink-0 rounded-full bg-gradient-to-tr ${colorClass} flex items-center justify-center text-2xl font-black text-white shadow-lg border border-muted-line`}>
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );

  const isSubmitDisabled = !newTeamName.trim() || (newTeamFormat === '5x5' && hasMax5x5) || (newTeamFormat === '3x3' && hasMax3x3);

  return (
    <div className="w-full flex-1 flex flex-col box-border p-4 sm:p-6 max-w-[1400px] mx-auto relative">
      
      {/* EN-TÊTE PREMIUM */}
      <div className="mb-8 border-b border-muted-line pb-5 w-full text-left">
        <h1 className="m-0 text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-start gap-3">
          <span className="text-4xl drop-shadow-lg">👟</span>
          Mon Vestiaire
        </h1>
        <p className="mt-2 text-muted font-medium text-sm text-left">
          Gère tes franchises, réponds à tes invitations ou fonde une nouvelle équipe.
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        
        {/* COLONNE GAUCHE : MES ÉQUIPES */}
        <div className="flex-[2] w-full flex flex-col gap-8">
          
          {/* 1. LES INVITATIONS */}
          {invitations.length > 0 && (
            <section className="bg-app-panel/80 backdrop-blur-md rounded-2xl p-6 border border-muted-line flex flex-col shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] opacity-80"></div>
              
              <h2 className="m-0 mb-6 text-purple-400 text-sm flex items-center gap-2 uppercase tracking-widest font-black relative z-10">
                <span className="animate-pulse text-lg">📩</span> INVITATIONS EN ATTENTE
              </h2>
              
              <div className="flex flex-col gap-4 relative z-10">
                {invitations.map(mt => {
                  const team = mt.global_teams;
                  const isFormatFull = team.format === '3x3' ? hasMax3x3 : hasMax5x5;

                  return (
                    <div key={team.id} className="bg-app-card p-4 rounded-xl border border-muted-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg hover:border-purple-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <TeamBadge name={team.name} colorClass="from-purple-600 to-pink-500" />
                        <div>
                          <strong className="text-xl flex items-center gap-2 text-white font-black tracking-wide">
                            {team.name}
                            <span className="bg-app-input text-white font-black text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-muted-line">
                              {team.format || '5x5'}
                            </span>
                          </strong>
                          <span className="text-[10px] text-muted-dark font-bold tracking-widest uppercase bg-black/30 px-2 py-0.5 rounded w-fit mt-1 border border-muted-line block">
                            📍 {team.city || 'Ville inconnue'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => respondToInvite(team.id, true)} 
                            disabled={isFormatFull}
                            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-black tracking-widest transition-all ${
                              isFormatFull 
                                ? 'bg-app-input text-muted border border-muted-line cursor-not-allowed shadow-none' 
                                : 'bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 cursor-pointer'
                            }`}
                          >
                            ACCEPTER
                          </button>
                          <button 
                            onClick={() => respondToInvite(team.id, false)} 
                            className="flex-1 sm:flex-none bg-danger/10 border border-danger/20 text-danger hover:bg-danger hover:text-white px-5 py-2.5 rounded-lg text-xs font-black tracking-widest transition-all cursor-pointer"
                          >
                            REFUSER
                          </button>
                        </div>
                        {isFormatFull && <span className="w-full text-[10px] uppercase tracking-widest text-danger font-bold text-center">Limite {team.format || '5x5'} atteinte.</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. MES FRANCHISES ACTIVES */}
          <section className="bg-app-panel/80 backdrop-blur-md rounded-2xl p-6 border border-muted-line flex flex-col shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-action to-action-light shadow-[0_0_15px_rgba(59,130,246,0.4)] opacity-80"></div>
            
            <h2 className="m-0 mb-6 text-action text-sm flex items-center gap-2 uppercase tracking-widest font-black relative z-10">
              <span className="text-lg">🛡️</span> MES FRANCHISES
            </h2>
            
            {activeTeams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-50 text-center relative z-10">
                <span className="text-5xl mb-4 drop-shadow-md">🪑</span>
                <h3 className="text-white text-lg font-black mb-2 tracking-wide">Ton casier est vide</h3>
                <p className="text-muted font-bold text-xs uppercase tracking-wider m-0 leading-relaxed max-w-sm">
                  Tu ne fais encore partie d'aucune équipe. Crées-en une ou rejoins des amis !
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 relative z-10">
                {activeTeams.map(mt => {
                  const team = mt.global_teams;
                  const isCaptain = team.captain_id === session.user.id;

                  return (
                    <div key={team.id} className="bg-app-card border border-muted-line p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 hover:border-action/30 transition-all hover:-translate-y-0.5 shadow-lg group/item">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative">
                          <TeamBadge name={team.name} colorClass="from-action to-action-light" />
                          {isCaptain && <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-secondary to-danger text-white text-[0.6rem] px-1.5 py-0.5 rounded shadow-sm font-black border border-app-bg tracking-wider">CAPITAINE</div>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h3 className="text-xl flex items-center gap-2 font-black text-white m-0 truncate group-hover/item:text-action-light transition-colors">
                            {team.name}
                            <span className="bg-app-input text-white font-black text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-muted-line">
                              {team.format || '5x5'}
                            </span>
                          </h3>
                          <div className="text-[10px] text-muted-dark font-bold tracking-widest uppercase bg-black/30 px-2 py-0.5 rounded w-fit mt-1 border border-muted-line">
                            📍 {team.city || 'Ville non renseignée'}
                          </div>
                        </div>
                      </div>
                      
                      {isCaptain ? (
                        <button onClick={() => openTeamManager(team)} className="w-full sm:w-auto bg-gradient-to-r from-secondary to-danger text-white px-6 py-3 rounded-xl text-xs font-black tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.5)] hover:-translate-y-0.5 transition-all cursor-pointer">
                          ⚙️ GÉRER L'ÉQUIPE
                        </button>
                      ) : (
                        <button onClick={() => openTeamManager(team)} className="w-full sm:w-auto bg-app-input border border-muted-line text-white px-6 py-3 rounded-xl text-xs font-black tracking-widest hover:bg-muted-dark transition-colors shadow-inner cursor-pointer">
                          👁️ VOIR EFFECTIF
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* COLONNE DROITE : CRÉATION D'ÉQUIPE */}
        <div className="flex-1 w-full lg:max-w-[420px] shrink-0 lg:sticky lg:top-6">
          {hasTeam ? (
            <div className="bg-app-panel/80 backdrop-blur-md p-8 rounded-3xl border border-danger/30 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-danger/10 blur-[50px] rounded-full pointer-events-none"></div>
              <div className="text-5xl mb-4 relative z-10 drop-shadow-lg">🚫</div>
              <h2 className="m-0 mb-3 text-danger-light text-lg font-black uppercase tracking-widest relative z-10">Casier Plein</h2>
              <p className="text-muted text-sm font-medium leading-relaxed mb-0 relative z-10">
                Tu as atteint la limite absolue (3 équipes 5x5 et 3 équipes 3x3). Quitte l'une d'entre elles pour en fonder une nouvelle.
              </p>
            </div>
          ) : (
            <div className="bg-app-panel/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-muted-line shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/20 opacity-50 blur-[80px] rounded-full pointer-events-none transition-opacity group-hover:opacity-80"></div>
              
              <h2 className="m-0 mb-8 text-white text-xl font-black flex items-center gap-3 relative z-10">
                <span className="text-2xl drop-shadow-md">➕</span> Fonder une franchise
              </h2>

              <form onSubmit={handleCreateTeam} className="flex flex-col gap-5 relative z-10">
                
                {/* SÉLECTEUR DE FORMAT */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Format de l'équipe</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewTeamFormat('5x5')}
                      disabled={hasMax5x5}
                      className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border flex flex-col items-center justify-center ${hasMax5x5 ? 'bg-app-input text-danger border-danger/20 cursor-not-allowed opacity-50' : newTeamFormat === '5x5' ? 'bg-gradient-to-r from-secondary to-danger text-white border-transparent shadow-[0_4px_15px_rgba(249,115,22,0.4)]' : 'bg-app-input text-muted-dark border-muted-line hover:border-secondary/50 hover:text-white'}`}
                    >
                      <span>5x5</span>
                      {hasMax5x5 && <span className="text-[9px] mt-0.5 tracking-widest uppercase">Plein (3/3)</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTeamFormat('3x3')}
                      disabled={hasMax3x3}
                      className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border flex flex-col items-center justify-center ${hasMax3x3 ? 'bg-app-input text-danger border-danger/20 cursor-not-allowed opacity-50' : newTeamFormat === '3x3' ? 'bg-gradient-to-r from-secondary to-danger text-white border-transparent shadow-[0_4px_15px_rgba(249,115,22,0.4)]' : 'bg-app-input text-muted-dark border-muted-line hover:border-secondary/50 hover:text-white'}`}
                    >
                      <span>3x3</span>
                      {hasMax3x3 && <span className="text-[9px] mt-0.5 tracking-widest uppercase">Plein (3/3)</span>}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Nom de la franchise</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Chicago Bulls" 
                    value={newTeamName} 
                    onChange={e => setNewTeamName(e.target.value)} 
                    required 
                    className="p-4 rounded-xl border border-muted-line bg-app-input text-white placeholder:text-muted-dark focus:outline-none focus:border-secondary focus:bg-app-bg transition-all shadow-inner font-medium text-sm"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">Ville de rattachement</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Lyon" 
                    value={newTeamCity} 
                    onChange={e => setNewTeamCity(e.target.value)} 
                    className="p-4 rounded-xl border border-muted-line bg-app-input text-white placeholder:text-muted-dark focus:outline-none focus:border-secondary focus:bg-app-bg transition-all shadow-inner font-medium text-sm"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitDisabled}
                  className={`mt-4 p-4 rounded-xl font-black tracking-widest text-sm transition-all ${
                    !isSubmitDisabled 
                      ? 'bg-gradient-to-r from-secondary to-danger text-white hover:shadow-[0_4px_15px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 cursor-pointer' 
                      : 'bg-app-input text-muted-dark cursor-not-allowed border border-muted-line shadow-none'
                  }`}
                >
                  CRÉER L'ÉQUIPE {newTeamFormat} 🚀
                </button>
              </form>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}