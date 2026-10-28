import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { TruncatePipe } from '../../pipes/truncate.pipe';

export type ProductCardMode = 'pos' | 'catalog' | 'compact';

export interface BaseProductCardInput {
  id: string | number;
  name: string;
  sku?: string;
  barcode?: string;
  price?: number;
  sellingPrice?: number;
  costPrice?: number;
  category?: string;
  stock?: number;
  quantity_on_hand?: number;
  icon?: string;
  color?: string;
  imageUrl?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe, TruncatePipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  /** The product data object */
  readonly product = input.required<BaseProductCardInput>();

  /** Display mode: 'pos' (quick add to cart), 'catalog' (management view), 'compact' */
  readonly mode = input<ProductCardMode>('pos');

  /** Whether to show the stock status badge */
  readonly showStock = input<boolean>(true);

  /** Whether to show the category pill */
  readonly showCategory = input<boolean>(false);

  /** Whether to show the barcode */
  readonly showBarcode = input<boolean>(false);

  /** Whether the card is disabled from interactions */
  readonly disabled = input<boolean>(false);

  /** Emits when the card is clicked or activated */
  readonly selected = output<BaseProductCardInput>();

  /** Emits when the action button (add/edit) is clicked */
  readonly actionClick = output<BaseProductCardInput>();

  // Normalized computed properties
  readonly name = computed(() => this.product().name || 'Unnamed Product');
  readonly sku = computed(() => this.product().sku || '');
  readonly barcode = computed(() => this.product().barcode || '');
  readonly category = computed(() => this.product().category || '');

  readonly price = computed(() => {
    const p = this.product();
    return p.price ?? p.sellingPrice ?? 0;
  });

  readonly stock = computed(() => {
    const p = this.product();
    return p.stock ?? p.quantity_on_hand ?? 0;
  });

  readonly isOutOfStock = computed(() => this.stock() <= 0);
  readonly isLowStock = computed(() => this.stock() > 0 && this.stock() < 15);

  readonly color = computed(() => {
    const p = this.product();
    if (p.color) return p.color;
    // Default palette fallback based on category
    const cat = (p.category || '').toLowerCase();
    if (cat.includes('coffee') || cat.includes('beverage')) return '#3b82f6';
    if (cat.includes('bakery') || cat.includes('pastry')) return '#f59e0b';
    if (cat.includes('sand') || cat.includes('meal')) return '#10b981';
    if (cat.includes('dessert') || cat.includes('sweet')) return '#ec4899';
    return '#8b5cf6';
  });

  readonly icon = computed(() => {
    const p = this.product();
    if (p.icon) return p.icon;
    const cat = (p.category || '').toLowerCase();
    if (cat.includes('coffee') || cat.includes('beverage')) return '☕';
    if (cat.includes('bakery') || cat.includes('pastry')) return '🥐';
    if (cat.includes('sand') || cat.includes('meal')) return '🥪';
    if (cat.includes('dessert') || cat.includes('sweet')) return '🍰';
    return '📦';
  });

  onCardClick(): void {
    if (this.disabled() || this.isOutOfStock()) return;
    this.selected.emit(this.product());
  }

  onActionButtonClick(event: Event): void {
    event.stopPropagation();
    if (this.disabled() || this.isOutOfStock()) return;
    this.actionClick.emit(this.product());
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onCardClick();
    }
  }
}
