import { Component, computed, effect, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  calculateCartTotals,
  calculateLineItemTotals,
  CartItemCalculationInput,
  generateIdempotencyKey,
  roundCurrency,
  validateSplitPayments,
  PaymentInput,
} from '../../shared/utils/calculation.utils';
import { describeError, LoadState } from '../../shared/utils/load-state.util';
import { AutoFocusDirective } from '../../shared/directives/auto-focus.directive';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { LayoutService } from '../../core/services/layout.service';
import { AppContext } from '../../core/context/app-context.service';
import { AuthState } from '../../core/auth/auth.state';
import { NotificationService } from '../../core/services/notification.service';
import { PrinterService } from '../../core/services/printer.service';
import { ProductCardComponent, BaseProductCardInput } from '../../shared/components/product-card/product-card.component';
import { DataStateComponent } from '../../shared/components/data-state/data-state.component';
import { ProductRepository } from '../../data-access/repositories/product.repository';
import { CategoryRepository } from '../../data-access/repositories/category.repository';
import { OrderRepository } from '../../data-access/repositories/order.repository';
import { RealtimeService } from '../../data-access/supabase/realtime.service';
import { CompleteSaleResponse, PaymentMethod } from '../../data-access/models/order.model';
import { environment } from '../../../environments/environment';

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  /** Category primary key - filtering matches on this, never on label text. */
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  /** products.tax_rate from the database (0.0500 = 5%). Zero-rated goods stay at 0. */
  taxRate: number;
  /** null when the branch does not track this product (untracked != zero stock). */
  stock: number | null;
  icon: string;
  color: string;
}

export interface CartItem {
  product: CatalogProduct;
  quantity: number;
  discount: number;
}

export interface CategoryTab {
  id: string;
  name: string;
  icon: string;
}

export type TenderMode = 'cash' | 'card' | 'split';

export interface ReceiptLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** Typed receipt projection - replaces the previous `signal<any>` invoice bag. */
export interface Receipt {
  saleId: string;
  invoiceNumber: string;
  issuedAt: Date;
  businessName: string;
  storeName: string;
  storeAddress: string;
  terminalId: string;
  cashierName: string;
  trn: string;
  currency: string;
  lines: ReceiptLine[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  tenders: { method: string; amount: number }[];
  changeDue: number;
  /** True when the server recognised our idempotency key and replayed the original sale. */
  replayed: boolean;
}

const INITIAL_CATEGORY_TABS: CategoryTab[] = [
  { id: 'all', name: 'All Items', icon: 'pi pi-th-large' },
];

const ALL_TAB: CategoryTab = { id: 'all', name: 'All Items', icon: 'pi pi-th-large' };

function getCategoryIcon(codeOrName: string): string {
  const lower = codeOrName.toLowerCase();
  if (lower.includes('coffee') || lower.includes('drink') || lower.includes('beverage')) return 'pi pi-coffee';
  if (lower.includes('bake') || lower.includes('pastry') || lower.includes('bread')) return 'pi pi-sun';
  if (lower.includes('sandwich') || lower.includes('savoury') || lower.includes('savory') || lower.includes('meal')) return 'pi pi-align-justify';
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('cake')) return 'pi pi-heart';
  return 'pi pi-th-large';
}

function getCategoryColor(codeOrName: string): string {
  const lower = codeOrName.toLowerCase();
  if (lower.includes('coffee') || lower.includes('drink') || lower.includes('beverage')) return '#3b82f6';
  if (lower.includes('bake') || lower.includes('pastry')) return '#f59e0b';
  if (lower.includes('sandwich') || lower.includes('savoury') || lower.includes('savory') || lower.includes('meal')) return '#10b981';
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('cake')) return '#ec4899';
  return '#6366f1';
}

function getProductIcon(name: string, category: string): string {
  const lower = (name + ' ' + category).toLowerCase();
  if (lower.includes('latte') || lower.includes('macchiato') || lower.includes('brew') || lower.includes('pour')) return '☕';
  if (lower.includes('tea') || lower.includes('karak') || lower.includes('matcha')) return '🍵';
  if (lower.includes('croissant') || lower.includes('pain')) return '🥐';
  if (lower.includes('bread') || lower.includes('sourdough')) return '🍞';
  if (lower.includes('roll') || lower.includes('brioche') || lower.includes('tart')) return '🥧';
  if (lower.includes('bagel') || lower.includes('panini') || lower.includes('sandwich') || lower.includes('toast')) return '🥪';
  if (lower.includes('cake') || lower.includes('cheesecake')) return '🍰';
  if (lower.includes('kunafa') || lower.includes('pudding')) return '🍮';
  if (lower.includes('bowl') || lower.includes('acai')) return '🫐';
  if (lower.includes('chocolate') || lower.includes('fondant')) return '🍫';
  if (lower.includes('bean') || lower.includes('mug') || lower.includes('tumbler') || lower.includes('dripper')) return '🫘';
  return '📦';
}

