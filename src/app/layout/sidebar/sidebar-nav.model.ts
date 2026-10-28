/**
 * AeroPOS Sidebar Navigation Model & Architecture
 * Defines strongly-typed navigation items, section groupings, role/permission requirements,
 * status badges, and terminal context models for the POS sidebar layout.
 */

export type NavBadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface SidebarNavBadge {
  text: string;
  variant?: NavBadgeVariant;
  icon?: string;
}

export interface SidebarNavItem {
  /** Unique navigation identifier */
  id: string;
  /** Primary label displayed in UI */
  label: string;
  /** Optional secondary or localized Arabic label (e.g. نقطة البيع) */
  arabicLabel?: string;
  /** PrimeIcons CSS class (e.g., 'pi pi-desktop') */
  icon: string;
  /** Angular router path */
  route: string;
  /** Exact route matching for active highlighting */
  exactMatch?: boolean;
  /** Badge / status pill displayed adjacent to label */
  badge?: SidebarNavBadge;
  /** Keyboard shortcut hint (e.g., 'F1', 'F2', 'Ctrl+K') */
  shortcut?: string;
  /** Required permission key from UserSession.permissions (if any) */
  permission?: string;
  /** Allowed roles whitelist (e.g. ['Head Cashier', 'Store Manager', 'Administrator']) */
  roles?: string[];
  /** Whether the item is disabled in the current context */
  disabled?: boolean;
  /** Optional external link flag */
  external?: boolean;
  /** Query parameters to attach to navigation */
  queryParams?: Record<string, string>;
  /** Nested child navigation items (for expandable menus) */
  children?: SidebarNavItem[];
}

export interface SidebarNavSection {
  /** Unique section key */
  id: string;
  /** Category header displayed above items (e.g., 'OPERATIONS', 'MANAGEMENT') */
  sectionTitle: string;
  /** Optional section-level icon */
  icon?: string;
  /** Required permission to view this entire section */
  permission?: string;
  /** Allowed roles whitelist for the section */
  roles?: string[];
  /** Navigation items belonging to this section */
  items: SidebarNavItem[];
}

export interface SidebarStoreInfo {
  storeId: string;
  storeName: string;
  branchCode: string;
  terminalId: string;
  isOnline: boolean;
  taxRegistrationNumber?: string;
}

export interface SidebarCashierProfile {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  initials: string;
  avatarUrl?: string;
}

/**
 * Default POS application navigation schema grouped logically by operational domain.
 */
