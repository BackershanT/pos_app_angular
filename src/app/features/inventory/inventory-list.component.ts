import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ProductRepository } from '../../data-access/repositories/product.repository';
import { InventoryRepository } from '../../data-access/repositories/inventory.repository';

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
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    ProductCardComponent,
    SearchInputComponent,
    BadgeComponent,
  ],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.css',
})
export class InventoryListComponent implements OnInit {
  private readonly productRepo = inject(ProductRepository);
  private readonly inventoryRepo = inject(InventoryRepository);

  activeTab = signal<'stock' | 'movements'>('stock');
  stockViewMode = signal<'table' | 'grid'>('table');
  searchQuery = signal<string>('');
  onlyLowStock = signal<boolean>(false);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  readonly isCloudConnected = signal<boolean>(false);

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  async ngOnInit() {
    await this.loadInventoryFromSupabase();
  }

  async loadInventoryFromSupabase() {
    try {
      const [data, movementsData] = await Promise.all([
        this.productRepo.getProductsWithInventory(),
        this.inventoryRepo.getStockMovements().catch(() => []),
      ]);

      if (data && data.length > 0) {
        const mapped: InventoryItem[] = data.map((p) => {
          const qty = p.quantity_on_hand != null ? Number(p.quantity_on_hand) : 25;
          const cost = Number(p.cost_price || 0);
          return {
            id: p.id,
            sku: p.sku,
            productName: p.name,
            category: p.category_name || 'General',
            quantityOnHand: qty,
            reorderLevel: p.reorder_level != null ? Number(p.reorder_level) : 10,
            unitCost: cost,
            totalCostValuation: Math.round(qty * cost * 100) / 100,
          };
        });
        this.inventory.set(mapped);
        this.isCloudConnected.set(true);

        if (movementsData && movementsData.length > 0) {
          const productMap = new Map(data.map((p) => [p.id, p]));
          const mappedMovements: StockMovementRecord[] = movementsData.map((m) => {
            const prod = productMap.get(m.product_id);
            return {
              id: m.id,
              timestamp: m.created_at ? new Date(m.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dubai' }) : 'Recent',
              sku: prod?.sku || 'SKU-UAE',
              productName: prod?.name || 'Catalog Item',
              quantityDelta: Number(m.quantity_delta),
              balanceAfter: Number(m.balance_after),
              reason: (m.reason as any) || 'adjustment',
              performedBy: 'Store Supervisor',
              notes: `Supabase verified stock ledger`,
            };
          });
          this.movements.set(mappedMovements);
        }
      }
    } catch (err) {
      console.warn('Supabase inventory load deferred:', err);
    }
  }

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

  inventory = signal<InventoryItem[]>([]);
  movements = signal<StockMovementRecord[]>([]);

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
