import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryListComponent } from './category-list.component';
import { CategoryRepository } from '../../data-access/repositories/category.repository';
import { AppContext } from '../../core/context/app-context.service';

const BUSINESS_ID = 'b0000000-0000-0000-0000-000000000001';

interface StatsRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  business_id: string;
  product_count: number;
  active_product_count: number;
}

function row(id: string, name: string, productCount: number, activeCount: number): StatsRow {
  return {
    id,
    name,
    description: `desc-${id}`,
    created_at: '2026-10-01T04:00:00Z',
    updated_at: '2026-10-01T04:00:00Z',
    business_id: BUSINESS_ID,
    product_count: productCount,
    active_product_count: activeCount,
  };
}

describe('CategoryListComponent', () => {
  let fixture: ComponentFixture<CategoryListComponent>;
  let component: CategoryListComponent;

  const mockCategoryRepo = {
    getCategoriesWithStats: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  };

  const contextStub = {
    isConfigured: computed(() => true),
    businessId: computed(() => BUSINESS_ID),
    businessName: computed(() => 'Aero POS Test Business'),
  };

  beforeEach(async () => {
    mockCategoryRepo.getCategoriesWithStats.mockReset();
    mockCategoryRepo.createCategory.mockReset();
    mockCategoryRepo.updateCategory.mockReset();
    mockCategoryRepo.deleteCategory.mockReset();

    mockCategoryRepo.getCategoriesWithStats.mockResolvedValue({
      categories: [row('c1', 'Coffee & Drinks', 6, 4), row('c2', 'Bakery & Pastry', 0, 0)],
      scannedProducts: 24,
      countsTruncated: false,
    });
    mockCategoryRepo.createCategory.mockImplementation(async (payload: any) => ({
      id: 'c-new',
      ...payload,
    }));
    mockCategoryRepo.updateCategory.mockResolvedValue(undefined);
    mockCategoryRepo.deleteCategory.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [CategoryListComponent],
      providers: [
        { provide: CategoryRepository, useValue: mockCategoryRepo },
        { provide: AppContext, useValue: contextStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryListComponent);
    component = fixture.componentInstance;
    await component.loadCategories();
    fixture.detectChanges();
  });

  it('renders categories with real catalog counters instead of a placeholder six', async () => {
    expect(component).toBeTruthy();
    expect(mockCategoryRepo.getCategoriesWithStats).toHaveBeenCalledWith(BUSINESS_ID);
    expect(component.categories().length).toBe(2);
    expect(component.categories()[0].productCount).toBe(6);
    expect(component.categories()[0].activeProductCount).toBe(4);
    expect(component.totalRecords()).toBe(component.categories().length);
  });

  it('derives register visibility from active products, not a fake is_active column', () => {
    const [coffee, bakery] = component.categories();
    expect(coffee.activeProductCount).toBeGreaterThan(0);
    expect(bakery.activeProductCount).toBe(0);
  });

  it('keeps the badge theme stable for the same category id', () => {
    const first = component.categories()[0];
    component.categories.set([]);
    return component.loadCategories().then(() => {
      expect(component.categories()[0].color).toBe(first.color);
      expect(component.categories()[0].icon).toBe(first.icon);
    });
  });

  it('surfaces load failures as an error state instead of silently rendering nothing', async () => {
    mockCategoryRepo.getCategoriesWithStats.mockRejectedValueOnce(
      new Error('Failed to fetch categories: permission denied'),
    );

    await component.loadCategories();

    expect(component.listState.status()).toBe('error');
    expect(component.listState.error()).toContain('permission');
    expect(component.categories()).toEqual([]);
  });

  it('reports an empty state when the business genuinely has no categories', async () => {
    mockCategoryRepo.getCategoriesWithStats.mockResolvedValueOnce({
      categories: [],
      scannedProducts: 0,
      countsTruncated: false,
    });

    await component.loadCategories();

    expect(component.listState.status()).toBe('empty');
  });

  it('filters by name, slug or description and clears again', () => {
    component.onSearch('coffee');
    expect(component.filteredCategories().length).toBe(1);
    expect(component.isFiltered()).toBe(true);

    component.clearFilters();
    expect(component.filteredCategories().length).toBe(2);
    expect(component.isFiltered()).toBe(false);
  });

  it('persists a new category through the repository with the active business id', async () => {
    const initialCount = component.categories().length;
    component.openAddModal();
    component.categoryForm.patchValue({
      name: 'Fresh Juices & Smoothies',
      color: '#10b981',
      icon: 'pi pi-apple',
      description: 'Cold-pressed seasonal juices',
    });

    await component.saveCategory();

    expect(mockCategoryRepo.createCategory).toHaveBeenCalledWith({
      business_id: BUSINESS_ID,
      name: 'Fresh Juices & Smoothies',
      description: 'Cold-pressed seasonal juices',
    });
    expect(component.isAddModalOpen()).toBe(false);
    expect(component.categories().length).toBe(initialCount);
    expect(mockCategoryRepo.getCategoriesWithStats).toHaveBeenCalledTimes(2);
  });

  it('keeps the modal open and reports the reason when saving fails', async () => {
    mockCategoryRepo.createCategory.mockRejectedValueOnce(
      new Error('Failed to create category: duplicate key value'),
    );
    component.openAddModal();
    component.categoryForm.patchValue({ name: 'Beans', description: '' });

    await component.saveCategory();

    expect(component.isAddModalOpen()).toBe(true);
    expect(component.formError()).toContain('duplicate key');
  });

  it('updates an existing category in place', async () => {
    const target = component.categories()[0];
    component.openAddModal(target);
    component.categoryForm.patchValue({ name: 'Coffee & Cold Brew' });

    await component.saveCategory();

    expect(mockCategoryRepo.updateCategory).toHaveBeenCalledWith(target.id, {
      name: 'Coffee & Cold Brew',
      description: target.description,
    });
  });

  it('only deletes after confirmation and explains the un-link consequence', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const target = component.categories()[0];

    await component.deleteCategory(target);
    expect(mockCategoryRepo.deleteCategory).not.toHaveBeenCalled();
    expect(confirmSpy.mock.calls[0][0]).toContain('lose their category grouping');

    confirmSpy.mockReturnValue(true);
    await component.deleteCategory(target);
    expect(mockCategoryRepo.deleteCategory).toHaveBeenCalledWith(target.id);
    confirmSpy.mockRestore();
  });
});
