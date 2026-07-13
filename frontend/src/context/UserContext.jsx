import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '../api/client';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => setUtilisateur(data.nom_affichage))
      .catch(() => setUtilisateur(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(identifiant, motDePasse) {
    const data = await apiLogin(identifiant, motDePasse);
    setUtilisateur(data.nom_affichage);
  }

  async function logout() {
    await apiLogout();
    setUtilisateur(null);
  }

  return (
    <UserContext.Provider value={{ utilisateur, loading, authenticated: !!utilisateur, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser doit être utilisé dans un UserProvider');
  return ctx;
}
