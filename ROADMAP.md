# POS Application 12-Week Implementation Roadmap

> **Target**: Working multi-tenant, multi-store MVP with transactional POS, auditable stock, and UAE tax compliance.
> **Pace**: 1 developer working consistently.

---

## Phase Overview & Milestones

### 🏁 Weeks 1–2: Foundation and Database
- [x] Create Angular 21 project with standalone architecture
- [x] Establish modular directory layout (`core`, `shared`, `layout`, `features`, `data-access`)
- [x] Design PostgreSQL schema with 19 tables, explicit foreign keys, and audit ledgers
- [x] Implement multi-tenant RLS policies (`user_belongs_to_business`, `user_has_store_access`)
- [x] Configure multi-environment strategy (`environment.ts`, `environment.development.ts`)
- [ ] Configure PrimeNG & PrimeIcons with custom theme
- [ ] Implement Supabase client singleton & auth state service
- [ ] Build app shell layout (sidebar, topbar, responsive container)
- [ ] Wire initial lazy routes and business/store onboarding flow

**Definition of Done for Weeks 1–2**:
- Working authentication with session persistence.
- A user can create a business and at least one store branch.
- Database access passes tenant isolation checks.

---

### 📦 Weeks 3–4: Product and Inventory Management
- [ ] Product & Category CRUD with Reactive Forms
- [ ] SKU validation & Barcode scanning input directive
- [ ] Opening stock initialization per store branch
- [ ] Authoritative stock adjustment procedure (`adjust_store_inventory`)
- [ ] Stock movement audit ledger history UI (`p-table` with date/reason filters)

**Definition of Done for Weeks 3–4**:
- Inventory adjustments cannot overwrite balances without recording a delta and reason in `stock_movements`.
- Products cannot be sold across different tenants.

---

### 💳 Weeks 5–6: POS and Checkout
- [ ] High-speed responsive POS register interface
- [ ] Instant search and barcode hardware scanner listener
- [ ] Angular cart state with pure calculations ([calculation.utils.ts](file:///d:/angular/pos_app/src/app/shared/utils/calculation.utils.ts))
- [ ] Item-level and order-level discount rules
- [ ] Multi-tender payment dialog (Cash, Card, Split) with change calculation
- [ ] Idempotent transactional checkout RPC (`complete_sale`)
- [ ] Receipt preview and thermal print utility

**Definition of Done for Weeks 5–6**:
- Two concurrent cashiers cannot sell the last item of stock (verified by `FOR UPDATE` locking).
- Retrying a failed/timed-out network request produces no duplicate sales or double inventory deductions.
- Thermal receipt formats properly formatted for standard 80mm roll.

---

### 🔄 Weeks 7–8: Sales and Purchasing
- [ ] Sales history grid with status filters (`completed`, `partially_refunded`, `refunded`)
- [ ] Invoice detail viewer with immutable line item snapshots
- [ ] Refund & reversal dialog with optional restock toggle (`process_sale_refund`)
- [ ] Supplier management with contact details
- [ ] Purchase order creation and status tracking (`draft` &rarr; `ordered` &rarr; `received`)
- [ ] Stock receiving workflow updating `store_inventory` and `stock_movements`

**Definition of Done for Weeks 7–8**:
- Completed sales cannot be deleted.
- Refunds accurately update financial totals and replenish inventory only when stock is returned.

---

### 📊 Weeks 9–10: Roles and Reporting
- [ ] Role-Based Access Control (Cashier, Store Manager, Business Admin)
- [ ] Daily sales summary report (gross, net, tax, payment breakdown)
- [ ] Inventory valuation & low-stock alerts
- [ ] Executive KPI dashboard (Revenue, Orders, Average Order Value)
- [ ] Audit log viewer tracking sensitive operations
- [ ] Automated cross-tenant isolation security tests

**Definition of Done for Weeks 9–10**:
- Staff members can only view records for assigned stores.
- Tenant isolation tests pass: Business A cannot read or mutate Business B's data under any route.

---

### 🚀 Weeks 11–12: Testing and Pilot Deployment
- [ ] Unit tests for calculation utils and currency math (`vitest`)
- [ ] End-to-end checkout, split payment, and refund test suite
- [ ] Frontend production build & deployment (Netlify/Vercel)
- [ ] Production Supabase instance configuration with automated daily backups
- [ ] Thermal printer hardware validation in physical pilot store
- [ ] Live pilot with real test business

**Definition of Done for Weeks 11–12**:
- Backup restoration verified.
- Error monitoring (e.g. Sentry) active.
- Pilot cashier successfully completes 50+ consecutive test transactions without error.

---

## UAE & Regional Compliance Architecture

1. **Tax Registration Number (TRN)**:
   - Configured per business; validated as 15-digit FTA format.
2. **Standard VAT Rate (5%)**:
   - Built into line items and reports with separate VAT breakdowns.
3. **Bilingual Tax Invoices**:
   - Invoices support Arabic and English headers ("Tax Invoice / فاتورة ضريبية").
   - Distinct formats for B2C *Simplified Tax Invoice* vs B2B *Standard Tax Invoice*.
4. **Decoupled E-Invoicing Workstream**:
   - Standardized payload interface ([UaeEInvoicePayload](file:///d:/angular/pos_app/src/app/core/config/app.config.constants.ts)) ready for Accredited Service Provider (ASP) integration without modifying checkout code.

---

## Deployment Strategy

| Environment | Purpose | Infrastructure |
| :--- | :--- | :--- |
| **Development** | Feature development & local testing | Local Angular CLI (`ng serve`) + Supabase Dev project |
| **Staging** | Automated CI/CD, migration verification, team QA | Netlify Preview / Staging Supabase with test tenants |
| **Production** | Live tenant operations | Netlify / Production Supabase with point-in-time recovery & strict RLS |
