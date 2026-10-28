import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { DataStateComponent } from '../../shared/components/data-state/data-state.component';
import { ProductRepository } from '../../data-access/repositories/product.repository';
import { InventoryRepository } from '../../data-access/repositories/inventory.repository';
import { AppContext } from '../../core/context/app-context.service';
import { NotificationService } from '../../core/services/notification.service';
import { describeError, LoadState } from '../../shared/utils/load-state.util';
import { StockMovementReason } from '../../data-access/models/inventory.model';

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  quantityOnHand: number;
  reorderLevel: number;
  /** False when the branch has no store_inventory row for this product. */
  inventoryTracked: boolean;
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
  reason: StockMovementReason;
  performedBy: string;
  notes: string;
}

const LEDGER_PAGE_SIZE = 200;

/** Ledger rows are attributed to auth users; the raw UUID is meaningless to a storekeeper. */
function describePerformer(performedBy: string | null | undefined): string {
  if (!performedBy) return 'System (RPC)';
  return `Staff ${performedBy.slice(0, 8)}`;
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
    DataStateComponent,
  ],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.css',
})
export class InventoryListComponent implements OnInit {
  private readonly productRepo = inject(ProductRepository);
  private readonly inventoryRepo = inject(InventoryRepository);
  private readonly notification = inject(NotificationService);
  readonly context = inject(AppContext);

  readonly stockState = new LoadState();
  readonly movementsState = new LoadState();

  activeTab = signal<'stock' | 'movements'>('stock');
  stockViewMode = signal<'table' | 'grid'>('table');
  searchQuery = signal<string>('');
  onlyLowStock = signal<boolean>(false);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  /** Guards double submits on the adjustment RPC. */
  readonly isAdjusting = signal<boolean>(false);
  readonly adjustmentError = signal<string | null>(null);

  inventory = signal<InventoryItem[]>([]);
  movements = signal<StockMovementRecord[]>([]);
  /** Catalog products with no stock row - rendered so untracked goods stay visible. */
  untrackedCount = signal<number>(0);

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  async ngOnInit() {
    await Promise.all([this.loadStock(), this.loadMovements()]);
  }

  /** On-hand balances for the active branch only - never a cross-branch average. */
  async loadStock() {
    if (!this.context.isConfigured()) {
      this.stockState.fail('No store is linked to this session, so stock levels cannot be resolved.');
      return;
    }

    await this.stockState.run(async () => {
      const catalog = await this.productRepo.getBranchCatalog(this.context.storeId(), {
        includeInactive: false,
      });

      const mapped: InventoryItem[] = catalog.products.map((p) => {
        const qty = Number(p.quantity_on_hand ?? 0);
        const cost = Number(p.cost_price ?? 0);
        return {
          id: p.id,
          sku: p.sku,
          productName: p.name,
          category: p.category_name || 'Uncategorized',
          quantityOnHand: qty,
          reorderLevel: p.reorder_level == null ? 0 : Number(p.reorder_level),
          inventoryTracked: p.inventory_tracked,
          unitCost: cost,
          totalCostValuation: Math.round(qty * cost * 100) / 100,
        };
      });

      this.inventory.set(mapped);
      this.untrackedCount.set(mapped.filter((item) => !item.inventoryTracked).length);
      return mapped.length > 0;
    });
  }

