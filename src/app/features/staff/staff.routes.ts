import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./staff-list.component').then((m) => m.StaffListComponent),
  },
];
