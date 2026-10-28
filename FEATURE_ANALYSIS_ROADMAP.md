# AeroPOS UAE — Comprehensive Project Feature Analysis & Implementation Roadmap

> **System Overview**: AeroPOS is an enterprise-grade Point of Sale (POS) and Retail Management platform engineered with **Angular 21 (Standalone Components & Signals)**, **Supabase PostgreSQL backend**, and strict compliance with the **UAE Federal Tax Authority (FTA) 5% VAT** regulations and electronic tax invoice standards.

---

## 1. Architectural Foundation & Tech Stack

| Layer | Technology & Implementation |
| :--- | :--- |
| **Framework** | Angular 21 (Standalone Components, Signals, Computed properties, Effects) |
| **Styling & Design System** | Vanilla CSS Glassmorphism Design Tokens, PrimeIcons, Dynamic Light / Dark / System Themes |
| **Responsiveness** | Mobile (<768px), Tablet (768–1023px), and Desktop (≥1024px) with reactive `LayoutService` |
| **Data Access** | Repository Pattern (`src/app/data-access/repositories/`) wrapping Supabase Typed Client |
| **Hardware Integration** | USB Barcode Scanner Directive (`BarcodeInputDirective`) with fast-input buffering |
| **Compliance** | UAE FTA 5% VAT calculations, TRN validation, Simplified Tax Invoice bilingual thermal receipts |
| **Test Engine** | Vitest (`@angular/build:unit-test`) with JSDOM environment |

---

## 2. Implemented Features Analysis (Operational & Verified)

### 2.1 POS Terminal & Register (`/pos`)
- **Dual-Mode Touch Interface**:
  - Desktop & Tablet: Side-by-side product catalog and active cart drawer.
  - Mobile (<768px): Segmented tabs (`Products Catalog` ↔ `Current Ticket`) with a floating bottom checkout bar.
- **Product Catalog Grid**:
  - Horizontal category pills filter items smoothly.
  - Product cards display visual emoji/photo, SKU, price in AED, low-stock indicators (<15 units), and quick-add actions.
- **Cart & Calculation Engine**:
  - Real-time signals calculating Subtotal, UAE 5% VAT, Discount deductions, and Total Payable.
  - Unit quantity increment/decrement, line deletion, and clear cart actions.
- **Tender & Payment Processing**:
  - Payment modal supporting **Card / Apple Pay**, **Cash**, and **Split Tender**.
  - Cash tender calculation with auto-computed change due.
  - Complete sale authorization committing inventory deductions.
- **Thermal Receipt Generation**:
  - Official UAE Simplified Tax Invoice layout with TRN, invoice timestamp, itemized list, VAT breakdown, and QR code placeholder.

### 2.2 Executive Intelligence Dashboard (`/dashboard`)
- **Live KPI Metrics**: Today's Gross Sales (AED), Total Order Count, UAE 5% VAT Collected, and Low Stock SKU alert count.
- **Live Transaction Stream**: Real-time recent terminal transaction stream with invoice IDs, cashier names, totals, and timestamps.
- **Responsive Layout**: Adapts from 4-card grid on desktop to 2-column touch cards on mobile, with touch-scrollable sales table.

### 2.3 Product Catalog & Master Data (`/products`)
- **Master Table**: Columns for Product Name, SKU, Barcode, Category, Cost Price, Selling Price, 5% UAE VAT, Margin %, Stock count, and Stock status.
- **Search & Filtering**: Live search by name, SKU, or barcode; filter chips by category.
- **Add / Edit Product Modal**: Reactive form with validation for name, SKU, barcode, category, cost, and selling price.
- **Pagination**: Dedicated standalone `PaginationComponent` handling dynamic page sizing and page jumps.

### 2.4 Stock & Inventory Movements (`/inventory`)
- **Dual Tabs**: Stock Level Audit vs. Stock Movement Ledger.
- **Manual Stock Adjustments**: Modal to record stock adjustments (Restock, Damaged, Theft, Expired, Inventory Count).
- **Movement History**: Detailed audit trail tracking transaction type, quantity change (+/-), user/cashier, and notes.

### 2.5 Sales & Receipts Ledger (`/sales`)
- **Transaction History**: Searchable list of all completed invoices with payment methods and cashier details.
- **Refund & Reversal Processing**: Refund modal allowing partial or full item refund with automated inventory restock and reason logging.
- **Thermal Invoice Preview**: Modal to view and re-print simplified tax invoice receipts for any past sale.

### 2.6 Customers CRM (`/customers`)
- **Directory**: Tracks customer name, phone, email, UAE TRN (for B2B invoicing), loyalty points, and total purchase spend.
- **Add Customer Modal**: Reactive form for registering walk-in or corporate customers.

### 2.7 Suppliers Directory (`/suppliers`)
- **Vendor Registry**: Supplier company name, contact person, phone, email, UAE TRN, payment terms (Net 15, Net 30, COD), and active status.
- **Add Supplier Modal**: Validated form to onboard new wholesale vendors.

### 2.8 Audited Reports & UAE Tax Compliance (`/reports`)
- **UAE FTA Tax Summary**: Output Tax (5% collected on standard rated sales), Exempt/Zero-rated sales, and Net VAT liability.
- **Z-Report (End of Day)**: Total gross sales, total tax collected, tender breakdown (Cash vs Card), and refund totals.
- **Print & Thermal Export**: Formatted printable daily summary for store accountants.

