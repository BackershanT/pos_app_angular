# Project Architecture & Guidelines

## Core Principles

1. **Standalone Components & Lazy Routing**
   - All Angular components must be standalone (`standalone: true` or default in Angular 19+).
   - All feature routes must be lazy-loaded using `loadComponent` or `loadChildren`.
   - Example route configuration:
     ```typescript
     export const routes: Routes = [
       {
         path: 'dashboard',
         loadComponent: () =>
           import('./features/dashboard/dashboard.component')
             .then(m => m.DashboardComponent),
       },
       {
         path: 'products',
         loadComponent: () =>
           import('./features/products/product-list.component')
             .then(m => m.ProductListComponent),
       },
       {
         path: 'pos',
         loadComponent: () =>
           import('./features/pos/pos.component')
             .then(m => m.PosComponent),
       },
     ];
     ```

2. **State Management with Signals**
   - Use Angular Signals (`signal`, `computed`, `effect`) for local component state and shared UI state where appropriate.
   - Keep state reactive and avoid unnecessary Subject/Observable boilerplate where Signals suffice.

3. **Forms**
   - Use Angular Reactive Forms (`FormGroup`, `FormControl`, `FormBuilder`) for entity forms: products, customers, suppliers, settings, purchases, etc.
   - Use typed forms and dedicated validation utilities.

4. **Repository Pattern for Data Access**
   - Database queries must always be encapsulated behind repositories in `src/app/data-access/repositories/`.
   - Never inject or call Supabase directly from presentation/UI components.
   - UI Components -> Repositories / Feature Services -> Supabase Client.

5. **Separation of Business Logic**
   - Keep calculations (e.g., cart totals, tax computations, discount logic, stock adjustments) and domain rules outside presentation components.
   - Place calculation logic in pure domain utilities (`shared/utils/calculation.utils.ts`) or dedicated services.

6. **Typing & DTOs**
   - Use typed DTOs and database models in `src/app/data-access/models/` and `src/app/data-access/supabase/supabase.types.ts`.
   - Avoid `any` in business logic and repository layers.

7. **UI Component System (PrimeNG)**
   - Use PrimeNG components consistently across features:
     - `p-table` for data grids (products, sales, customers, suppliers, inventory)
     - `p-dialog` for modals and forms
     - `p-dropdown` / `p-select` for select inputs
     - `p-datepicker` / `p-calendar` for date selection
     - `p-toast` for notifications and user feedback

8. **Security & Authorization**
   - Protect client routes with Angular route guards (`auth.guard.ts`, `role.guard.ts`) for navigation flow and UX.
   - Enforce actual data security at the database level in Supabase using Row-Level Security (RLS) policies. Client-side checks are for UX only.
