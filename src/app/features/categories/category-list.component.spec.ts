import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryListComponent } from './category-list.component';
import { CategoryRepository } from '../../data-access/repositories/category.repository';

describe('CategoryListComponent', () => {
  let fixture: ComponentFixture<CategoryListComponent>;
  let component: CategoryListComponent;

  const mockCategoryRepo = {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-1', name: 'Coffee & Drinks', description: 'coffee' },
      { id: 'cat-2', name: 'Bakery & Pastry', description: 'bakery' },
    ]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryListComponent],
      providers: [
        { provide: CategoryRepository, useValue: mockCategoryRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryListComponent);
    component = fixture.componentInstance;
    await component.loadCategoriesFromSupabase();
    fixture.detectChanges();
  });

  it('should initialize with categories and total count', () => {
    expect(component).toBeTruthy();
    expect(component.categories().length).toBeGreaterThan(0);
    expect(component.totalRecords()).toBe(component.categories().length);
  });

  it('should filter categories by search term', () => {
    const event = { target: { value: 'coffee' } } as unknown as Event;
    component.onSearch(event);
    expect(component.filteredCategories().length).toBe(1);
    expect(component.filteredCategories()[0].name).toContain('Coffee');
  });

  it('should toggle active status of a category', () => {
    const cat = component.categories()[0];
    const initialStatus = cat.isActive;
    component.toggleActive(cat);
    const updated = component.categories().find((c) => c.id === cat.id);
    expect(updated?.isActive).toBe(!initialStatus);
  });

  it('should add a new category with color and icon', () => {
    const initialCount = component.categories().length;
    component.openAddModal();
    component.categoryForm.patchValue({
      name: 'Fresh Juices & Smoothies',
      code: 'juices-smoothies',
      color: '#10b981',
      icon: 'pi pi-apple',
      description: 'Cold-pressed seasonal juices',
      isActive: true,
    });
    component.saveCategory();

    expect(component.categories().length).toBe(initialCount + 1);
    expect(component.categories()[0].name).toBe('Fresh Juices & Smoothies');
  });
});
