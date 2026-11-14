import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchUserSettings, updateThemePreference } from '@/services/api/settings';
import type { ThemePreference } from '@/types';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  savingTheme: boolean;
  setTheme: (next: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDocument(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
  if (document.body) {
    document.body.classList.toggle('dark', resolved === 'dark');
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, profile } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [savingTheme, setSavingTheme] = useState(false);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  // Apply resolved theme immediately to <html>
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  // Listen to OS theme preference changes for System Default
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load persisted preference from Supabase when authenticated
  useEffect(() => {
    let active = true;

    if (!isAuthenticated || !profile?.id) {
      return () => {
        active = false;
      };
    }

    const loadUserTheme = async () => {
      const { data } = await fetchUserSettings();
      if (active && data?.theme_preference) {
        setThemeState(data.theme_preference);
      }
    };

    void loadUserTheme();

    return () => {
      active = false;
    };
  }, [isAuthenticated, profile?.id]);

  const setTheme = useCallback(
    async (next: ThemePreference) => {
      setThemeState(next);
      const nextResolved: ResolvedTheme = next === 'system' ? getSystemTheme() : next;
      applyThemeToDocument(nextResolved);
      if (!isAuthenticated) return;

      setSavingTheme(true);
      try {
        await updateThemePreference(next);
      } finally {
        setSavingTheme(false);
      }
    },
    [isAuthenticated]
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, savingTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

