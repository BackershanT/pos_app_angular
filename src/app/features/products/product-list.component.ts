import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

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
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent {
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isAddModalOpen = signal<boolean>(false);

  categories = ['all', 'Beverages', 'Bakery', 'Main Meals', 'Desserts'];

  products = signal<ProductItem[]>([
    { id: '1', name: 'Spanish Latte (Iced)', sku: 'CF-001', barcode: '6291041001', category: 'Beverages', costPrice: 8.5, sellingPrice: 24.0, taxRate: 0.05, stock: 45, isActive: true },
    { id: '2', name: 'Caramel Macchiato', sku: 'CF-002', barcode: '6291041002', category: 'Beverages', costPrice: 7.0, sellingPrice: 22.0, taxRate: 0.05, stock: 38, isActive: true },
    { id: '3', name: 'Matcha Green Tea', sku: 'CF-003', barcode: '6291041003', category: 'Beverages', costPrice: 9.0, sellingPrice: 26.0, taxRate: 0.05, stock: 29, isActive: true },
    { id: '4', name: 'Butter Croissant', sku: 'BK-001', barcode: '6291041004', category: 'Bakery', costPrice: 4.5, sellingPrice: 14.0, taxRate: 0.05, stock: 20, isActive: true },
    { id: '5', name: 'Chocolate Pain Au', sku: 'BK-002', barcode: '6291041005', category: 'Bakery', costPrice: 5.5, sellingPrice: 16.0, taxRate: 0.05, stock: 15, isActive: true },
    { id: '6', name: 'Artisan Sourdough', sku: 'BK-003', barcode: '6291041006', category: 'Bakery', costPrice: 9.0, sellingPrice: 28.0, taxRate: 0.05, stock: 12, isActive: true },
    { id: '7', name: 'Truffle Chicken Panini', sku: 'SW-001', barcode: '6291041007', category: 'Main Meals', costPrice: 14.0, sellingPrice: 34.0, taxRate: 0.05, stock: 18, isActive: true },
    { id: '8', name: 'Smoked Salmon Bagel', sku: 'SW-002', barcode: '6291041008', category: 'Main Meals', costPrice: 16.5, sellingPrice: 38.0, taxRate: 0.05, stock: 14, isActive: true },
    { id: '9', name: 'San Sebastian Cheesecake', sku: 'DS-001', barcode: '6291041009', category: 'Desserts', costPrice: 11.0, sellingPrice: 32.0, taxRate: 0.05, stock: 22, isActive: true },
    { id: '10', name: 'Pistachio Kunafa Cup', sku: 'DS-002', barcode: '6291041010', category: 'Desserts', costPrice: 10.0, sellingPrice: 29.0, taxRate: 0.05, stock: 19, isActive: true },
    { id: '11', name: 'Cold Brew Reserve', sku: 'CF-004', barcode: '6291041011', category: 'Beverages', costPrice: 8.0, sellingPrice: 25.0, taxRate: 0.05, stock: 30, isActive: true },
    { id: '12', name: 'Acai Superfood Bowl', sku: 'DS-003', barcode: '6291041012', category: 'Desserts', costPrice: 12.0, sellingPrice: 36.0, taxRate: 0.05, stock: 16, isActive: true },
    { id: '13', name: 'Avocado Toast Deluxe', sku: 'SW-003', barcode: '6291041013', category: 'Main Meals', costPrice: 12.5, sellingPrice: 31.0, taxRate: 0.05, stock: 25, isActive: true },
    { id: '14', name: 'Cardamom Karak Tea', sku: 'CF-005', barcode: '6291041014', category: 'Beverages', costPrice: 3.0, sellingPrice: 12.0, taxRate: 0.05, stock: 50, isActive: true },
  ]);

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

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
  }

  onCategorySelect(category: string) {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
  }

  openAddModal() {
    this.productForm.reset({
      category: 'Beverages',
      costPrice: 10,
      sellingPrice: 25,
      stock: 20,
    });
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  saveProduct() {
    if (this.productForm.invalid) return;

    const val = this.productForm.value;
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
    this.closeAddModal();
  }
}
