// DEBUT DE LA MODIFICATION - NOUVEAU FICHIER : src/context/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';

// 1. On crée la "boîte" (le Context)
const AuthContext = createContext();

// 2. On crée le "Fournisseur" (le Provider) qui va emballer l'application
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // Pour savoir si on est en train de vérifier la session

  useEffect(() => {
    // On récupère la session au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // On écoute les changements (connexion, déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ce qu'on met dans "value", c'est ce qui sera accessible partout !
  return (
    <AuthContext.Provider value={{ session, setSession, loading }}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};

// 3. Petit outil bonus pour utiliser le nuage super facilement plus tard
export const useAuth = () => {
  return useContext(AuthContext);
};

// FIN DE LA MODIFICATION