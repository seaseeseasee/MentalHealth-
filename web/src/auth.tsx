import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, ApiError, isStaff, useLiveData, type User } from './api.ts';
import { Loading } from './components/ui.tsx';
import { clearAllDrafts } from './pages/Questionnaire.tsx';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-check the session when the tab regains focus, so a login/logout or profile
  // change made in another tab shows up without a manual refresh.
  useLiveData(() => {
    api.me()
      .then(({ user }) => setUser(user))
      .catch((e) => { if (e instanceof ApiError && e.status === 401) setUser(null); })
      .finally(() => setLoading(false));
  });

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    clearAllDrafts();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, setUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** Admin and analyst accounts only. Everyone else is sent to their home page. The API enforces the same rule. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isStaff(user)) return <Navigate to="/home" replace />;
  return <>{children}</>;
}
