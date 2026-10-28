import { computed, Injectable, signal } from '@angular/core';

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  businessId: string;
  storeId: string;
  permissions: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthState {
  private readonly session = signal<UserSession | null>({
    userId: 'user-001',
    email: 'kasun@aeropos.ae',
    fullName: 'Kasun Backer',
    role: 'Head Cashier',
    businessId: 'biz-ae-001',
    storeId: 'store-dubai-mall-01',
    permissions: ['pos:sale', 'pos:refund', 'inventory:view', 'reports:view'],
  });

  public readonly currentSession = this.session.asReadonly();
  public readonly isAuthenticated = computed(() => this.session() !== null);
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