/** Stable slug used for the small category chip on each card. */
function slugify(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return 'general';
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutoFocusDirective,
    CurrencyFormatPipe,
    TruncatePipe,
    DateFormatPipe,
    ProductCardComponent,
    DataStateComponent,
  ],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
})
export class PosComponent implements OnInit {
  private readonly productRepo = inject(ProductRepository);
  private readonly categoryRepo = inject(CategoryRepository);
  private readonly orderRepo = inject(OrderRepository);
  private readonly notification = inject(NotificationService);
  private readonly printer = inject(PrinterService);
  readonly layout = inject(LayoutService);
  readonly realtime = inject(RealtimeService);
  readonly context = inject(AppContext);
  readonly authState = inject(AuthState);

  /** Catalog lifecycle: loading / ready / empty / error - never a silent fallback array. */
  readonly catalogState = new LoadState();

  readonly isSubmitting = signal<boolean>(false);
  readonly checkoutError = signal<string | null>(null);

  selectedCategory = signal<string>('all');
  searchQuery = signal<string>('');
  cart = signal<CartItem[]>([]);
  orderDiscount = signal<number>(0);

  // Checkout Modal State
  isPaymentModalOpen = signal<boolean>(false);
  paymentMethod = signal<TenderMode>('card');
  amountTendered = signal<number>(0);
  splitCash = signal<number>(0);
  isSuccessModalOpen = signal<boolean>(false);
  receipt = signal<Receipt | null>(null);

  /** Reused across retries of the same ticket so the server can dedupe the sale. */
  private idempotencyKey = signal<string | null>(null);

  private _categories = signal<CategoryTab[]>(INITIAL_CATEGORY_TABS);
  private _products = signal<CatalogProduct[]>([]);

  get categories(): CategoryTab[] {
    return this._categories();
  }

  get products(): CatalogProduct[] {
    return this._products();
  }

  /** Reload the register whenever the operator switches branch. */
  private readonly storeSwitchEffect = effect(() => {
    const storeId = this.context.storeId();
    queueMicrotask(() => {
      if (storeId && storeId !== this.loadedStoreId) {
        this.loadedStoreId = storeId;
        void this.loadCatalog();
      }
    });
  });
  private loadedStoreId = '';

  async ngOnInit() {
    this.loadedStoreId = this.context.storeId();
    await this.loadCatalog();
  }

  /**
   * Loads the branch catalog. Failures land in `catalogState` so the register can
   * show a retry instead of silently selling a fabricated product list.
   */
  async loadCatalog(options: { silent?: boolean } = {}) {
    if (!this.context.isConfigured()) {
      this.catalogState.fail(
        'No store is linked to this session, so the catalog cannot be loaded.',
      );
      return;
    }

    await this.catalogState.run(
      async () => {
        const storeId = this.context.storeId();
        const [catalog, categoriesData] = await Promise.all([
          this.productRepo.getBranchCatalog(storeId, {
            limit: environment.pos.catalogPageSize,
          }),
          this.categoryRepo.getCategories(),
        ]);

        this._categories.set([
          ALL_TAB,
          ...categoriesData.map((c) => ({
            id: c.id,
            name: c.name,
            icon: getCategoryIcon(`${c.name} ${c.description ?? ''}`),
          })),
        ]);

        this._products.set(catalog.products.map((p) => this.toCatalogProduct(p)));

        if (catalog.truncated) {
          this.notification.warning(
            `This branch has more than ${catalog.products.length} products; only the first page is on the register. Use Search to find the rest.`,
            'Catalog truncated',
          );
        }

        return catalog.products.length > 0;
      },
      { silent: options.silent, emptyReason: 'no_data' },
    );
  }