  async loadMovements() {
    if (!this.context.isConfigured()) {
      this.movementsState.fail('No store is linked to this session, so the ledger cannot be read.');
      return;
    }

    await this.movementsState.run(async () => {
      const movementsData = await this.inventoryRepo.getStockMovements(
        this.context.storeId(),
        LEDGER_PAGE_SIZE,
      );

      const productMap = new Map(this.inventory().map((item) => [item.id, item]));
      const mappedMovements: StockMovementRecord[] = movementsData.map((m) => {
        const prod = productMap.get(m.product_id);
        return {
          id: m.id,
          timestamp: m.created_at
            ? new Date(m.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dubai' })
            : 'Recent',
          sku: prod?.sku || 'Unknown SKU',
          productName: prod?.productName || 'Stock line for another product',
          quantityDelta: Number(m.quantity_delta),
          balanceAfter: Number(m.balance_after),
          reason: (m.reason as StockMovementReason) || 'adjustment',
          performedBy: describePerformer(m.performed_by),
          notes: m.notes || (m.reference_id ? `Reference ${m.reference_id.slice(0, 8)}` : 'No note recorded'),
        };
      });

      this.movements.set(mappedMovements);
      return mappedMovements.length > 0;
    }, { emptyReason: 'no_data' });
  }

  setStockViewMode(mode: 'table' | 'grid') {
    this.stockViewMode.set(mode);
  }

  toCardProduct(item: InventoryItem) {
    return {
      id: item.id,
      name: item.productName,
      sku: item.sku,
      // Untracked goods must not read as "Sold Out".
      stock: item.inventoryTracked ? item.quantityOnHand : null,
      reorderLevel: item.inventoryTracked ? item.reorderLevel : null,
      price: item.unitCost,
      category: item.category,
    };
  }

  // Adjustment Modal
  isAdjustModalOpen = signal<boolean>(false);
  selectedItemForAdjustment = signal<InventoryItem | null>(null);
  adjustmentDelta = signal<number>(0);
  adjustmentReason = signal<StockMovementReason>('adjustment');
  adjustmentNotes = signal<string>('');

  filteredInventory = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const low = this.onlyLowStock();
    return this.inventory().filter((item) => {
      const matchQ =
        !q || item.productName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
      const matchLow = !low || (item.inventoryTracked && item.quantityOnHand <= item.reorderLevel);
      return matchQ && matchLow;
    });
  });

  totalInventoryRecords = computed(() => this.filteredInventory().length);

  paginatedInventory = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredInventory().slice(start, start + this.pageSize());
  });

  /** Projected balance preview; the server recomputes it from the locked row. */
  projectedBalance = computed(() => {
    const item = this.selectedItemForAdjustment();
    if (!item) return 0;
    return item.quantityOnHand + this.adjustmentDelta();
  });

  openAdjustModal(item: InventoryItem) {
    this.selectedItemForAdjustment.set(item);
    this.adjustmentDelta.set(0);
    this.adjustmentReason.set('adjustment');
    this.adjustmentNotes.set('');
    this.adjustmentError.set(null);
    this.isAdjustModalOpen.set(true);
  }

  closeAdjustModal() {
    if (this.isAdjusting()) return;
    this.isAdjustModalOpen.set(false);
    this.selectedItemForAdjustment.set(null);
  }

  /**
   * Writes the movement through the apply_stock_delta RPC: the delta is applied to
   * the locked server-side balance, the ledger row and the balance commit together,
   * and RLS rejects any direct client write to store_inventory.
   */
  async submitAdjustment() {
    const item = this.selectedItemForAdjustment();
    const delta = Number(this.adjustmentDelta());
    if (!item || !Number.isFinite(delta) || delta === 0) return;

    if (delta < 0 && item.quantityOnHand + delta < 0) {
      this.adjustmentError.set(
        `Cannot remove ${Math.abs(delta)} units - only ${item.quantityOnHand} on hand at this branch.`,
      );
      return;
    }

    const notes = this.adjustmentNotes().trim();
    if (!notes) {
      this.adjustmentError.set('An audit note is required for every stock movement.');
      return;
    }

    this.isAdjusting.set(true);
    this.adjustmentError.set(null);

    try {
      const balance = await this.inventoryRepo.applyStockDelta(
        this.context.storeId(),
        item.id,
        delta,
        this.adjustmentReason(),
        { notes },
      );

      this.notification.success(
        `${item.productName} balance is now ${balance} units.`,
        'Stock movement recorded',
      );
      this.isAdjustModalOpen.set(false);
      this.selectedItemForAdjustment.set(null);

      await Promise.all([this.loadStock(), this.loadMovements()]);
    } catch (err) {
      const message = describeError(err);
      this.adjustmentError.set(message);
      this.notification.error(message, 'Stock adjustment failed');
    } finally {
      this.isAdjusting.set(false);
    }
  }
}
