import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [position, setPosition] = useState('');

  const POSITION_OPTIONS = [
    "Meneur (1)", "Arrière (2)", "Ailier (3)", 
    "Ailier fort (4)", "Pivot (5)", "Coach / Manager"
  ];

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    if (!isLogin && !position) {
      setMessage({ text: 'Veuillez sélectionner votre poste.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    city: city,
                    position: position
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#111', color: 'white', padding: '20px' }}>
      <div style={{ background: '#222', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '450px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--accent-orange, #ff6b00)' }}>
          {isLogin ? 'Connexion' : 'Créer un compte'}
        </h2>
        
        {message.text && (
          <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '5px', backgroundColor: message.type === 'error' ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,0,0.1)', color: message.type === 'error' ? '#ff4444' : '#44ff44', textAlign: 'center', fontSize: '0.9rem' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {!isLogin && (
            <>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: 'white', width: '100%' }}
                />
                <input 
                  type="text" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: 'white', width: '100%' }}
                />
              </div>

              <input 
                type="text" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} required
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: 'white' }}
              />

              {/* 🛠️ ZONE DES POSTES MODIFIÉE (Multilignes sans scroll) */}
              <div style={{ marginTop: '5px', marginBottom: '5px', width: '100%' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#aaa', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Votre Poste
                </p>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', /* 👈 LA MAGIE EST ICI : Autorise le passage à la ligne */
                  gap: '8px', 
                  justifyContent: 'center', /* Centre joliment les boutons restants */
                  paddingBottom: '5px' 
                }}>
                  {POSITION_OPTIONS.map(pos => {
                    const isSelected = position === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setPosition(pos)}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.target.style.background = '#444';
                            e.target.style.borderColor = '#666';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.target.style.background = '#2a2a2a';
                            e.target.style.borderColor = '#444';
                          }
                        }}
                        style={{
                          padding: '8px 15px',
                          borderRadius: '20px',
                          border: isSelected ? '2px solid var(--accent-orange, #ff6b00)' : '1px solid #444',
                          background: isSelected ? 'rgba(255, 107, 0, 0.15)' : '#2a2a2a',
                          color: isSelected ? 'var(--accent-orange, #ff6b00)' : '#ccc',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          /* On enlève le flexShrink inutile vu qu'on passe à la ligne */
                        }}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <input 
            type="email" placeholder="Votre adresse email" value={email} onChange={(e) => setEmail(e.target.value)} required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: 'white' }}
          />
          <input 
            type="password" placeholder="Votre mot de passe (6 carac. min)" value={password} onChange={(e) => setPassword(e.target.value)} required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: 'white' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--accent-orange, #ff6b00)', color: 'white', fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', marginTop: '10px', fontSize: '1rem', letterSpacing: '1px', transition: '0.2s' }}
          >
            {loading ? 'Chargement...' : (isLogin ? 'SE CONNECTER' : "S'INSCRIRE")}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '25px', fontSize: '0.9rem', color: '#888' }}>
          {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
          <button 
            onClick={() => { setIsLogin(!isLogin); setMessage({text:'', type:''}); }} 
            style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', marginLeft: '5px' }}
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}