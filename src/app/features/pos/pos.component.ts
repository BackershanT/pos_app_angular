import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { calculateCartTotals, CartItemCalculationInput } from '../../shared/utils/calculation.utils';
import { AutoFocusDirective } from '../../shared/directives/auto-focus.directive';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { LayoutService } from '../../core/services/layout.service';
import { ProductCardComponent, BaseProductCardInput } from '../../shared/components/product-card/product-card.component';
import { ProductRepository } from '../../data-access/repositories/product.repository';
import { CategoryRepository } from '../../data-access/repositories/category.repository';
import { OrderRepository } from '../../data-access/repositories/order.repository';

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  category: string;
  stock: number;
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

const DEFAULT_CATEGORIES: CategoryTab[] = [
  { id: 'all', name: 'All Items', icon: 'pi pi-th-large' },
  { id: 'coffee', name: 'Coffee & Drinks', icon: 'pi pi-coffee' },
  { id: 'bakery', name: 'Bakery & Pastry', icon: 'pi pi-sun' },
  { id: 'sandwiches', name: 'Sandwiches', icon: 'pi pi-align-justify' },
  { id: 'desserts', name: 'Desserts', icon: 'pi pi-heart' },
];

const DEFAULT_PRODUCTS: CatalogProduct[] = [
  // Coffee & Beverages (Blue/Indigo palette)
  { id: 'p1', name: 'Spanish Latte (Iced)', sku: 'CF-001', barcode: '6291041001', price: 24.0, category: 'coffee', stock: 45, icon: '☕', color: '#3b82f6' },
  { id: 'p2', name: 'Caramel Macchiato', sku: 'CF-002', barcode: '6291041002', price: 22.0, category: 'coffee', stock: 38, icon: '☕', color: '#6366f1' },
  { id: 'p3', name: 'Matcha Green Tea', sku: 'CF-003', barcode: '6291041003', price: 26.0, category: 'coffee', stock: 29, icon: '🍵', color: '#10b981' },
  { id: 'p11', name: 'Cold Brew Reserve', sku: 'CF-004', barcode: '6291041011', price: 25.0, category: 'coffee', stock: 30, icon: '🧊', color: '#0284c7' },
  { id: 'p23', name: 'Cardamom Karak Tea', sku: 'CF-005', barcode: '6291041014', price: 12.0, category: 'coffee', stock: 40, icon: '🫖', color: '#d97706' },
  { id: 'p24', name: 'V60 Ethiopian Pour-Over', sku: 'CF-006', barcode: '6291041015', price: 32.0, category: 'coffee', stock: 25, icon: '☕', color: '#2563eb' },

  // Bakery & Pastry (Golden warm amber/honey palette)
  { id: 'p4', name: 'Butter Croissant', sku: 'BK-001', barcode: '6291041004', price: 14.0, category: 'bakery', stock: 20, icon: '🥐', color: '#f59e0b' },
  { id: 'p5', name: 'Chocolate Pain Au', sku: 'BK-002', barcode: '6291041005', price: 16.0, category: 'bakery', stock: 15, icon: '🥐', color: '#d97706' },
  { id: 'p6', name: 'Artisan Sourdough', sku: 'BK-003', barcode: '6291041006', price: 28.0, category: 'bakery', stock: 12, icon: '🍞', color: '#b45309' },
  { id: 'p13', name: 'Almond Frangipane Tart', sku: 'BK-004', barcode: '6291041016', price: 22.0, category: 'bakery', stock: 18, icon: '🥧', color: '#f59e0b' },
  { id: 'p14', name: 'Cinnamon Cardamom Roll', sku: 'BK-005', barcode: '6291041017', price: 18.0, category: 'bakery', stock: 24, icon: '🥨', color: '#ca8a04' },
  { id: 'p15', name: 'Blueberry Cream Brioche', sku: 'BK-006', barcode: '6291041018', price: 19.0, category: 'bakery', stock: 14, icon: '🥯', color: '#ea580c' },

  // Sandwiches & Savory (Fresh culinary emerald/green palette)
  { id: 'p7', name: 'Truffle Chicken Panini', sku: 'SW-001', barcode: '6291041007', price: 34.0, category: 'sandwiches', stock: 18, icon: '🥪', color: '#10b981' },
  { id: 'p8', name: 'Smoked Salmon Bagel', sku: 'SW-002', barcode: '6291041008', price: 38.0, category: 'sandwiches', stock: 14, icon: '🥯', color: '#059669' },
  { id: 'p16', name: 'Halloumi & Zaatar Toast', sku: 'SW-003', barcode: '6291041019', price: 26.0, category: 'sandwiches', stock: 20, icon: '🫓', color: '#10b981' },
  { id: 'p17', name: 'Smoked Turkey & Emmental', sku: 'SW-004', barcode: '6291041020', price: 32.0, category: 'sandwiches', stock: 16, icon: '🥪', color: '#047857' },
  { id: 'p18', name: 'Avocado Deluxe Toast', sku: 'SW-005', barcode: '6291041021', price: 31.0, category: 'sandwiches', stock: 22, icon: '🥑', color: '#059669' },
  { id: 'p19', name: 'Roast Beef & Truffle Ciabatta', sku: 'SW-006', barcode: '6291041022', price: 42.0, category: 'sandwiches', stock: 11, icon: '🥩', color: '#0f766e' },

  // Desserts & Sweets (Berry rose/violet palette)
  { id: 'p9', name: 'San Sebastian Cheesecake', sku: 'DS-001', barcode: '6291041009', price: 32.0, category: 'desserts', stock: 22, icon: '🍰', color: '#ec4899' },
  { id: 'p10', name: 'Pistachio Kunafa Cup', sku: 'DS-002', barcode: '6291041010', price: 29.0, category: 'desserts', stock: 19, icon: '🍮', color: '#d946ef' },
  { id: 'p12', name: 'Acai Superfood Bowl', sku: 'DS-003', barcode: '6291041012', price: 36.0, category: 'desserts', stock: 16, icon: '🫐', color: '#a855f7' },
  { id: 'p20', name: 'Date & Cardamom Pudding', sku: 'DS-004', barcode: '6291041023', price: 28.0, category: 'desserts', stock: 17, icon: '🍮', color: '#c026d3' },
  { id: 'p21', name: 'Belgian Dark Chocolate Fondant', sku: 'DS-005', barcode: '6291041024', price: 35.0, category: 'desserts', stock: 15, icon: '🍫', color: '#e11d48' },
  { id: 'p22', name: 'Saffron Tres Leches Cake', sku: 'DS-006', barcode: '6291041025', price: 30.0, category: 'desserts', stock: 20, icon: '🍰', color: '#f43f5e' },
];

