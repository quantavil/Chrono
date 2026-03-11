/**
 * Theme Store: Manages application appearance (light, dark, system) and user preferences.
 */

import type { Theme, ThemeState } from '../types';
import { LOCAL_STORAGE_KEYS } from '../types';

// Theme Manager

class ThemeManager {
  private current = $state<Theme>('system');
  private systemPreference = $state<'light' | 'dark'>('light');
  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      this.setupSystemPreferenceListener();
      this.applyTheme();
    }
  }


  get theme(): Theme {
    return this.current;
  }

  get resolved(): 'light' | 'dark' {
    if (this.current === 'system') {
      return this.systemPreference;
    }
    return this.current;
  }

  get state(): ThemeState {
    return {
      current: this.current,
      resolved: this.resolved,
    };
  }

  get isDark(): boolean {
    return this.resolved === 'dark';
  }

  get isLight(): boolean {
    return this.resolved === 'light';
  }

  get isSystem(): boolean {
    return this.current === 'system';
  }


  setTheme(theme: Theme): void {
    this.current = theme;
    this.saveToStorage();
    this.applyTheme();
  }

  toggle(): void {
    if (this.current === 'light') {
      this.setTheme('dark');
    } else if (this.current === 'dark') {
      this.setTheme('system');
    } else {
      this.setTheme('light');
    }
  }

  toggleLightDark(): void {
    if (this.resolved === 'light') {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  setLight(): void {
    this.setTheme('light');
  }

  setDark(): void {
    this.setTheme('dark');
  }

  setSystem(): void {
    this.setTheme('system');
  }


  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        this.current = stored as Theme;
      }
    } catch (error) {
      console.warn('[Chronos] Failed to load theme from localStorage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, this.current);
    } catch (error) {
      console.warn('[Chronos] Failed to save theme to localStorage:', error);
    }
  }

  private setupSystemPreferenceListener(): void {
    if (typeof window === 'undefined') return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPreference = this.mediaQuery.matches ? 'dark' : 'light';

    const handler = (event: MediaQueryListEvent): void => {
      this.systemPreference = event.matches ? 'dark' : 'light';
      if (this.current === 'system') {
        this.applyTheme();
      }
    };

    this.mediaQuery.addEventListener('change', handler);
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const resolved = this.resolved;

    root.setAttribute('data-theme', resolved);

    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolved === 'dark' ? '#1a1625' : '#b8a9c9'
      );
    }
  }
}

// Singleton Instance

export const themeManager = new ThemeManager();

// Convenience Exports

export function getTheme(): Theme {
  return themeManager.theme;
}

export function getResolvedTheme(): 'light' | 'dark' {
  return themeManager.resolved;
}

export function setTheme(theme: Theme): void {
  themeManager.setTheme(theme);
}

export function toggleTheme(): void {
  themeManager.toggle();
}

export function toggleLightDark(): void {
  themeManager.toggleLightDark();
}