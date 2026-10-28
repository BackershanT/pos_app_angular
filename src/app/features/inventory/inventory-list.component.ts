import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
  totalCostValuation: number;
}

export interface StockMovementRecord {
  id: string;
  timestamp: string;
  sku: string;
  productName: string;
  quantityDelta: number;
  balanceAfter: number;
  reason: 'sale' | 'purchase' | 'adjustment' | 'refund' | 'damage';
  performedBy: string;
  notes: string;
}

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ProductCardComponent],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.css',
})
export class InventoryListComponent {
  activeTab = signal<'stock' | 'movements'>('stock');
  stockViewMode = signal<'table' | 'grid'>('table');
  searchQuery = signal<string>('');
  onlyLowStock = signal<boolean>(false);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  setStockViewMode(mode: 'table' | 'grid') {
    this.stockViewMode.set(mode);
  }

  toCardProduct(item: InventoryItem) {
    return {
      id: item.id,
      name: item.productName,
      sku: item.sku,
      stock: item.quantityOnHand,
      price: item.unitCost,
      category: item.category,
    };
  }

  // Adjustment Modal
  isAdjustModalOpen = signal<boolean>(false);
  selectedItemForAdjustment = signal<InventoryItem | null>(null);
  adjustmentDelta = signal<number>(0);
  adjustmentReason = signal<'adjustment' | 'damage' | 'purchase' | 'refund'>('adjustment');
  adjustmentNotes = signal<string>('');

  inventory = signal<InventoryItem[]>([
    { id: '1', sku: 'CF-001', productName: 'Spanish Latte (Iced)', category: 'Beverages', quantityOnHand: 45, reorderLevel: 20, unitCost: 8.5, totalCostValuation: 382.5 },
    { id: '2', sku: 'CF-002', productName: 'Caramel Macchiato', category: 'Beverages', quantityOnHand: 38, reorderLevel: 15, unitCost: 7.0, totalCostValuation: 266.0 },
    { id: '3', sku: 'CF-003', productName: 'Matcha Green Tea', category: 'Beverages', quantityOnHand: 29, reorderLevel: 15, unitCost: 9.0, totalCostValuation: 261.0 },
    { id: '4', sku: 'BK-001', productName: 'Butter Croissant', category: 'Bakery', quantityOnHand: 8, reorderLevel: 15, unitCost: 4.5, totalCostValuation: 36.0 },
    { id: '5', sku: 'BK-002', productName: 'Chocolate Pain Au', category: 'Bakery', quantityOnHand: 5, reorderLevel: 15, unitCost: 5.5, totalCostValuation: 27.5 },
    { id: '6', sku: 'BK-003', productName: 'Artisan Sourdough', category: 'Bakery', quantityOnHand: 12, reorderLevel: 10, unitCost: 9.0, totalCostValuation: 108.0 },
    { id: '7', sku: 'SW-001', productName: 'Truffle Chicken Panini', category: 'Main Meals', quantityOnHand: 18, reorderLevel: 10, unitCost: 14.0, totalCostValuation: 252.0 },
    { id: '8', sku: 'SW-002', productName: 'Smoked Salmon Bagel', category: 'Main Meals', quantityOnHand: 4, reorderLevel: 10, unitCost: 16.5, totalCostValuation: 66.0 },
    { id: '9', sku: 'DS-001', productName: 'San Sebastian Cheesecake', category: 'Desserts', quantityOnHand: 22, reorderLevel: 12, unitCost: 11.0, totalCostValuation: 242.0 },
    { id: '10', sku: 'DS-002', productName: 'Pistachio Kunafa Cup', category: 'Desserts', quantityOnHand: 19, reorderLevel: 12, unitCost: 10.0, totalCostValuation: 190.0 },
  ]);

  movements = signal<StockMovementRecord[]>([
    { id: 'm1', timestamp: '2026-10-28 17:15', sku: 'CF-001', productName: 'Spanish Latte (Iced)', quantityDelta: -1, balanceAfter: 45, reason: 'sale', performedBy: 'Kasun B.', notes: 'Checkout INV-20261028-0412' },
    { id: 'm2', timestamp: '2026-10-28 17:10', sku: 'BK-001', productName: 'Butter Croissant', quantityDelta: -2, balanceAfter: 8, reason: 'sale', performedBy: 'Kasun B.', notes: 'Checkout INV-20261028-0411' },
    { id: 'm3', timestamp: '2026-10-28 15:30', sku: 'BK-002', productName: 'Chocolate Pain Au', quantityDelta: -3, balanceAfter: 5, reason: 'damage', performedBy: 'Manager Sarah', notes: 'Expired shelf life write-off' },
    { id: 'm4', timestamp: '2026-10-28 09:00', sku: 'CF-001', productName: 'Spanish Latte (Iced)', quantityDelta: +50, balanceAfter: 46, reason: 'purchase', performedBy: 'Inventory Clerk', notes: 'PO-2026-081 Receiving' },
  ]);

  filteredInventory = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const low = this.onlyLowStock();
    return this.inventory().filter((item) => {
      const matchQ = !q || item.productName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
      const matchLow = !low || item.quantityOnHand <= item.reorderLevel;
      return matchQ && matchLow;
    });
  });

  totalInventoryRecords = computed(() => this.filteredInventory().length);

  paginatedInventory = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredInventory().slice(start, start + this.pageSize());
  });

  openAdjustModal(item: InventoryItem) {
    this.selectedItemForAdjustment.set(item);
    this.adjustmentDelta.set(0);
    this.adjustmentReason.set('adjustment');
    this.adjustmentNotes.set('');
    this.isAdjustModalOpen.set(true);
  }

  closeAdjustModal() {
    this.isAdjustModalOpen.set(false);
    this.selectedItemForAdjustment.set(null);
  }

  submitAdjustment() {
    const item = this.selectedItemForAdjustment();
    const delta = this.adjustmentDelta();
    if (!item || delta === 0) return;

    const newBalance = item.quantityOnHand + delta;

    this.inventory.update((list) =>
      list.map((inv) =>
        inv.id === item.id
          ? {
              ...inv,
              quantityOnHand: newBalance,
              totalCostValuation: Math.round(newBalance * inv.unitCost * 100) / 100,
            }
          : inv
      )
    );

    const movement: StockMovementRecord = {
      id: 'm-' + Date.now(),
      timestamp: new Date().toLocaleString('en-US', { hour12: false }),
      sku: item.sku,
      productName: item.productName,
      quantityDelta: delta,
      balanceAfter: newBalance,
      reason: this.adjustmentReason(),
      performedBy: 'Kasun Backer',
      notes: this.adjustmentNotes() || 'Manual stock adjustment',
    };

    this.movements.update((m) => [movement, ...m]);
    this.closeAdjustModal();
  }
}
