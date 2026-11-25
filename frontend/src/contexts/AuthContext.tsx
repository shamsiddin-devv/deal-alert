import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { User } from '@/lib/types';
import { api, ApiError, errorMessage, send } from '@/lib/api';

type BrowserSession = { user: User; expiresAt: string };
type AuthValue = {
  user: User | null;
  ready: boolean;
  error: string | null;
  retry: () => void;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUser: (patch: {
    name?: string;
    email?: string;
    currentPassword?: string;
  }) => Promise<{ needsVerification: boolean }>;
  clear: () => void;
};
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const clear = useCallback(() => {
    setUser(null);
    setReady(true);
  }, []);
  const retry = useCallback(() => {
    setError(null);
    setReady(false);
    setAttempt((value) => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api<User>('/me', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setUser(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted && !(cause instanceof ApiError && cause.status === 401))
          setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true);
      });
    window.addEventListener('dealalert:expired', clear);
    return () => {
      controller.abort();
      window.removeEventListener('dealalert:expired', clear);
    };
  }, [attempt, clear]);

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    const session = await send<BrowserSession>('POST', '/auth/login', { email, password, remember });
    setUser(session.user);
    setError(null);
    setReady(true);
  }, []);
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await send('POST', '/auth/register', { name, email, password, terms: true });
  }, []);
  const verifyEmail = useCallback(async (email: string, code: string) => {
    const session = await send<BrowserSession>('POST', '/auth/verify-email', { email, code });
    setUser(session.user);
    setError(null);
    setReady(true);
  }, []);
  const signOut = useCallback(async () => {
    try {
      await send('POST', '/auth/logout');
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 401)) throw cause;
    }
    clear();
  }, [clear]);
  const refreshProfile = useCallback(async () => setUser(await api<User>('/me')), []);
  const updateUser = useCallback(async (patch: { name?: string; email?: string; currentPassword?: string }) => {
    const result = await send<{ user: User; needsVerification: boolean }>('PATCH', '/me', patch);
    setUser(result.needsVerification ? null : result.user);
    return result;
  }, []);
  const value = useMemo(
    () => ({ user, ready, error, retry, signIn, signUp, verifyEmail, signOut, refreshProfile, updateUser, clear }),
    [user, ready, error, retry, signIn, signUp, verifyEmail, signOut, refreshProfile, updateUser, clear],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready, error, retry } = useAuth();
  const location = useLocation();
  if (!ready || error)
    return (
      <div className="min-h-screen grid place-items-center bg-background-100 p-4">
        <div role="status" className="text-sm text-foreground-600">
          {error ?? 'Preparing your workspace'}
          {error && (
            <button type="button" className="ml-3 underline" onClick={retry}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}
