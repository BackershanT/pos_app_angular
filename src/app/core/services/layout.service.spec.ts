import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { LayoutService } from './layout.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

describe('LayoutService', () => {
  let service: LayoutService;
  let routerEvents$: Subject<any>;

  beforeEach(() => {
    routerEvents$ = new Subject<any>();

    const mockRouter = {
      events: routerEvents$.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        LayoutService,
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(LayoutService);
  });

  it('should initialize with default sidebar closed and catalog active', () => {
    expect(service.isMobileSidebarOpen()).toBe(false);
    expect(service.activeMobilePosTab()).toBe('catalog');
  });

  it('should open, close, and toggle sidebar drawer state', () => {
    service.openSidebar();
    expect(service.isMobileSidebarOpen()).toBe(true);

    service.closeSidebar();
    expect(service.isMobileSidebarOpen()).toBe(false);

    service.toggleSidebar();
    expect(service.isMobileSidebarOpen()).toBe(true);

    service.toggleSidebar();
    expect(service.isMobileSidebarOpen()).toBe(false);
  });

  it('should switch active mobile POS tab between catalog and cart', () => {
    service.setActiveMobilePosTab('cart');
    expect(service.activeMobilePosTab()).toBe('cart');

    service.setActiveMobilePosTab('catalog');
    expect(service.activeMobilePosTab()).toBe('catalog');
  });

  it('should automatically close sidebar upon route NavigationEnd event', () => {
    service.openSidebar();
    expect(service.isMobileSidebarOpen()).toBe(true);

    // Simulate navigation end
    routerEvents$.next(new NavigationEnd(1, '/products', '/products'));
    expect(service.isMobileSidebarOpen()).toBe(false);
  });
});
