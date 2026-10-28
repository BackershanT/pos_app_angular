import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./category-list.component').then((m) => m.CategoryListComponent),
  },
];