export const DEFAULT_SIDEBAR_NAV_SECTIONS: SidebarNavSection[] = [
  {
    id: 'operations',
    sectionTitle: 'MAIN OPERATIONS',
    items: [
      {
        id: 'pos',
        label: 'POS Register',
        arabicLabel: 'نقطة البيع',
        icon: 'pi pi-desktop',
        route: '/pos',
        exactMatch: true,
        shortcut: 'F1',
        badge: { text: 'F1', variant: 'primary' },
        permission: 'pos:sale',
      },
      {
        id: 'sales',
        label: 'Sales & Receipts',
        arabicLabel: 'المبيعات والإيصالات',
        icon: 'pi pi-receipt',
        route: '/sales',
        badge: { text: 'Live', variant: 'success' },
        permission: 'pos:sale',
      },
    ],
  },
  {
    id: 'inventory-catalog',
    sectionTitle: 'CATALOG & INVENTORY',
    items: [
      {
        id: 'products',
        label: 'Products Master',
        arabicLabel: 'كتالوج المنتجات',
        icon: 'pi pi-box',
        route: '/products',
        permission: 'inventory:view',
      },
      {
        id: 'categories',
        label: 'Category Master',
        arabicLabel: 'إدارة الفئات',
        icon: 'pi pi-tag',
        route: '/categories',
        permission: 'inventory:view',
      },
      {
        id: 'inventory',
        label: 'Stock & Inventory',
        arabicLabel: 'حركات المخزون',
        icon: 'pi pi-warehouse',
        route: '/inventory',
        badge: { text: 'Audit', variant: 'warning' },
        permission: 'inventory:view',
      },
      {
        id: 'purchases',
        label: 'Purchases & GRN',
        arabicLabel: 'أوامر الشراء والتوريد',
        icon: 'pi pi-shopping-bag',
        route: '/purchases',
        badge: { text: 'GRN', variant: 'primary' },
      },
      {
        id: 'suppliers',
        label: 'Suppliers Directory',
        arabicLabel: 'الموردون',
        icon: 'pi pi-truck',
        route: '/suppliers',
      },
    ],
  },
  {
    id: 'crm',
    sectionTitle: 'CUSTOMER CRM',
    items: [
      {
        id: 'customers',
        label: 'Customers CRM',
        arabicLabel: 'العملاء',
        icon: 'pi pi-users',
        route: '/customers',
      },
    ],
  },
  {
    id: 'analytics',
    sectionTitle: 'ANALYTICS & COMPLIANCE',
    items: [
      {
        id: 'dashboard',
        label: 'Executive Dashboard',
        arabicLabel: 'لوحة التحكم',
        icon: 'pi pi-chart-pie',
        route: '/dashboard',
      },
      {
        id: 'reports',
        label: 'Reports & Tax',
        arabicLabel: 'التقارير وضريبة القيمة المضافة',
        icon: 'pi pi-chart-bar',
        route: '/reports',
        badge: { text: '5% VAT', variant: 'info' },
        permission: 'reports:view',
      },
    ],
  },
  {
    id: 'system',
    sectionTitle: 'SYSTEM & TEAM',
    items: [
      {
        id: 'staff',
        label: 'Staff & Cashier PINs',
        arabicLabel: 'فريق العمل ونقاط الدخول',
        icon: 'pi pi-id-card',
        route: '/staff',
        permission: 'system:manage',
      },
      {
        id: 'settings',
        label: 'Store Settings',
        arabicLabel: 'إعدادات المتجر',
        icon: 'pi pi-cog',
        route: '/settings',
      },
    ],
  },
];

/**
 * Filter navigation sections and items according to the user's active permissions and role.
 */
export function filterNavSections(
  sections: SidebarNavSection[],
  userPermissions: string[],
  userRole?: string
): SidebarNavSection[] {
  return sections
    .map((section) => {
      // Check section-level permission
      if (section.permission && !userPermissions.includes(section.permission)) {
        return null;
      }
      // Check section-level roles
      if (section.roles && section.roles.length > 0) {
        if (!userRole || !section.roles.includes(userRole)) {
          return null;
        }
      }

      // Filter child items
      const filteredItems = section.items.filter((item) => {
        // Check item permission
        if (item.permission && !userPermissions.includes(item.permission)) {
          return false;
        }
        // Check item roles
        if (item.roles && item.roles.length > 0) {
          if (!userRole || !item.roles.includes(userRole)) {
            return false;
          }
        }
        return true;
      });

      if (filteredItems.length === 0) {
        return null;
      }

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section): section is SidebarNavSection => section !== null);
}

/**
 * Flatten all items across all sections into a single array.
 */
export function flattenNavItems(sections: SidebarNavSection[]): SidebarNavItem[] {
  const flattened: SidebarNavItem[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      flattened.push(item);
      if (item.children && item.children.length > 0) {
        flattened.push(...item.children);
      }
    }
  }
  return flattened;
}

/**
 * Find a navigation item by its unique ID.
 */
export function findNavItemById(
  sections: SidebarNavSection[],
  id: string
): SidebarNavItem | undefined {
  return flattenNavItems(sections).find((item) => item.id === id);
}

/**
 * Find a navigation item matching a given URL path.
 */
export function findNavItemByRoute(
  sections: SidebarNavSection[],
  route: string
): SidebarNavItem | undefined {
  return flattenNavItems(sections).find((item) => item.route === route);
}