function getCategoryIcon(codeOrName: string): string {
  const lower = codeOrName.toLowerCase();
  if (lower.includes('coffee') || lower.includes('drink') || lower.includes('beverage')) return 'pi pi-coffee';
  if (lower.includes('bake') || lower.includes('pastry') || lower.includes('bread')) return 'pi pi-sun';
  if (lower.includes('sandwich') || lower.includes('savoury') || lower.includes('meal')) return 'pi pi-align-justify';
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('cake')) return 'pi pi-heart';
  return 'pi pi-th-large';
}

function getCategoryColor(codeOrName: string): string {
  const lower = codeOrName.toLowerCase();
  if (lower.includes('coffee') || lower.includes('drink') || lower.includes('beverage')) return '#3b82f6';
  if (lower.includes('bake') || lower.includes('pastry')) return '#f59e0b';
  if (lower.includes('sandwich') || lower.includes('savoury') || lower.includes('meal')) return '#10b981';
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
  return '📦';
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
  ],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
})
export class PosComponent implements OnInit {
  private readonly productRepo = inject(ProductRepository);
  private readonly categoryRepo = inject(CategoryRepository);
  private readonly orderRepo = inject(OrderRepository);
  readonly layout = inject(LayoutService);

  readonly isCloudConnected = signal<boolean>(false);
  readonly isLoadingCatalog = signal<boolean>(false);

  selectedCategory = signal<string>('all');
  searchQuery = signal<string>('');
  cart = signal<CartItem[]>([]);
  orderDiscount = signal<number>(0);
  
  // Checkout Modal State
  isPaymentModalOpen = signal<boolean>(false);
  paymentMethod = signal<'cash' | 'card' | 'split'>('card');
  amountTendered = signal<number>(0);
  isSuccessModalOpen = signal<boolean>(false);
  lastInvoice = signal<any>(null);

  private _categories = signal<CategoryTab[]>(DEFAULT_CATEGORIES);
  private _products = signal<CatalogProduct[]>(DEFAULT_PRODUCTS);

  get categories(): CategoryTab[] {
    return this._categories();
  }

  get products(): CatalogProduct[] {
    return this._products();
  }

  async ngOnInit() {
    await this.loadSupabaseCatalog();
  }

  async loadSupabaseCatalog() {
    this.isLoadingCatalog.set(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        this.productRepo.getProductsWithInventory().catch(() => []),
        this.categoryRepo.getCategories().catch(() => []),
      ]);

      if (categoriesData && categoriesData.length > 0) {
        const catTabs: CategoryTab[] = [
          { id: 'all', name: 'All Items', icon: 'pi pi-th-large' },
          ...categoriesData.map((c) => ({
            id: c.description || c.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: c.name,
            icon: getCategoryIcon(c.name),
          })),
        ];
        this._categories.set(catTabs);
      }