### 2.9 Store Settings & Theme System (`/settings`)
- **Store Configuration**: Branch name, store code, UAE Tax Registration Number (TRN), VAT rate (5%), receipt header/footer notes.
- **Theme Switcher**: Instant switching between **Dark Mode**, **Light Mode**, and **System Automatic** with CSS variables and persistence in `localStorage`.

### 2.10 Shared Framework & Directives
- **Directives**:
  - `BarcodeInputDirective`: High-speed keystroke scanner detection (<50ms buffer) for USB/Bluetooth barcode guns.
  - `AutoFocusDirective`: Auto-focusing tender amount inputs and search fields with optional text pre-selection.
- **Pipes**:
  - `CurrencyFormatPipe`: Formats numbers into AED currency format (`0.00 AED`).
  - `TruncatePipe`: Truncates long product titles with trailing ellipsis.
  - `DateFormatPipe`: Formats dates into short, long, or receipt thermal styles.
- **Utilities**:
  - `calculation.utils.ts`: Pure domain calculation functions for UAE VAT, cart totals, discounts, tender change, and refunds.

---

## 3. Features To Be Implemented / Gap Analysis

While the core POS terminal and primary listing screens are established, the following operational modules were identified as missing or 0-byte stubs:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FEATURE GAP ANALYSIS                            │
├────────────────────────────────┬─────────────────┬─────────────────────┤
│ Feature Domain                 │ Current Status  │ Required Actions    │
├────────────────────────────────┼─────────────────┼─────────────────────┤
│ 1. Purchases & GRN (PO System) │ 0-byte stubs    │ Implement PO model, │
│    - Purchase Orders           │ in `purchases/` │ repository, list,   │
│    - Goods Received Notes      │                 │ PO creation modal,  │
│    - Stock replenishment on GRN│                 │ stock restock logic │
├────────────────────────────────┼─────────────────┼─────────────────────┤
│ 2. Category Master Management  │ 0-byte stubs    │ Implement category  │
│    - Category CRUD             │ in `categories/`│ model, repository,  │
│    - Color & PrimeIcon picker  │                 │ list, create modal, │
│    - Product count binding     │                 │ POS category sync   │
├────────────────────────────────┼─────────────────┼─────────────────────┤
│ 3. Staff & Cashier Management  │ 0-byte stubs    │ Implement staff     │
│    - Cashier profiles & roles  │ in `staff/`     │ model, repository,  │
│    - 4-Digit Security PIN      │                 │ list, add modal,    │
│    - Register lock / switch    │                 │ terminal assignment │
├────────────────────────────────┼─────────────────┼─────────────────────┤
│ 4. Data Access Repositories    │ 0-byte stubs    │ Implement concrete  │
│    - Product, Customer,        │ in `repos/`     │ repository classes  │
│      Supplier, Inventory, etc. │                 │ extending BaseRepo  │
├────────────────────────────────┼─────────────────┼─────────────────────┤
│ 5. Automated Test Suite        │ Scaffolded      │ Implement unit tests│
│    - Utilities, Services,      │ app.spec.ts     │ for calculations,   │
│      Directives, POS Component │ only            │ services, and POS   │
└────────────────────────────────┴─────────────────┴─────────────────────┘
```

---

## 4. Implementation Plan for Missing Features

### Milestone 1: Concrete Repositories Implementation
- Implement `ProductRepository`, `CustomerRepository`, `SupplierRepository`, `InventoryRepository`, `PurchaseRepository`, `CategoryRepository`, and `StaffRepository` extending `BaseRepository`.
- Provide methods for fetching, inserting, updating, and querying records with typed Supabase client calls.

### Milestone 2: Purchases & Goods Received Notes (GRN) Module
- **Purpose**: Allow store managers to order stock from suppliers and officially receive goods (GRN), which automatically increases product inventory.
- **Workflow**:
  1. Store manager clicks "Create Purchase Order".
  2. Selects Supplier from directory, selects products, enters quantity and wholesale unit cost.
  3. System calculates subtotal, 5% UAE VAT, and total payable in AED.
  4. Status workflow: `Draft` → `Ordered` → `Received` → `Paid`.
  5. When marked `Received`, inventory levels for the corresponding products are incremented and a movement log is generated.

### Milestone 3: Category Master Management Module
- **Purpose**: Dedicated category management enabling merchants to add/edit product categories with customized colors and icons.
- **Workflow**:
  1. View category cards with icon, color badge, active item count.
  2. Add new category with name, description, color theme, and icon.
  3. Seamless integration with POS category pills and product catalog.

### Milestone 4: Staff & Cashier PIN Access Module
- **Purpose**: Manage terminal cashiers, assign security PINs, and designate operational roles.
- **Workflow**:
  1. View cashier directory with role badges (Head Cashier, Cashier, Store Manager, Auditor).
  2. Register new staff members with employee code, contact info, and 4-digit PIN.
  3. Track active terminal shift status.

### Milestone 5: Comprehensive Unit & Component Test Suite
- Write Vitest unit tests verifying:
  - UAE 5% VAT calculations (both inclusive and exclusive).
  - Cart calculation formulas (discounts, subtotals, grand totals, cash change).
  - Theme switching and persistence (`ThemeService`).
  - Responsive layout breakpoint signals and sidebar toggling (`LayoutService`).
  - Hardware barcode scanner directive input buffering (`BarcodeInputDirective`).
  - Standalone pipes (`CurrencyFormatPipe`, `TruncatePipe`).
  - POS component cart state and interactions (`PosComponent`).
- Execute all tests using `npx ng test --watch=false` to achieve 100% test pass rate.
