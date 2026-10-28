import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthState } from '../../core/auth/auth.state';
import { AuthService } from '../../core/auth/auth.service';
import {
  DEFAULT_SIDEBAR_NAV_SECTIONS,
  filterNavSections,
  SidebarCashierProfile,
  SidebarNavItem,
  SidebarNavSection,
  SidebarStoreInfo,
} from './sidebar-nav.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly authState = inject(AuthState);
  private readonly authService = inject(AuthService);

  /** All configured navigation sections */
  readonly allSections = signal<SidebarNavSection[]>(DEFAULT_SIDEBAR_NAV_SECTIONS);

  /** Filtered navigation sections based on dynamic user permissions and role */
  readonly visibleSections = computed(() => {
    const permissions = this.authState.permissions();
    const role = this.authState.currentSession()?.role;
    return filterNavSections(this.allSections(), permissions, role);
  });

  /** Active Store & Register information */
  readonly storeInfo = computed<SidebarStoreInfo>(() => {
    const session = this.authState.currentSession();
    return {
      storeId: session?.storeId || 'store-dubai-mall-01',
      storeName: 'Dubai Mall Flagship',
      branchCode: 'DXB-01',
      terminalId: 'Terminal 01',
      isOnline: true,
      taxRegistrationNumber: 'TRN 10023489100003',
    };
  });

  /** Current logged-in Cashier Profile */
  readonly cashierProfile = computed<SidebarCashierProfile>(() => {
    const session = this.authState.currentSession();
    const fullName = session?.fullName || 'Kasun Backer';
    const initials = fullName
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      userId: session?.userId || 'usr-001',
      fullName,
      email: session?.email || 'kasun@aeropos.ae',
      role: session?.role || 'Head Cashier',
      initials: initials || 'KB',
    };
  });

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}
