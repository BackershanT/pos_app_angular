import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * LayoutService
 * Manages responsive layout state, mobile off-canvas drawer navigation,
 * breakpoint detection, and mobile POS catalog vs cart tab switching.
 */
@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Off-canvas sidebar open state on mobile/tablet */
  readonly isMobileSidebarOpen = signal<boolean>(false);

  /** Whether current viewport is phone size (< 768px) */
  readonly isMobile = signal<boolean>(false);

  /** Whether current viewport is tablet size (768px - 1023px) */
  readonly isTablet = signal<boolean>(false);

  /** Active view on mobile POS screen */
  readonly activeMobilePosTab = signal<'catalog' | 'cart'>('catalog');

  private resizeListener?: () => void;

  constructor() {
    this.initViewportListeners();
    this.initNavigationAutoClose();
  }

  private initViewportListeners(): void {
    if (typeof window === 'undefined') return;

    const checkViewports = () => {
      const width = window.innerWidth;
      this.isMobile.set(width < 768);
      this.isTablet.set(width >= 768 && width < 1024);

      // Auto close mobile drawer if screen expands to desktop
      if (width >= 1024 && this.isMobileSidebarOpen()) {
        this.isMobileSidebarOpen.set(false);
      }
    };

    checkViewports();

    this.resizeListener = () => checkViewports();
    window.addEventListener('resize', this.resizeListener, { passive: true });

    this.destroyRef.onDestroy(() => {
      if (this.resizeListener && typeof window !== 'undefined') {
        window.removeEventListener('resize', this.resizeListener);
      }
    });
  }

  private initNavigationAutoClose(): void {
    // Automatically close sidebar drawer when navigating to a new route on mobile
    const sub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobileSidebarOpen()) {
          this.closeSidebar();
        }
      });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  toggleSidebar(): void {
    this.isMobileSidebarOpen.update((open) => !open);
  }

  openSidebar(): void {
    this.isMobileSidebarOpen.set(true);
  }

  closeSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }

  setActiveMobilePosTab(tab: 'catalog' | 'cart'): void {
    this.activeMobilePosTab.set(tab);
  }
}
