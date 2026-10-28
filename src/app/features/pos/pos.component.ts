import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { calculateCartTotals, CartItemCalculationInput } from '../../shared/utils/calculation.utils';
import { AutoFocusDirective } from '../../shared/directives/auto-focus.directive';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { LayoutService } from '../../core/services/layout.service';
import { inject } from '@angular/core';

import { ProductCardComponent, BaseProductCardInput } from '../../shared/components/product-card/product-card.component';

interface CatalogProduct {
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

interface CartItem {
  product: CatalogProduct;
  quantity: number;
  discount: number;
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
export class PosComponent {
  readonly layout = inject(LayoutService);

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

  categories = [
    { id: 'all', name: 'All Items', icon: 'pi pi-th-large' },
    { id: 'coffee', name: 'Coffee & Drinks', icon: 'pi pi-coffee' },
    { id: 'bakery', name: 'Bakery & Pastry', icon: 'pi pi-sun' },
    { id: 'sandwiches', name: 'Sandwiches', icon: 'pi pi-align-justify' },
    { id: 'desserts', name: 'Desserts', icon: 'pi pi-heart' },
  ];

  products: CatalogProduct[] = [
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

  filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();
    return this.products.filter(p => {
      const matchCat = cat === 'all' || p.category === cat;
      const matchQuery = !query || p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query) || p.barcode.includes(query);
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
