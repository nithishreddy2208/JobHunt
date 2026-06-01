import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Storage key MUST match the inline no-flicker script in index.html.
const STORAGE_KEY = 'jobhunt-theme';

const ThemeContext = createContext({
  theme: 'system', // 'light' | 'dark' | 'system' (user preference)
  resolvedTheme: 'light', // 'light' | 'dark' (what's actually applied)
  setTheme: () => {},
  toggleTheme: () => {}
});

const getSystemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const readStoredTheme = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'system';
};

/**
 * Applies/removes the `.dark` class on <html> and sets color-scheme so native
 * UI (scrollbars, form controls) matches.
 */
const applyDomTheme = (resolved) => {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved === 'dark' ? 'dark' : 'light';
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => (typeof window === 'undefined' ? 'system' : readStoredTheme()));
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    typeof window === 'undefined'
      ? 'light'
      : (readStoredTheme() === 'dark' ||
        (readStoredTheme() !== 'light' && getSystemPrefersDark()))
      ? 'dark'
      : 'light'
  );
  const transitionTimer = useRef(null);

  // Briefly enable CSS transitions only while switching, so the first paint
  // (already correct via the inline script) doesn't animate.
  const withTransition = useCallback(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
  }, []);

  // Resolve + apply whenever the preference changes.
  useEffect(() => {
    const resolved = theme === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : theme;
    setResolvedTheme(resolved);
    applyDomTheme(resolved);
  }, [theme]);

  // React to OS theme changes while in "system" mode.
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (readStoredTheme() === 'system') {
        const resolved = mq.matches ? 'dark' : 'light';
        setResolvedTheme(resolved);
        applyDomTheme(resolved);
      }
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const setTheme = useCallback(
    (next) => {
      withTransition();
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      setThemeState(next);
    },
    [withTransition]
  );

  // Simple toggle between light and dark (collapses "system" to its opposite
  // of whatever is currently showing).
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
