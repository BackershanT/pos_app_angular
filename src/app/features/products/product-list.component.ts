import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ProductRepository } from '../../data-access/repositories/product.repository';

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  stock: number;
  isActive: boolean;
  icon?: string;
  color?: string;
}

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
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent implements OnInit {
  private readonly productRepo = inject(ProductRepository);

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isAddModalOpen = signal<boolean>(false);
  editingProduct = signal<ProductItem | null>(null);
  viewMode = signal<'grid' | 'table'>('grid');
  readonly isCloudConnected = signal<boolean>(false);

  categories = ['all', 'Beverages', 'Bakery', 'Main Meals', 'Desserts'];


  async ngOnInit() {
    await this.loadProductsFromSupabase();
  }

  async loadProductsFromSupabase() {
    try {
      const data = await this.productRepo.getProductsWithInventory();
      if (data && data.length > 0) {
        const mapped: ProductItem[] = data.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || '',
          category: p.category_name || 'Beverages',
          costPrice: Number(p.cost_price || 0),
          sellingPrice: Number(p.selling_price || 0),
          taxRate: Number(p.tax_rate || 0.05),
          stock: p.quantity_on_hand != null ? Number(p.quantity_on_hand) : 25,
          isActive: p.is_active ?? true,
        }));
        this.products.set(mapped);
        this.isCloudConnected.set(true);
      }
    } catch (err) {
      console.warn('Supabase product catalog deferred:', err);
    }
  }

  products = signal<ProductItem[]>([]);

  productForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    sku: new FormControl('', [Validators.required]),
    barcode: new FormControl('', [Validators.required]),
    category: new FormControl('Beverages', [Validators.required]),
    costPrice: new FormControl(10, [Validators.required, Validators.min(0)]),
    sellingPrice: new FormControl(25, [Validators.required, Validators.min(0.01)]),
    stock: new FormControl(20, [Validators.required, Validators.min(0)]),
  });

  filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    return this.products().filter((p) => {
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      const matchCat = cat === 'all' || p.category === cat;
      return matchQ && matchCat;
    });
  });

  totalFilteredRecords = computed(() => this.filteredProducts().length);

  paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredProducts().slice(start, start + this.pageSize());
  });

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onCategorySelect(category: string) {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
  }

  setViewMode(mode: 'grid' | 'table') {
    this.viewMode.set(mode);
  }

  openAddModal() {
    this.editingProduct.set(null);
    this.productForm.reset({
      category: 'Beverages',
      costPrice: 10,
      sellingPrice: 25,
      stock: 20,
    });
    this.isAddModalOpen.set(true);
  }

  openEditModal(item: any) {
    const product = this.products().find((p) => String(p.id) === String(item.id)) || (item as ProductItem);
    this.editingProduct.set(product);
    this.productForm.setValue({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
    });
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
    this.editingProduct.set(null);
  }

  saveProduct() {
    if (this.productForm.invalid) return;

    const val = this.productForm.value;
    const editing = this.editingProduct();

    if (editing) {
      this.products.update((current) =>
        current.map((p) =>
          p.id === editing.id
            ? {
                ...p,
                name: val.name!,
                sku: val.sku!,
                barcode: val.barcode!,
                category: val.category!,
                costPrice: Number(val.costPrice),
                sellingPrice: Number(val.sellingPrice),
                stock: Number(val.stock),
              }
            : p
        )
      );
    } else {
      const newProduct: ProductItem = {
        id: String(Date.now()),
        name: val.name!,
        sku: val.sku!,
        barcode: val.barcode!,
        category: val.category!,
        costPrice: Number(val.costPrice),
        sellingPrice: Number(val.sellingPrice),
        taxRate: 0.05,
        stock: Number(val.stock),
        isActive: true,
      };
      this.products.update((current) => [newProduct, ...current]);
    }

    this.closeAddModal();
  }
}
