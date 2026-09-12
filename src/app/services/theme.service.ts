import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'mercadito-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  init(): void {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' || (!saved && prefersDark);
    this.apply(dark);
  }

  toggle(): void {
    this.apply(!this.isDark());
  }

  setDark(dark: boolean): void {
    this.apply(dark);
  }

  private apply(dark: boolean): void {
    this.isDark.set(dark);
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (dark) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }
}
