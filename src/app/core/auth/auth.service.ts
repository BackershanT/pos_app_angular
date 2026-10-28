import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthState, UserSession } from './auth.state';
import { getSupabaseClient } from '../../data-access/supabase/supabase.client';
import { NotificationService } from '../services/notification.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
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

    const session: UserSession = {
      userId: data.user.id,
      email: data.user.email || email,
      fullName: data.user.user_metadata?.['full_name'] || 'Cashier',
      role: 'Cashier',
      businessId: 'biz-ae-001',
      storeId: 'store-dubai-mall-01',
      permissions: ['pos:sale', 'pos:refund', 'inventory:view'],
    };

    this.authState.setSession(session);
    this.notification.success(`Welcome back, ${session.fullName}`, 'Session Active');
    this.router.navigate(['/pos']);
    return true;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.authState.clearSession();
    this.notification.info('You have ended your terminal shift.', 'Logged Out');
    this.router.navigate(['/pos']);
  }
}
