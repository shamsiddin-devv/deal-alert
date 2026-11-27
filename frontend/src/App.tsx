import { Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { useApiResource } from './hooks/useApiResource';
import type { Preferences } from './lib/contracts';

function SignedInWorkspace({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const { data: preferences } = useApiResource<Preferences>(user ? '/me/preferences' : null);
  useEffect(() => {
    if (!preferences) return;
    setTheme(preferences.theme);
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', preferences.reducedMotion);
    return () => root.classList.remove('reduce-motion');
  }, [preferences, setTheme]);
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}

function AccountWorkspace({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <SignedInWorkspace key={user?.id ?? 'guest'}>{children}</SignedInWorkspace>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AccountWorkspace>
            <Suspense fallback={null}>
              <AppRoutes />
            </Suspense>
          </AccountWorkspace>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
