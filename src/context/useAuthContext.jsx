import Cookies from 'js-cookie';
import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
const AuthContext = createContext(undefined);
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
const authSessionKey = '_LARKON_AUTH_KEY_';
export function AuthProvider({
  children
}) {
  const navigate = useNavigate();
  const getSession = () => {
    const fetchedCookie = Cookies.get(authSessionKey);
    if (!fetchedCookie) return undefined;
    return JSON.parse(fetchedCookie);
  };
  const [user, setUser] = useState(getSession());
  const saveSession = user => {
    Cookies.set(authSessionKey, JSON.stringify(user), {
      expires: 7 // cookie valid for 7 days
    });
    setUser(user);
  };
  const removeSession = () => {
    Cookies.remove(authSessionKey);
    setUser(undefined);
    navigate('/auth/sign-in');
  };
  return <AuthContext.Provider value={{
    user,
    isAuthenticated: Boolean(Cookies.get(authSessionKey)),
    saveSession,
    removeSession
  }}>
      {children}
    </AuthContext.Provider>;
}