import React from 'react';

export default function TournamentRegistrationModal({
  registerModalTourney,
  setRegisterModalTourney,
  selectedTeamToRegister,
  setSelectedTeamToRegister,
  myCaptainTeams,
  submitRegistration
}) {
  // Si aucun tournoi n'est sélectionné pour l'inscription, on n'affiche rien
  if (!registerModalTourney) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '12px', maxWidth: '500px', width: '100%', border: '2px solid var(--accent-blue)', position: 'relative' }}>
        <button onClick={() => { setRegisterModalTourney(null); setSelectedTeamToRegister(""); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        
        <h2 style={{ marginTop: 0, color: 'white', fontSize: '1.5rem' }}>S'inscrire au tournoi</h2>
        <h3 style={{ color: 'var(--accent-blue)', marginTop: 0 }}>{registerModalTourney.name}</h3>
        
        <div style={{ marginTop: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: '#aaa', fontSize: '0.9rem' }}>Sélectionne l'équipe :</label>
          <select value={selectedTeamToRegister} onChange={e => setSelectedTeamToRegister(e.target.value)} style={{ width: '100%', padding: '12px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '6px', marginBottom: '20px' }}>
            <option value="">-- Choisir une équipe --</option>
            {myCaptainTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={submitRegistration} style={{ width: '100%', background: 'var(--success)', color: 'white', border: 'none', padding: '15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>VALIDER L'INSCRIPTION ✅</button>
        </div>
      </div>
    </div>
  );
}