      if (productsData && productsData.length > 0) {
        const mappedProducts: CatalogProduct[] = productsData.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || '',
          price: Number(p.selling_price),
          category: p.category_code || 'coffee',
          stock: p.quantity_on_hand != null ? Number(p.quantity_on_hand) : 25,
          icon: getProductIcon(p.name, p.category_code || ''),
          color: getCategoryColor(p.category_code || ''),
        }));
        this._products.set(mappedProducts);
        this.isCloudConnected.set(true);
      }
    } catch (err) {
      console.warn('Supabase catalog loading deferred, using local fallback:', err);
    } finally {
      this.isLoadingCatalog.set(false);
    }
  }

  filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();
    return this._products().filter((p) => {
      const matchCat = cat === 'all' || p.category === cat || (p.category && cat.includes(p.category)) || (cat && p.category.includes(cat));
      const matchQuery = !query || p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query) || (p.barcode && p.barcode.includes(query));
      return matchCat && matchQuery;
    });
  });

  cartCalculations = computed(() => {
    const itemsInput: CartItemCalculationInput[] = this.cart().map(item => ({
      unitPrice: item.product.price,
      quantity: item.quantity,
      discountAmount: item.discount,
      taxRate: 0.05, // 5% UAE VAT
    }));

    return calculateCartTotals(itemsInput, this.orderDiscount());
  });

  changeDue = computed(() => {
    const tendered = this.amountTendered();
    const total = this.cartCalculations().grandTotal;
    return tendered > total ? Math.round((tendered - total) * 100) / 100 : 0;
  });

  addToCart(product: BaseProductCardInput | CatalogProduct) {
    const fullProduct = this.products.find(p => String(p.id) === String(product.id)) || (product as CatalogProduct);
    const current = this.cart();
    const existingIndex = current.findIndex(item => String(item.product.id) === String(fullProduct.id));

    if (existingIndex > -1) {
      const updated = [...current];
      updated[existingIndex].quantity += 1;
      this.cart.set(updated);
    } else {
      this.cart.set([...current, { product: fullProduct, quantity: 1, discount: 0 }]);
    }
  }

  incrementQuantity(item: CartItem) {
    const updated = this.cart().map(ci => {
      if (ci.product.id === item.product.id) {
        return { ...ci, quantity: ci.quantity + 1 };
      }
      return ci;
    });
    this.cart.set(updated);
  }

  decrementQuantity(item: CartItem) {
    if (item.quantity > 1) {
      const updated = this.cart().map(ci => {
        if (ci.product.id === item.product.id) {
          return { ...ci, quantity: ci.quantity - 1 };
        }
        return ci;
      });
      this.cart.set(updated);
    } else {
      this.removeFromCart(item);
    }
  }

  removeFromCart(item: CartItem) {
    this.cart.set(this.cart().filter(ci => ci.product.id !== item.product.id));
  }

  clearCart() {
    this.cart.set([]);
    this.orderDiscount.set(0);
  }

  getCartQuantity(productId: string | number): number {
    const item = this.cart().find((ci) => String(ci.product.id) === String(productId));
    return item ? item.quantity : 0;
  }

  openPaymentModal() {
    if (this.cart().length === 0) return;
    this.amountTendered.set(this.cartCalculations().grandTotal);
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal() {
    this.isPaymentModalOpen.set(false);
  }

  confirmSale() {
    const calcs = this.cartCalculations();
    const invoiceNum = 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
    
    this.lastInvoice.set({
      invoiceNumber: invoiceNum,
      date: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }),
      items: [...this.cart()],
      subtotal: calcs.subtotal,
      vat: calcs.taxTotal,
      discount: calcs.discountTotal,
      grandTotal: calcs.grandTotal,
      tendered: this.amountTendered(),
      change: this.changeDue(),
      method: this.paymentMethod().toUpperCase(),
      trn: '100234892300003',
    });

    // Record sale in Supabase if cloud is connected
    if (this.isCloudConnected()) {
      this.orderRepo.completeSale({
        store_id: 's0000000-0000-0000-0000-000000000001',
        items: this.cart().map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          discount_amount: item.discount,
        })),
        payments: [{
          method: this.paymentMethod() === 'card' ? 'card' : 'cash',
          amount: calcs.grandTotal,
        }],
      }).catch((err) => {
        console.warn('Supabase sale record deferred:', err);
      });
    }

    this.isPaymentModalOpen.set(false);
    this.isSuccessModalOpen.set(true);
    this.clearCart();
  }

  closeSuccessModal() {
    this.isSuccessModalOpen.set(false);
  }

  printReceipt() {
    window.print();
  }
}
