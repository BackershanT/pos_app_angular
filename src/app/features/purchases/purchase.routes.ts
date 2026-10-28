import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./purchase-list.component').then((m) => m.PurchaseListComponent),
  },
];
