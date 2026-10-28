import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthState, UserSession } from './auth.state';
import { getSupabaseClient } from '../../data-access/supabase/supabase.client';
import { NotificationService } from '../services/notification.service';
import { BusinessRepository } from '../../data-access/repositories/business.repository';
import { StoreRepository } from '../../data-access/repositories/store.repository';
import { AppContext } from '../context/app-context.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly businessRepo = inject(BusinessRepository);
  private readonly storeRepo = inject(StoreRepository);
  private readonly appContext = inject(AppContext);
  private readonly supabase = getSupabaseClient();

  async login(email: string, password: string): Promise<boolean> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      this.notification.error(error?.message || 'Invalid login credentials', 'Login Failed');
      return false;
    }

    // Tenant context is resolved from the database, never hardcoded: a session
    // without a valid business/store cannot scope queries or stamp invoices.
    let session: UserSession;
    try {
      const membership = await this.businessRepo.getMembershipForUser(data.user.id);

      if (!membership) {
        await this.supabase.auth.signOut();
        this.notification.warning(
          'This account is not linked to any business. Ask an administrator to add you as a team member.',
          'No Tenant Access',
        );
        return false;
      }

      const stores = await this.storeRepo.getStoresByBusiness(membership.businessId);

      if (stores.length === 0) {
        this.notification.warning(
          'No active branch is configured for this business yet.',
          'Setup Required',
        );
      }

      session = {
        userId: data.user.id,
        email: data.user.email || email,
        fullName: data.user.user_metadata?.['full_name'] || membership.roleName,
        role: membership.roleName,
        businessId: membership.businessId,
        storeId: stores[0]?.id ?? '',
        permissions: membership.permissions,
        isDemo: false,
      };
    } catch (authError) {
      this.notification.error(
        authError instanceof Error ? authError.message : 'Unable to load your account details',
        'Login Failed',
      );
      return false;
    }

    this.authState.setSession(session);
    this.appContext.selectStore(session.storeId || null);
    this.appContext.selectBusiness(session.businessId);
    this.notification.success(`Welcome back, ${session.fullName}`, 'Session Active');
    this.router.navigate(['/pos']);
    return true;
  }

  /**
   * Restores a previously authenticated Supabase session on bootstrap.
   * Returns false when no session exists (the demo fallback stays in place).
   */
  async restoreSession(): Promise<boolean> {
    const { data } = await this.supabase.auth.getSession();
    if (!data.session?.user) {
      return false;
    }

    try {
      const user = data.session.user;
      const membership = await this.businessRepo.getMembershipForUser(user.id);
      if (!membership) {
        return false;
      }
      const stores = await this.storeRepo.getStoresByBusiness(membership.businessId);

      this.authState.setSession({
        userId: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.['full_name'] || membership.roleName,
        role: membership.roleName,
        businessId: membership.businessId,
        storeId: stores[0]?.id ?? '',
        permissions: membership.permissions,
        isDemo: false,
      });
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.authState.clearSession();
    this.notification.info('You have ended your terminal shift.', 'Logged Out');
    this.router.navigate(['/pos']);
  }
}
