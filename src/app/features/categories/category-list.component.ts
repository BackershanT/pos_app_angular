import { Component, computed, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { DataStateComponent } from '../../shared/components/data-state/data-state.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { CategoryRepository } from '../../data-access/repositories/category.repository';
import { AppContext } from '../../core/context/app-context.service';
import { NotificationService } from '../../core/services/notification.service';
import { StorageService } from '../../core/services/storage.service';
import { describeError, LoadState } from '../../shared/utils/load-state.util';

/**
 * `categories` only stores business_id, name and description. Everything else on
 * a card is either derived from the catalog (counts, slug) or a terminal-local
 * display preference (badge colour/icon) - the schema has no column for it, so
 * the UI must never claim it is saved to the shared master data.
 */
export interface CategoryItem {
  id: string;
  name: string;
  /** Read-only slug derived from the name (search affordance, not a column). */
  code: string;
  icon: string;
  color: string;
  description: string;
  /** Real SKUs attached to this category. */
  productCount: number;
  /** Subset sellable on the register right now. */
  activeProductCount: number;
  createdAt: string;
}

interface CategoryTheme {
  color: string;
  icon: string;
}

/** Device-local badge styling overrides, keyed by category id. */
type ThemeMap = Record<string, CategoryTheme>;

const THEME_STORAGE_KEY = 'aeropos.category-theme';

/** Deterministic palette index so a category keeps its colour across reloads. */
function hashToIndex(value: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'category'
  );
}

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    DataStateComponent,
    SearchInputComponent,
  ],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css',
})
export class CategoryListComponent {
  private readonly categoryRepo = inject(CategoryRepository);
  private readonly notification = inject(NotificationService);
  private readonly storage = inject(StorageService);
  readonly context = inject(AppContext);

  /** Business id captured for the last successful load attempt (reload on switch). */
  private loadedBusinessId: string | null = null;

  readonly listState = new LoadState();

  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(8);
  isAddModalOpen = signal<boolean>(false);
  editingCategory = signal<CategoryItem | null>(null);

  readonly isSaving = signal<boolean>(false);
  readonly isRetiring = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  /** Products inspected while building counters - drives truncation disclosure. */
  readonly scannedProducts = signal<number>(0);
  readonly countsTruncated = signal<boolean>(false);

  categories = signal<CategoryItem[]>([]);

  // Palette choices for the terminal-local badge theme.
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

  // PrimeIcon choices for the terminal-local badge theme.
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

  categoryForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    icon: new FormControl('pi pi-box', [Validators.required]),
    color: new FormControl('#3b82f6', [Validators.required]),
    description: new FormControl(''),
  });

  /**
   * Single load trigger: runs for the initial business and again whenever the
   * operator switches tenant. A separate ngOnInit hook would double every read.
   */
  constructor() {
    effect(() => {
      const businessId = this.context.businessId();
      if (this.loadedBusinessId === businessId) return;
      void this.loadCategories();
    });
  }

  /**
   * Loads real master data with explicit lifecycle. A failure stays an error
   * state with a retry button - it never falls back to placeholder categories.
   */
  async loadCategories(options: { silent?: boolean } = {}) {
    if (!this.context.isConfigured()) {
      this.listState.fail('No business is linked to this session, so categories cannot be loaded.');
      return;
    }

    const businessId = this.context.businessId();
    if (!options.silent) {
      this.loadedBusinessId = businessId;
    }

    await this.listState.run(
      async () => {
        const result = await this.categoryRepo.getCategoriesWithStats(businessId);
        const themes = this.readThemes();

        this.categories.set(
          result.categories.map((c) => ({
            id: c.id,
            name: c.name,
            code: slugify(c.name),
            description: c.description ?? '',
            productCount: c.product_count,
            activeProductCount: c.active_product_count,
            createdAt: c.created_at,
            ...this.resolveTheme(c, themes),
          })),
        );
        this.scannedProducts.set(result.scannedProducts);
        this.countsTruncated.set(result.countsTruncated);

        if (result.countsTruncated) {
          this.notification.warning(
            `Linked-product counts only cover the first ${result.scannedProducts} SKUs of this business.`,
            'Counts truncated',
          );
        }

        return result.categories.length > 0;
      },
      { ...options, emptyReason: 'no_data' },
    ).then((result) => {
      // A failed first/explicit load must not leave yesterday's rows on screen;
      // a failed background refresh keeps them so the register stays usable.
      if (!result.ok && !options.silent) {
        this.categories.set([]);
        this.countsTruncated.set(false);
        this.scannedProducts.set(0);
      }
    });
  }

  async retryLoad() {
    await this.loadCategories();
  }

  /** Badge colour/icon are not columns; fall back to a stable hash of the id. */
  private resolveTheme(
    category: { id: string; name: string },
    themes: ThemeMap,
  ): CategoryTheme {
    const override = themes[category.id];
    if (override) {
      return {
        color: this.colorPalette.includes(override.color) ? override.color : this.colorPalette[0],
        icon: this.iconChoices.includes(override.icon) ? override.icon : 'pi pi-box',
      };
    }
    return {
      color: this.colorPalette[hashToIndex(category.id, this.colorPalette.length)],
      icon: this.iconChoices[hashToIndex(`${category.id}:${category.name}`, this.iconChoices.length)],
    };
  }

  private readThemes(): ThemeMap {
    return this.storage.getItem<ThemeMap>(THEME_STORAGE_KEY, {}) ?? {};
  }

  filteredCategories = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.categories();
    return this.categories().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  });

  isFiltered = computed(() => this.searchQuery().trim().length > 0);

  totalRecords = computed(() => this.filteredCategories().length);

  paginatedCategories = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCategories().slice(start, start + this.pageSize());
  });

  /** Roll-up of what the operator actually manages on this screen. */
  summary = computed(() => {
    const list = this.categories();
    return {
      categories: list.length,
      linked: list.reduce((sum, c) => sum + c.productCount, 0),
      sellable: list.reduce((sum, c) => sum + c.activeProductCount, 0),
      uncategorized: list.filter((c) => c.activeProductCount === 0).length,
    };
  });

  openAddModal(cat?: CategoryItem) {
    this.formError.set(null);
    if (cat) {
      this.editingCategory.set(cat);
      this.categoryForm.patchValue({
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        description: cat.description,
      });
    } else {
      this.editingCategory.set(null);
      this.categoryForm.reset({
        name: '',
        icon: 'pi pi-box',
        color: '#3b82f6',
        description: '',
      });
    }
    this.isAddModalOpen.set(true);
  }

  closeModal() {
    this.isAddModalOpen.set(false);
    this.editingCategory.set(null);
    this.formError.set(null);
  }

  /**
   * Persists name/description to the shared master data and the badge theme to
   * this terminal. Reloads afterwards so the grid always reflects the database.
   */
  async saveCategory() {
    if (this.categoryForm.invalid || this.isSaving()) return;

    const val = this.categoryForm.value;
    const existing = this.editingCategory();
    const name = (val.name ?? '').trim();
    const description = (val.description ?? '').trim();

    if (!this.context.isConfigured()) {
      this.formError.set('No business is linked to this session, so nothing can be saved.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    try {
      if (existing) {
        await this.categoryRepo.updateCategory(existing.id, { name, description });
        this.persistTheme(existing.id, val.color!, val.icon!);
      } else {
        const created = await this.categoryRepo.createCategory({
          business_id: this.context.businessId(),
          name,
          description: description || null,
        });
        this.persistTheme(created.id, val.color!, val.icon!);
      }

      await this.loadCategories({ silent: true });

      this.notification.success(
        existing ? `Category "${name}" updated` : `Category "${name}" created`,
        existing ? 'Saved' : 'Category Created',
      );
      this.closeModal();
    } catch (err) {
      const message = describeError(err);
      this.formError.set(message);
      this.notification.error(message, existing ? 'Update failed' : 'Create failed');
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Badge styling lives on this terminal only - the schema has no column for it. */
  private persistTheme(id: string, color: string, icon: string) {
    const themes = this.readThemes();
    themes[id] = { color, icon };
    this.storage.setItem<ThemeMap>(THEME_STORAGE_KEY, themes);
  }

  async toggleVisibility(cat: CategoryItem) {
    // No `is_active` column exists: sellability is a property of the products,
    // so the honest affordance is a deep link to the catalog filtered by category.
    this.notification.info(
      cat.activeProductCount > 0
        ? `"${cat.name}" is on the register because ${cat.activeProductCount} active SKU(s) use it. Archive those products in the catalog to hide the tab.`
        : `"${cat.name}" has no active products, so it does not appear on the register yet. Add products in the catalog to publish it.`,
      'Register visibility',
    );
  }

  async deleteCategory(cat: CategoryItem) {
    const consequence =
      cat.productCount > 0
        ? `The ${cat.productCount} linked product(s) will stay in the catalog but lose their category grouping.`
        : 'No products are linked to this category.';

    if (!confirm(`Delete category "${cat.name}"? ${consequence} This cannot be undone.`)) {
      return;
    }

    this.isRetiring.set(true);
    try {
      await this.categoryRepo.deleteCategory(cat.id);
      this.dropTheme(cat.id);
      await this.loadCategories({ silent: true });
      this.notification.success(`Category "${cat.name}" deleted`, 'Removed');
    } catch (err) {
      this.notification.error(describeError(err), 'Delete failed');
    } finally {
      this.isRetiring.set(false);
    }
  }

  private dropTheme(id: string) {
    const themes = this.readThemes();
    delete themes[id];
    this.storage.setItem<ThemeMap>(THEME_STORAGE_KEY, themes);
  }

  onSearch(value: string) {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }
}
