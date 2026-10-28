import { computed, inject, Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

/**
 * ThemeService
 * Manages light, dark, and system automatic themes.
 * Dynamically reacts to OS color scheme changes when in 'system' mode,
 * synchronizes document attributes, and persists preferences.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storage = inject(StorageService);

  /** User configured preference: 'light' | 'dark' | 'system' */
  readonly themePreference = signal<ThemePreference>('system');

  /** Actual effective active theme rendered: 'light' | 'dark' */
  readonly activeTheme = signal<ActiveTheme>('dark');

  /** Whether effective theme is dark */
  readonly isDark = computed(() => this.activeTheme() === 'dark');

  /** Whether automatic system theme is currently active */
  readonly isSystem = computed(() => this.themePreference() === 'system');

  private mediaQuery?: MediaQueryList;
  private mediaListener?: (e: MediaQueryListEvent) => void;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // Retrieve saved preference or default to 'system'
    const saved = this.storage.getItem<ThemePreference>('pos_theme_preference', 'system');
    const validPreference: ThemePreference =
      saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';

    this.themePreference.set(validPreference);

    // Watch OS color-scheme changes if window.matchMedia is available
    if (typeof window.matchMedia === 'function') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaListener = (e: MediaQueryListEvent) => {
        if (this.themePreference() === 'system') {
          const effective: ActiveTheme = e.matches ? 'dark' : 'light';
          this.applyEffectiveTheme(effective);
        }
      };

      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener('change', this.mediaListener);
      } else if ((this.mediaQuery as any).addListener) {
        (this.mediaQuery as any).addListener(this.mediaListener);
      }
    }

    // Apply initial theme
    this.resolveAndApply(validPreference);
  }

  /**
   * Set user theme preference ('light', 'dark', or 'system')
   */
  setTheme(preference: ThemePreference): void {
    this.themePreference.set(preference);
    this.storage.setItem('pos_theme_preference', preference);
    this.resolveAndApply(preference);
  }

  /**
   * Cycles through: 'light' -> 'dark' -> 'system' -> 'light'
   */
  cycleTheme(): void {
    const current = this.themePreference();
    const next: ThemePreference =
      current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
    this.setTheme(next);
  }

  /**
   * Determine effective theme from preference
   */
  private resolveAndApply(preference: ThemePreference): void {
    let effective: ActiveTheme = 'dark';

    if (preference === 'system') {
      const isSystemDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      effective = isSystemDark ? 'dark' : 'light';
    } else {
      effective = preference;
    }

    this.applyEffectiveTheme(effective);
  }

  /**
   * Apply effective theme to DOM
   */
  private applyEffectiveTheme(theme: ActiveTheme): void {
    this.activeTheme.set(theme);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      root.classList.remove('dark-theme', 'light-theme', 'dark', 'light');
      root.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme');
      root.classList.add(theme);

      // Meta theme-color for mobile / PWA browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#0b0f19' : '#f4f6fa');
      }
    }
  }
}
