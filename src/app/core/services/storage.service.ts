import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private get isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  getItem<T>(key: string, defaultValue: T | null = null): T | null {
    if (!this.isBrowser) return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`StorageService failed to write key "${key}":`, e);
    }
  }

  removeItem(key: string): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(key);
  }

  clear(): void {
    if (!this.isBrowser) return;
    localStorage.clear();
  }
}
