import Cookies from 'js-cookie';
import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
const AuthContext = createContext(undefined);
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
// The signed-in profile. With cookie auth on the server (STAFF_COOKIE_AUTH, A15)
// it holds no token: the HttpOnly session cookie carries the session. With it
// off it also holds the Bearer token, as before.
const authSessionKey = '_LARKON_AUTH_KEY_';
// Keep this equal to TOKEN_TTL_DAYS in the server config.php (default 14,
// config.sample.php). A profile cookie that expired first would make the
// device look signed out while the server session still lives (A15).
const SESSION_DAYS = 14;
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
      expires: SESSION_DAYS
    });
    setUser(user);
  };
  const removeSession = () => {
    // End the session on the server too, so the token and any session cookie
    // are cleared. heritApi reads the token before this returns, so removing
    // the profile cookie straight after is safe; a failure still signs out here.
    heritApi.logout().catch(() => {});
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