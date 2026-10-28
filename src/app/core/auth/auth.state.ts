import { computed, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  businessId: string;
  storeId: string;
  permissions: string[];
  /**
   * True while running on the seeded offline/demo session instead of a real
   * Supabase Auth login. UI surfaces this so demo data is never mistaken for
   * authenticated tenant data.
   */
  isDemo: boolean;
}

/**
 * Demo session used until Supabase Auth login is wired.
 * Identifiers are the seeded tenant UUIDs so tenant-scoped queries resolve rows;
 * previously they were free-text ids ('store-dubai-mall-01') which matched nothing.
 */
const DEMO_SESSION: UserSession = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'kasun@aeropos.ae',
  fullName: 'Kasun Backer',
  role: 'Head Cashier',
  businessId: environment.pos.defaultBusinessId,
  storeId: environment.pos.defaultStoreId,
  permissions: ['pos:sale', 'pos:refund', 'inventory:view', 'reports:view'],
  isDemo: true,
};

@Injectable({
  providedIn: 'root',
})
export class AuthState {
  private readonly session = signal<UserSession | null>(DEMO_SESSION);

  public readonly currentSession = this.session.asReadonly();
  public readonly isAuthenticated = computed(() => this.session() !== null);
  public readonly isDemoSession = computed(() => this.session()?.isDemo === true);
  public readonly activeStoreId = computed(() => this.session()?.storeId || '');
  public readonly activeBusinessId = computed(() => this.session()?.businessId || '');
  public readonly permissions = computed(() => this.session()?.permissions || []);

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  setSession(userSession: UserSession | null): void {
    this.session.set(userSession);
  }

  clearSession(): void {
    this.session.set(null);
  }
}
