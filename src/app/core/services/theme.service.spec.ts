import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeService, ThemePreference } from './theme.service';
import { StorageService } from './storage.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockStorage: Partial<StorageService>;
  const storageMap = new Map<string, any>();

  beforeEach(() => {
    storageMap.clear();

    mockStorage = {
      getItem: <T>(key: string, defaultVal: T | null = null): T | null => {
        return storageMap.has(key) ? (storageMap.get(key) as T) : defaultVal;
      },
      setItem: (key: string, val: any): boolean => {
        storageMap.set(key, val);
        return true;
      },
    };

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: StorageService, useValue: mockStorage },
      ],
    });

    service = TestBed.inject(ThemeService);
  });

  it('should initialize and provide theme signals', () => {
    expect(service).toBeTruthy();
    expect(service.themePreference()).toBeDefined();
    expect(['light', 'dark']).toContain(service.activeTheme());
  });

  it('should switch to light theme and update signals', () => {
    service.setTheme('light');
    expect(service.themePreference()).toBe('light');
    expect(service.activeTheme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(service.isSystem()).toBe(false);
    expect(storageMap.get('pos_theme_preference')).toBe('light');
  });

  it('should switch to dark theme and update signals', () => {
    service.setTheme('dark');
    expect(service.themePreference()).toBe('dark');
    expect(service.activeTheme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(service.isSystem()).toBe(false);
    expect(storageMap.get('pos_theme_preference')).toBe('dark');
  });

  it('should cycle themes correctly: dark -> light -> system -> dark', () => {
    service.setTheme('dark');
    service.cycleTheme();
    expect(service.themePreference()).toBe('light');

    service.cycleTheme();
    expect(service.themePreference()).toBe('system');
    expect(service.isSystem()).toBe(true);

    service.cycleTheme();
    expect(service.themePreference()).toBe('dark');
  });
});
