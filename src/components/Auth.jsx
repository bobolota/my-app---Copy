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
    <div className="flex justify-center items-center min-h-screen bg-[#111] text-white p-5">
      <div className="bg-[#222] p-8 sm:p-10 rounded-xl w-full max-w-[450px] shadow-[0_4px_20px_rgba(0,0,0,0.6)] border border-[#333]">
        <h2 className="text-center mb-6 text-[var(--accent-orange,#ff6b00)] text-2xl font-black tracking-wide">
          {isLogin ? 'Connexion' : 'Créer un compte'}
        </h2>
        
        {message.text && (
          <div className={`p-3 mb-5 rounded-lg text-center text-sm font-bold ${message.type === 'error' ? 'bg-[rgba(255,0,0,0.1)] text-[#ff4444] border border-[#ff4444]' : 'bg-[rgba(0,255,0,0.1)] text-[#44ff44] border border-[#44ff44]'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {!isLogin && (
            <>
              {/* flex-col sur mobile, flex-row sur écran plus large */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required
                  className="flex-1 p-3 rounded-lg border border-[#444] bg-[#333] text-white w-full focus:outline-none focus:border-[var(--accent-orange)] transition-colors"
                />
                <input 
                  type="text" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required
                  className="flex-1 p-3 rounded-lg border border-[#444] bg-[#333] text-white w-full focus:outline-none focus:border-[var(--accent-orange)] transition-colors"
                />
              </div>

              <input 
                type="text" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} required
                className="p-3 rounded-lg border border-[#444] bg-[#333] text-white focus:outline-none focus:border-[var(--accent-orange)] transition-colors"
              />

              {/* ZONE DES POSTES MODIFIÉE */}
              <div className="my-2 w-full">
                <p className="m-0 mb-3 text-xs text-[#aaa] text-center uppercase tracking-widest font-bold">
                  Votre Poste
                </p>
                <div className="flex flex-wrap gap-2 justify-center pb-1">
                  {POSITION_OPTIONS.map(pos => {
                    const isSelected = position === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setPosition(pos)}
                        className={`px-4 py-2 rounded-full text-[0.85rem] cursor-pointer transition-all outline-none border ${
                          isSelected 
                            ? 'border-[var(--accent-orange,#ff6b00)] bg-[rgba(255,107,0,0.15)] text-[var(--accent-orange,#ff6b00)] font-bold shadow-[0_0_10px_rgba(255,107,0,0.2)]' 
                            : 'border-[#444] bg-[#2a2a2a] text-[#ccc] font-normal hover:bg-[#444] hover:border-[#666] hover:text-white'
                        }`}
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
            className="p-3 rounded-lg border border-[#444] bg-[#333] text-white focus:outline-none focus:border-[var(--accent-orange)] transition-colors"
          />
          <input 
            type="password" placeholder="Votre mot de passe (6 carac. min)" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="p-3 rounded-lg border border-[#444] bg-[#333] text-white focus:outline-none focus:border-[var(--accent-orange)] transition-colors"
          />
          <button 
            type="submit" 
            disabled={loading}
            className={`p-3.5 rounded-lg border-none bg-[var(--accent-orange,#ff6b00)] text-white font-bold mt-2 text-base tracking-wide transition-all ${
              loading ? 'cursor-wait opacity-70' : 'cursor-pointer hover:bg-orange-600 hover:shadow-[0_0_15px_rgba(255,107,0,0.4)] hover:-translate-y-0.5'
            }`}
          >
            {loading ? 'Chargement...' : (isLogin ? 'SE CONNECTER' : "S'INSCRIRE")}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-[#888]">
          {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
          <button 
            onClick={() => { setIsLogin(!isLogin); setMessage({text:'', type:''}); }} 
            className="bg-transparent border-none text-white font-bold cursor-pointer underline ml-2 hover:text-[var(--accent-orange)] transition-colors"
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}