  private toCatalogProduct(p: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    selling_price: number | string;
    tax_rate: number | string | null;
    category_id: string | null;
    category_name?: string;
    category_code?: string;
    quantity_on_hand: number;
    inventory_tracked: boolean;
  }): CatalogProduct {
    const categoryName = p.category_name || 'Uncategorized';
    const categoryCode = p.category_code || slugify(categoryName);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      price: roundCurrency(Number(p.selling_price)),
      categoryId: p.category_id || 'uncategorized',
      categoryName,
      categoryCode,
      // `0.0000` is a legitimate zero-rated line, so only null/undefined falls back.
      taxRate: p.tax_rate == null ? this.context.vatRate() : Number(p.tax_rate),
      stock: p.inventory_tracked ? Number(p.quantity_on_hand) : null,
      icon: getProductIcon(p.name, categoryCode),
      color: getCategoryColor(categoryCode),
    };
  }

  filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();
    return this._products().filter((p) => {
      const matchCat = cat === 'all' || p.categoryId === cat;
      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.includes(query));
      return matchCat && matchQuery;
    });
  });

  cartCalculations = computed(() => {
    const itemsInput: CartItemCalculationInput[] = this.cart().map((item) => ({
      unitPrice: item.product.price,
      quantity: item.quantity,
      discountAmount: item.discount,
      taxRate: item.product.taxRate,
    }));

    return calculateCartTotals(itemsInput, this.orderDiscount());
  });

  /** Blended VAT label, so a mixed 5%/0% basket is never mislabelled as flat 5%. */
  vatLabel = computed(() => {
    const calcs = this.cartCalculations();
    const taxableBase = calcs.subtotal - calcs.discountTotal;
    if (taxableBase <= 0 || calcs.taxTotal <= 0) {
      const rates = new Set(this.cart().map((i) => i.product.taxRate));
      return rates.size === 1 ? `${(Number([...rates][0]) * 100).toFixed(2).replace(/\.00$/, '')}%` : 'VAT';
    }
    const blended = (calcs.taxTotal / taxableBase) * 100;
    return `${blended.toFixed(2).replace(/\.00$/, '')}%`;
  });

  /** Tender lines for the selected payment mode, denominated in the sale currency. */
  tenders = computed<{ method: PaymentMethod; amount: number }[]>(() => {
    const total = this.cartCalculations().grandTotal;
    const mode = this.paymentMethod();

    if (mode === 'cash') {
      return [{ method: 'cash', amount: roundCurrency(this.amountTendered() || 0) }];
    }
    if (mode === 'card') {
      return [{ method: 'card', amount: roundCurrency(total) }];
    }
    const cash = roundCurrency(this.splitCash() || 0);
    const card = roundCurrency(total - cash);
    return [
      { method: 'cash', amount: cash },
      { method: 'card', amount: Math.max(0, card) },
    ];
  });

  paymentValidation = computed(() =>
    validateSplitPayments(this.cartCalculations().grandTotal, this.tenders() as PaymentInput[]),
  );

  changeDue = computed(() => this.paymentValidation().changeDue);

  outstandingBalance = computed(() => this.paymentValidation().remainingBalance);

  /** Units already in the ticket for a product, used for the stock ceiling check. */
  private cartQuantityFor(productId: string): number {
    return this.cart().find((ci) => String(ci.product.id) === String(productId))?.quantity ?? 0;
  }

  isSoldOut(product: CatalogProduct): boolean {
    return product.stock !== null && product.stock <= 0;
  }

  addToCart(input: BaseProductCardInput | CatalogProduct) {
    const source = input as CatalogProduct;
    const fullProduct =
      this._products().find((p) => String(p.id) === String(source.id)) ?? source;

    const current = this.cart();
    const existingIndex = current.findIndex(
      (item) => String(item.product.id) === String(fullProduct.id),
    );
    const requested = (existingIndex > -1 ? current[existingIndex].quantity : 0) + 1;

    if (fullProduct.stock !== null && requested > fullProduct.stock) {
      this.notification.warning(
        `${fullProduct.name} has only ${fullProduct.stock} unit(s) on hand at this branch.`,
        'Stock limit reached',
      );
      return;
    }

    if (existingIndex > -1) {
      // Immutable update: mutating the object inside the signal leaves stale
      // computed consumers behind.
      this.cart.set(
        current.map((item, index) =>
          index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
    } else {
      this.cart.set([...current, { product: fullProduct, quantity: 1, discount: 0 }]);
    }
  }

  incrementQuantity(item: CartItem) {
    if (item.product.stock !== null && item.quantity + 1 > item.product.stock) {
      this.notification.warning(
        `${item.product.name} is limited to ${item.product.stock} unit(s) on hand.`,
        'Stock limit reached',
      );
      return;
    }
    this.cart.set(
      this.cart().map((ci) =>
        ci.product.id === item.product.id ? { ...ci, quantity: ci.quantity + 1 } : ci,
      ),
    );
  }

  decrementQuantity(item: CartItem) {
    if (item.quantity > 1) {
      this.cart.set(
        this.cart().map((ci) =>
          ci.product.id === item.product.id ? { ...ci, quantity: ci.quantity - 1 } : ci,
        ),
      );
    } else {
      this.removeFromCart(item);
    }
  }

  removeFromCart(item: CartItem) {
    this.cart.set(this.cart().filter((ci) => ci.product.id !== item.product.id));
  }

  clearCart() {
    this.cart.set([]);
    this.orderDiscount.set(0);
    this.idempotencyKey.set(null);
    this.checkoutError.set(null);
  }

  getCartQuantity(productId: string | number): number {
    return this.cartQuantityFor(String(productId));
  }

  lineSubtotal(item: CartItem): number {
    return calculateLineItemTotals(item.product.price, item.quantity, item.discount, 0).subtotal;
  }

  openPaymentModal() {
    if (this.cart().length === 0) return;
    const total = this.cartCalculations().grandTotal;
    this.amountTendered.set(total);
    this.splitCash.set(Math.round(total / 2 * 100) / 100);
    this.checkoutError.set(null);
    // One key per ticket attempt: retried submissions must never create a second sale.
    this.idempotencyKey.set(generateIdempotencyKey());
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal() {
    if (this.isSubmitting()) return;
    this.isPaymentModalOpen.set(false);
  }

  /**
   * Commits the sale through the `complete_sale` RPC and only reports success once
   * the server confirms it. Prices, VAT, invoice number and stock movements are all
   * derived server-side; the client total is used solely as a pre-check.
   */
  async confirmSale(): Promise<void> {
    if (this.isSubmitting()) return;

    const calcs = this.cartCalculations();

    if (this.cart().length === 0) {
      this.notification.warning('Add at least one product before taking payment.');
      return;
    }

    if (!this.context.isConfigured()) {
      this.checkoutError.set(
        'This terminal has no valid store context, so the sale cannot be recorded. Sign in with a staff account.',
      );
      this.notification.error(this.checkoutError()!, 'Terminal not configured');
      return;
    }

    const validation = this.paymentValidation();
    if (!validation.isFullyPaid) {
      this.checkoutError.set(
        `Outstanding balance of ${validation.remainingBalance.toFixed(2)} ${this.context.currency()}.`,
      );
      this.notification.warning(
        `Tendered ${validation.totalPaid.toFixed(2)} of ${validation.grandTotal.toFixed(2)} ${this.context.currency()}.`,
        'Payment incomplete',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.checkoutError.set(null);

    // Snapshot before any state reset - the receipt must describe the ticket that was sold.
    const soldItems = this.cart();

    try {
      const result: CompleteSaleResponse = await this.orderRepo.completeSale({
        store_id: this.context.storeId(),
        items: soldItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          discount_amount: item.discount,
        })),
        payments: this.tenders(),
        idempotency_key: this.idempotencyKey(),
        notes: `Terminal ${this.context.terminalId()}`,
      });

      this.receipt.set(this.buildReceipt(result, soldItems, validation));
      this.isSuccessModalOpen.set(true);
      this.isPaymentModalOpen.set(false);
      this.clearCart();
      this.notification.success(
        result.is_idempotent_replay
          ? `Invoice ${result.invoice_number} was already recorded; showing the original sale.`
          : `Invoice ${result.invoice_number} recorded.`,
        'Sale completed',
      );

      // Reflect the new server balance without a blocking reload.
      void this.loadCatalog({ silent: true });
    } catch (err) {
      const message = describeError(err);
      this.checkoutError.set(message);
      this.notification.error(message, 'Checkout failed');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /** Server figures win whenever they differ from the client estimate. */
  private buildReceipt(
    result: CompleteSaleResponse,
    soldItems: CartItem[],
    validation: ReturnType<typeof validateSplitPayments>,
  ): Receipt {
    return {
      saleId: result.sale_id,
      invoiceNumber: result.invoice_number,
      issuedAt: new Date(),
      businessName: this.context.businessName(),
      storeName: this.context.storeName(),
      storeAddress: this.context.storeAddress(),
      terminalId: this.context.terminalId(),
      cashierName: this.authState.currentSession()?.fullName ?? 'Staff',
      trn: this.context.taxNumber(),
      currency: this.context.currency(),
      lines: soldItems.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        lineTotal: this.lineSubtotal(item),
      })),
      subtotal: Number(result.subtotal),
      discountTotal: Number(result.discount_total),
      vatTotal: Number(result.tax_total),
      grandTotal: Number(result.grand_total),
      tenders: this.tenders().map((t) => ({ method: t.method.toUpperCase(), amount: t.amount })),
      changeDue: Number(result.change_amount ?? validation.changeDue),
      replayed: result.is_idempotent_replay === true,
    };
  }

  closeSuccessModal() {
    this.isSuccessModalOpen.set(false);
    this.receipt.set(null);
  }

  printReceipt() {
    const invoice = this.receipt();
    if (!invoice) return;

    void this.printer.printReceipt({
      businessName: invoice.businessName,
      storeName: invoice.storeName,
      storeAddress: invoice.storeAddress,
      trn: invoice.trn,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.issuedAt.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }),
      cashierName: invoice.cashierName,
      items: invoice.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.lineTotal,
      })),
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatTotal,
      grandTotal: invoice.grandTotal,
      paymentMethod: invoice.tenders.map((t) => t.method).join(' + '),
      amountTendered: invoice.tenders.reduce((sum, t) => sum + t.amount, 0),
      changeDue: invoice.changeDue,
    });
  }
}
