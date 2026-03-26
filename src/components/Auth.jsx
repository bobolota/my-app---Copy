import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // NOUVEAUX CHAMPS
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('SPECTATOR');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isLogin) {
        // CONNEXION
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Si succès, App.jsx prendra le relais automatiquement !
      } else {
        // INSCRIPTION (Avec les métadonnées pour ton Trigger SQL !)
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role
                }
            }
        });
        if (error) throw error;
        
        setMessage({ text: 'Inscription réussie ! Vous pouvez maintenant vous connecter.', type: 'success' });
        setIsLogin(true);
      }
    } catch (error) {
      setMessage({ text: error.message || "Une erreur est survenue", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#111', color: 'white' }}>
      <div style={{ background: '#222', padding: '40px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--accent-orange, #ff6b00)' }}>
          {isLogin ? 'Connexion' : 'Créer un compte'}
        </h2>
        
        {message.text && (
          <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '5px', backgroundColor: message.type === 'error' ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,0,0.1)', color: message.type === 'error' ? '#ff4444' : '#44ff44', textAlign: 'center', fontSize: '0.9rem' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* CHAMPS VISIBLES UNIQUEMENT À L'INSCRIPTION */}
          {!isLogin && (
            <>
              <input 
                type="text" 
                placeholder="Votre Prénom et Nom" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required
                style={{ padding: '12px', borderRadius: '5px', border: '1px solid #444', background: '#333', color: 'white' }}
              />
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                style={{ padding: '12px', borderRadius: '5px', border: '1px solid #444', background: '#333', color: 'white' }}
              >
                <option value="SPECTATOR">Spectateur (Suivre les matchs)</option>
                <option value="PLAYER">Joueur (Rejoindre une équipe)</option>
                <option value="OTM">OTM (Tenir la table de marque)</option>
                <option value="ORGANIZER">Organisateur (Gérer un tournoi)</option>
              </select>
            </>
          )}

          <input 
            type="email" 
            placeholder="Votre adresse email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ padding: '12px', borderRadius: '5px', border: '1px solid #444', background: '#333', color: 'white' }}
          />
          <input 
            type="password" 
            placeholder="Votre mot de passe (6 carac. min)" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            style={{ padding: '12px', borderRadius: '5px', border: '1px solid #444', background: '#333', color: 'white' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '12px', borderRadius: '5px', border: 'none', background: 'var(--accent-blue, #0066cc)', color: 'white', fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', marginTop: '10px' }}
          >
            {loading ? 'Chargement...' : (isLogin ? 'SE CONNECTER' : "S'INSCRIRE")}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#888' }}>
          {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
          <button 
            onClick={() => { setIsLogin(!isLogin); setMessage({text:'', type:''}); }} 
            style={{ background: 'none', border: 'none', color: 'var(--accent-orange, #ff6b00)', cursor: 'pointer', textDecoration: 'underline', marginLeft: '5px' }}
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}