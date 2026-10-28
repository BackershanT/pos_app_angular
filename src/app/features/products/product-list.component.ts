import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { DataStateComponent } from '../../shared/components/data-state/data-state.component';
import { ProductRepository } from '../../data-access/repositories/product.repository';
import { CategoryRepository } from '../../data-access/repositories/category.repository';
import { AppContext } from '../../core/context/app-context.service';
import { NotificationService } from '../../core/services/notification.service';
import { describeError, LoadState } from '../../shared/utils/load-state.util';
import { roundCurrency } from '../../shared/utils/calculation.utils';

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  /** products.tax_rate as stored (0.0500 = 5%, 0.0000 = zero-rated). */
  taxRate: number;
  /** null when this branch does not track the SKU - never a fake 0 or 25. */
  stock: number | null;
  reorderLevel: number | null;
  isActive: boolean;
  icon?: string;
  color?: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

const UNCATEGORIZED_ID = 'uncategorized';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    ProductCardComponent,
    SearchInputComponent,
    BadgeComponent,
    DataStateComponent,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent implements OnInit {
  private readonly productRepo = inject(ProductRepository);
  private readonly categoryRepo = inject(CategoryRepository);
  private readonly notification = inject(NotificationService);
  readonly context = inject(AppContext);

  readonly catalogState = new LoadState();

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isAddModalOpen = signal<boolean>(false);
  editingProduct = signal<ProductItem | null>(null);
  viewMode = signal<'grid' | 'table'>('grid');

  readonly isSaving = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  products = signal<ProductItem[]>([]);
  categories = signal<CategoryOption[]>([]);

  productForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    sku: new FormControl('', [Validators.required]),
    barcode: new FormControl(''),
    categoryId: new FormControl<string | null>(null),
    costPrice: new FormControl(0, [Validators.required, Validators.min(0)]),
    sellingPrice: new FormControl(0, [Validators.required, Validators.min(0)]),
    /** Entered as a percentage for the operator, stored as a rate. */
    taxPercent: new FormControl(5, [Validators.required, Validators.min(0), Validators.max(100)]),
    isActive: new FormControl(true, [Validators.required]),
  });

  async ngOnInit() {
    await Promise.all([this.loadCategories(), this.loadProducts()]);
  }

  async loadCategories() {
    try {
      const data = await this.categoryRepo.getCategories();
      this.categories.set(data.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      // The catalog can still render without filters, so this is non-blocking.
      this.notification.warning(describeError(err), 'Categories unavailable');
    }
  }

  /**
   * Loads the real branch catalog. Any failure stays visible as an error state -
   * the grid is never populated with placeholder SKUs.
   */
  async loadProducts() {
    if (!this.context.isConfigured()) {
      this.catalogState.fail('No store is linked to this session, so the catalog cannot be loaded.');
      return;
    }

    await this.catalogState.run(async () => {
      const catalog = await this.productRepo.getBranchCatalog(this.context.storeId(), {
        includeInactive: true,
      });

      this.products.set(catalog.products.map((p) => this.toProductItem(p, catalog.products.length)));

      if (catalog.truncated) {
        this.notification.warning(
          `More products exist than the first ${catalog.products.length} shown. Use search to locate the rest.`,
          'Catalog truncated',
        );
      }
      return catalog.products.length > 0;
    });
  }

  private toProductItem(
    p: {
      id: string;
      name: string;
      sku: string;
      barcode: string | null;
      category_id: string | null;
      category_name?: string;
      cost_price: number | string;
      selling_price: number | string;
      tax_rate: number | string | null;
      quantity_on_hand: number;
      reorder_level: number | null;
      inventory_tracked: boolean;
      is_active: boolean | null;
    },
    _pageSize: number,
  ): ProductItem {
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      categoryId: p.category_id || UNCATEGORIZED_ID,
      category: p.category_name || 'Uncategorized',
      costPrice: Number(p.cost_price ?? 0),
      sellingPrice: Number(p.selling_price ?? 0),
      taxRate: p.tax_rate == null ? this.context.vatRate() : Number(p.tax_rate),
      stock: p.inventory_tracked ? Number(p.quantity_on_hand) : null,
      reorderLevel: p.inventory_tracked ? (p.reorder_level == null ? null : Number(p.reorder_level)) : null,
      isActive: p.is_active ?? true,
    };
  }

  filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    return this.products().filter((p) => {
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));
      const matchCat = cat === 'all' || p.categoryId === cat;
      return matchQ && matchCat;
    });
  });

  totalFilteredRecords = computed(() => this.filteredProducts().length);

  paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredProducts().slice(start, start + this.pageSize());
  });

  /** True when the operator's filters hide rows - drives "no results" vs "no data" copy. */
  isFiltered = computed(
    () => this.searchQuery().trim().length > 0 || this.selectedCategory() !== 'all',
  );

  lowStockCount = computed(
    () =>
      this.products().filter(
        (p) => p.stock !== null && p.stock <= (p.reorderLevel ?? 0),
      ).length,
  );

  totalStockValue = computed(() =>
    roundCurrency(
      this.products().reduce(
        (sum, p) => sum + (p.stock ?? 0) * p.costPrice,
        0,
      ),
    ),
  );

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onCategorySelect(categoryId: string) {
    this.selectedCategory.set(categoryId);
    this.currentPage.set(1);
  }

  setViewMode(mode: 'grid' | 'table') {
    this.viewMode.set(mode);
  }

  vatAmountFor(item: ProductItem): number {
    return roundCurrency(item.sellingPrice * item.taxRate);
  }

  marginFor(item: ProductItem): number {
    if (item.sellingPrice <= 0) return 0;
    return Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100);
  }

  taxPercentFor(item: ProductItem): string {
    return (item.taxRate * 100).toFixed(2).replace(/\.?0+$/, '');
  }

  openAddModal() {
    this.editingProduct.set(null);
    this.formError.set(null);
    this.productForm.reset({
      name: '',
      sku: '',
      barcode: '',
      categoryId: this.categories()[0]?.id ?? null,
      costPrice: 0,
      sellingPrice: 0,
      taxPercent: Math.round(this.context.vatRate() * 10000) / 100,
      isActive: true,
    });
    this.isAddModalOpen.set(true);
  }

  openEditModal(item: ProductItem | { id: string | number }) {
    const product =
      this.products().find((p) => String(p.id) === String(item.id)) ?? (item as ProductItem);
    if (!product) return;

    this.editingProduct.set(product);
    this.formError.set(null);
    this.productForm.setValue({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId === UNCATEGORIZED_ID ? null : product.categoryId,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      taxPercent: Math.round(product.taxRate * 10000) / 100,
      isActive: product.isActive,
    });
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    if (this.isSaving()) return;
    this.isAddModalOpen.set(false);
    this.editingProduct.set(null);
    this.formError.set(null);
  }

  /**
   * Persists master data through the repository. Editing prices never touches the
   * on-hand balance - stock only moves through the audited inventory ledger.
   */
  async saveProduct(): Promise<void> {
    if (this.isSaving()) return;
    if (this.productForm.invalid) {
      this.formError.set('Complete the required fields before saving.');
      return;
    }
    if (!this.context.isConfigured()) {
      this.formError.set('This terminal has no valid business context, so products cannot be saved.');
      return;
    }

    const val = this.productForm.value;
    const editing = this.editingProduct();
    const taxRate = roundCurrency(Number(val.taxPercent ?? 0)) / 100;
    const barcode = (val.barcode || '').trim() || null;

    const payload = {
      name: (val.name || '').trim(),
      sku: (val.sku || '').trim(),
      barcode,
      category_id: val.categoryId || null,
      cost_price: Number(val.costPrice ?? 0),
      selling_price: Number(val.sellingPrice ?? 0),
      tax_rate: taxRate,
      is_active: val.isActive !== false,
    };

    this.isSaving.set(true);
    this.formError.set(null);

    try {
      if (editing) {
        await this.productRepo.updateProduct(editing.id, payload);
        this.notification.success(`${payload.name} updated.`, 'Product saved');
      } else {
        await this.productRepo.createProduct({
          ...payload,
          business_id: this.context.businessId(),
          unit: 'unit',
        } as any);
        this.notification.success(`${payload.name} added to the catalog.`, 'Product created');
      }

      this.isAddModalOpen.set(false);
      this.editingProduct.set(null);
      await this.loadProducts();
    } catch (err) {
      const message = describeError(err);
      this.formError.set(message);
      this.notification.error(message, 'Product could not be saved');
    } finally {
      this.isSaving.set(false);
    }
  }

  async toggleActive(item: ProductItem): Promise<void> {
    if (item.isActive) {
      try {
        await this.productRepo.deleteProduct(item.id);
        this.notification.success(`${item.name} archived.`, 'Product archived');
        await this.loadProducts();
      } catch (err) {
        this.notification.error(describeError(err), 'Archive failed');
      }
    } else {
      this.openEditModal(item);
    }
  }

  retryLoad(): void {
    void this.loadProducts();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.currentPage.set(1);
  }
}
