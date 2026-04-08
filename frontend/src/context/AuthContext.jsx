import { createContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext(null);

function parseStoredUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    const exp = decoded?.exp ? decoded.exp * 1000 : null;
    if (exp && Date.now() > exp) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }

    return {
      token,
      userId: decoded?.userId || null,
      role: decoded?.role || null,
    };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => parseStoredUser());

  useEffect(() => {
    const onStorage = () => {
      setAuth(parseStoredUser());
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({
      auth,
      login: (token) => {
        const decoded = jwtDecode(token);
        const nextAuth = {
          token,
          userId: decoded?.userId || null,
          role: decoded?.role || null,
        };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(nextAuth));
        setAuth(nextAuth);
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuth(null);
      },
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
