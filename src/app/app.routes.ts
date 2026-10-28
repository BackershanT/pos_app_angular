import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'pos',
      },
      {
        path: 'pos',
        loadComponent: () =>
          import('./features/pos/pos.component').then((m) => m.PosComponent),
        title: 'POS Register | AeroPOS UAE',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        title: 'Dashboard | AeroPOS UAE',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/product-list.component').then(
            (m) => m.ProductListComponent
          ),
        title: 'Products Master | AeroPOS UAE',
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/inventory-list.component').then(
            (m) => m.InventoryListComponent
          ),
        title: 'Inventory & Movements | AeroPOS UAE',
      },
      {
        path: 'sales',
        loadComponent: () =>
          import('./features/sales/sales-list.component').then(
            (m) => m.SalesListComponent
          ),
        title: 'Sales & Receipts | AeroPOS UAE',
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/customers/customer-list.component').then(
            (m) => m.CustomerListComponent
          ),
        title: 'Customers CRM | AeroPOS UAE',
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./features/suppliers/supplier-list.component').then(
            (m) => m.SupplierListComponent
          ),
        title: 'Suppliers Directory | AeroPOS UAE',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then(
            (m) => m.ReportsComponent
          ),
        title: 'Audited Reports & VAT | AeroPOS UAE',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
        title: 'Store Settings | AeroPOS UAE',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'pos',
  },
];
