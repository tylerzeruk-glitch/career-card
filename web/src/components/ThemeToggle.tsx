'use client';
import { useEffect, useState } from 'react';
import { DARK_MODE, THEME_KEY, type Theme } from '@/lib/theme';

/** Sun / moon. Disabled, with a note, while dark mode is held back. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => { setTheme(document.documentElement.getAttribute('data-cc-theme') === 'dark' ? 'dark' : 'light'); }, []);
  const flip = () => {
    if (!DARK_MODE) return;
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-cc-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  };
  const dark = theme === 'dark';
  return (
    <button type="button" className={'btn icon theme ' + className} onClick={flip} disabled={!DARK_MODE} aria-pressed={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={DARK_MODE ? (dark ? 'Light mode' : 'Dark mode') : 'Dark mode is coming soon'}>
      {dark ? (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}
