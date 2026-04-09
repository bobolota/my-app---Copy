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
    // 👇 bg-app-bg remplace #111
    <div className="flex justify-center items-center min-h-screen bg-app-bg text-white p-5 font-sans">
      {/* 👇 bg-app-panel remplace #222 et border-muted-line remplace #333 */}
      <div className="bg-app-panel p-8 sm:p-10 rounded-2xl w-full max-w-[450px] shadow-[0_10px_40px_rgba(0,0,0,0.7)] border border-muted-line">
        
        {/* 👇 text-secondary remplace var(--accent-orange) */}
        <h2 className="text-center mb-6 text-secondary text-2xl font-black tracking-wide uppercase">
          {isLogin ? 'Connexion' : 'Créer un compte'}
        </h2>
        
        {message.text && (
          // 👇 danger remplace #ff4444 et success remplace #44ff44
          <div className={`p-4 mb-5 rounded-xl text-center text-xs font-black uppercase tracking-widest border ${
            message.type === 'error' 
              ? 'bg-danger/10 text-danger border-danger/30' 
              : 'bg-success/10 text-success border-success/30'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {!isLogin && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* 👇 bg-app-input remplace #333 et border-muted-dark remplace #444 */}
                <input 
                  type="text" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required
                  className="flex-1 p-3.5 rounded-xl border border-muted-dark bg-app-input text-white w-full focus:outline-none focus:border-secondary transition-all shadow-inner"
                />
                <input 
                  type="text" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required
                  className="flex-1 p-3.5 rounded-xl border border-muted-dark bg-app-input text-white w-full focus:outline-none focus:border-secondary transition-all shadow-inner"
                />
              </div>

              <input 
                type="text" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} required
                className="p-3.5 rounded-xl border border-muted-dark bg-app-input text-white focus:outline-none focus:border-secondary transition-all shadow-inner"
              />

              <div className="my-2 w-full">
                {/* 👇 text-muted remplace #aaa */}
                <p className="m-0 mb-3 text-[10px] text-muted text-center uppercase tracking-widest font-black">
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
                        // 👇 secondary remplace accent-orange et muted-dark remplace #444
                        className={`px-4 py-2 rounded-full text-[0.75rem] uppercase tracking-wider cursor-pointer transition-all outline-none border font-black ${
                          isSelected 
                            ? 'border-secondary bg-secondary/15 text-secondary shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                            : 'border-muted-dark bg-app-card text-muted hover:bg-muted-dark hover:text-white'
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
            className="p-3.5 rounded-xl border border-muted-dark bg-app-input text-white focus:outline-none focus:border-secondary transition-all shadow-inner"
          />
          <input 
            type="password" placeholder="Mot de passe (6 carac. min)" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="p-3.5 rounded-xl border border-muted-dark bg-app-input text-white focus:outline-none focus:border-secondary transition-all shadow-inner"
          />
          
          <button 
            type="submit" 
            disabled={loading}
            // 👇 bg-secondary remplace accent-orange
            className={`p-4 rounded-xl border-none bg-secondary text-white font-black mt-2 text-sm tracking-widest uppercase transition-all shadow-lg ${
              loading ? 'cursor-wait opacity-70' : 'cursor-pointer hover:bg-secondary-dark hover:shadow-[0_5px_20px_rgba(249,115,22,0.4)] hover:-translate-y-0.5'
            }`}
          >
            {loading ? 'Chargement...' : (isLogin ? 'SE CONNECTER' : "S'INSCRIRE")}
          </button>
        </form>

        {/* 👇 text-muted remplace #888 */}
        <p className="text-center mt-8 text-xs text-muted font-bold tracking-wide">
          {isLogin ? "PAS ENCORE DE COMPTE ?" : "VOUS AVEZ DÉJÀ UN COMPTE ?"}
          <button 
            onClick={() => { setIsLogin(!isLogin); setMessage({text:'', type:''}); }} 
            className="bg-transparent border-none text-white font-black cursor-pointer underline ml-2 hover:text-secondary transition-colors uppercase"
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}