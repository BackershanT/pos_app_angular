import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

export interface CategoryItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  color: string;
  description: string;
  productCount: number;
  isActive: boolean;
}

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css',
})
export class CategoryListComponent {
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(8);
  isAddModalOpen = signal<boolean>(false);
  editingCategory = signal<CategoryItem | null>(null);

  // Palette choices for categories
  readonly colorPalette = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#ef4444', // Red
    '#06b6d4', // Cyan
    '#f97316', // Orange
  ];

  // PrimeIcon choices
  readonly iconChoices = [
    'pi pi-shopping-bag',
    'pi pi-box',
    'pi pi-coffee',
    'pi pi-apple',
    'pi pi-star',
    'pi pi-tag',
    'pi pi-heart',
    'pi pi-th-large',
  ];

  // Category Database
  categories = signal<CategoryItem[]>([
    {
      id: 'cat-1',
      name: 'Coffee & Drinks',
      code: 'coffee',
      icon: 'pi pi-coffee',
      color: '#3b82f6',
      description: 'Single origin espresso, iced lattes, batch brew, and teas',
      productCount: 14,
      isActive: true,
    },
    {
      id: 'cat-2',
      name: 'Bakery & Pastry',
      code: 'bakery',
      icon: 'pi pi-shopping-bag',
      color: '#f59e0b',
      description: 'French butter croissants, chocolate babka, sourdough loaves',
      productCount: 9,
      isActive: true,
    },
    {
      id: 'cat-3',
      name: 'Sandwiches & Savory',
      code: 'sandwiches',
      icon: 'pi pi-box',
      color: '#10b981',
      description: 'Gourmet focaccia, turkey halloumi, and toasted brioche',
      productCount: 6,
      isActive: true,
    },
    {
      id: 'cat-4',
      name: 'Desserts & Sweets',
      code: 'desserts',
      icon: 'pi pi-star',
      color: '#ec4899',
      description: 'Basque cheesecake, tiramisu pots, pistachio tarts',
      productCount: 8,
      isActive: true,
    },
    {
      id: 'cat-5',
      name: 'Retail Beans & Mugs',
      code: 'retail',
      icon: 'pi pi-tag',
      color: '#8b5cf6',
      description: 'Packaged 250g coffee beans, drippers, thermal tumblers',
      productCount: 12,
      isActive: true,
    },
    {
      id: 'cat-6',
      name: 'Plant-Based & Dairy Free',
      code: 'plant-based',
      icon: 'pi pi-apple',
      color: '#06b6d4',
      description: 'Oat, almond, coconut milk alternatives, vegan energy bites',
      productCount: 5,
      isActive: true,
    },
  ]);

  categoryForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    code: new FormControl('', [Validators.required]),
    icon: new FormControl('pi pi-box', [Validators.required]),
    color: new FormControl('#3b82f6', [Validators.required]),
    description: new FormControl(''),
    isActive: new FormControl(true),
  });

  filteredCategories = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.categories().filter((c) => {
      return (
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  });

  totalRecords = computed(() => this.filteredCategories().length);

  paginatedCategories = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCategories().slice(start, start + this.pageSize());
  });

  openAddModal(cat?: CategoryItem) {
    if (cat) {
      this.editingCategory.set(cat);
      this.categoryForm.patchValue({
        name: cat.name,
        code: cat.code,
        icon: cat.icon,
        color: cat.color,
        description: cat.description,
        isActive: cat.isActive,
      });
    } else {
      this.editingCategory.set(null);
      this.categoryForm.reset({
        name: '',
        code: '',
        icon: 'pi pi-box',
        color: '#3b82f6',
        description: '',
        isActive: true,
      });
    }
    this.isAddModalOpen.set(true);
  }

  closeModal() {
    this.isAddModalOpen.set(false);
    this.editingCategory.set(null);
  }

  onNameChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    if (!this.editingCategory()) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      this.categoryForm.patchValue({ code: slug });
    }
  }

  saveCategory() {
    if (this.categoryForm.invalid) return;

    const val = this.categoryForm.value;
    const existing = this.editingCategory();

    if (existing) {
      this.categories.update((list) =>
        list.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                name: val.name!,
                code: val.code!,
                icon: val.icon!,
                color: val.color!,
                description: val.description || '',
                isActive: val.isActive ?? true,
              }
            : c
        )
      );
    } else {
      const newCat: CategoryItem = {
        id: `cat-${Date.now()}`,
        name: val.name!,
        code: val.code!,
        icon: val.icon!,
        color: val.color!,
        description: val.description || '',
        productCount: 0,
        isActive: val.isActive ?? true,
      };
      this.categories.update((list) => [newCat, ...list]);
    }

    this.closeModal();
  }

  toggleActive(cat: CategoryItem) {
    this.categories.update((list) =>
      list.map((c) => (c.id === cat.id ? { ...c, isActive: !c.isActive } : c))
    );
  }

  deleteCategory(cat: CategoryItem) {
    if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      this.categories.update((list) => list.filter((c) => c.id !== cat.id));
    }
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }
}
