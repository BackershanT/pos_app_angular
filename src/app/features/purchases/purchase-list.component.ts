import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { calculateCartTotals } from '../../shared/utils/calculation.utils';
import { PurchaseRepository } from '../../data-access/repositories/purchase.repository';
import { SupplierRepository } from '../../data-access/repositories/supplier.repository';

export interface PurchaseOrderItemRow {
  productId: string;
  productName: string;
  sku: string;
  quantityOrdered: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierTrn: string;
  orderDate: string;
  expectedDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: 'draft' | 'ordered' | 'received' | 'paid' | 'cancelled';
  notes: string;
  items: PurchaseOrderItemRow[];
}

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    CurrencyFormatPipe,
    DateFormatPipe,
  ],
  templateUrl: './purchase-list.component.html',
  styleUrl: './purchase-list.component.css',
})
export class PurchaseListComponent implements OnInit {
  private readonly purchaseRepo = inject(PurchaseRepository);
  private readonly supplierRepo = inject(SupplierRepository);

  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  readonly isCloudConnected = signal<boolean>(false);

  // Modals state
  isCreateModalOpen = signal<boolean>(false);
  selectedPoForView = signal<PurchaseOrderRecord | null>(null);

  // Supplier Options
  readonly suppliers = [
    { id: 's1', name: 'Dubai Roastery Co.', trn: '100234892300001' },
    { id: 's2', name: 'Emirates Dairy & Bakery LLC', trn: '100567890100002' },
    { id: 's3', name: 'Gulf Packaging & Cups Ltd', trn: '100891234500003' },
    { id: 's4', name: 'Al-Khaleej Food Trading', trn: '100345678900004' },
  ];

  // Available Products for PO
  readonly availableProducts = [
    { id: 'p1', name: 'Specialty Coffee Beans 1kg', sku: 'CF-RAW-01', cost: 45.0 },
    { id: 'p2', name: 'Oat Milk Barista Edition 1L', sku: 'MK-OAT-01', cost: 8.5 },
    { id: 'p3', name: 'Almond Milk Barista Edition 1L', sku: 'MK-ALM-01', cost: 9.0 },
    { id: 'p4', name: 'Artisan Butter Croissant (Frozen Box 50)', sku: 'BK-CR-50', cost: 110.0 },
    { id: 'p5', name: 'Organic Matcha Powder 500g', sku: 'TEA-MTC-01', cost: 65.0 },
    { id: 'p6', name: 'Eco Bio Paper Cups 12oz (Box 500)', sku: 'PKG-CUP-12', cost: 75.0 },
  ];

  orders = signal<PurchaseOrderRecord[]>([]);

  async ngOnInit() {
    await this.loadPurchaseOrdersFromSupabase();
  }

  async loadPurchaseOrdersFromSupabase() {
    try {
      const [pos, sups] = await Promise.all([
        this.purchaseRepo.getPurchaseOrders().catch(() => []),
        this.supplierRepo.getSuppliers().catch(() => []),
      ]);

      if (pos && pos.length > 0) {
        const supplierMap = new Map(sups.map((s) => [s.id, s]));
        const mappedOrders: PurchaseOrderRecord[] = await Promise.all(
          pos.map(async (po) => {
            const supp = supplierMap.get(po.supplier_id);
            const poDetails = await this.purchaseRepo.getPurchaseOrderById(po.id).catch(() => null);
            const items: PurchaseOrderItemRow[] = (poDetails?.items || []).map((it) => ({
              productId: it.product_id,
              productName: 'Inventory Item',
              sku: 'SKU-UAE',
              quantityOrdered: Number(it.quantity),
              unitCost: Number(it.unit_cost),
              totalCost: Number(it.subtotal),
            }));
            const subtotal = items.reduce((s, it) => s + it.totalCost, 0) || 500;
            const tax = +(subtotal * 0.05).toFixed(2);
            return {
              id: po.id,
              poNumber: po.order_number,
              supplierId: po.supplier_id,
              supplierName: supp?.name || 'Authorized Supplier',
              supplierTrn: supp?.tax_number || '100000000000003',
              orderDate: po.ordered_at || po.created_at,
              expectedDate: po.expected_at || po.created_at,
              subtotal,
              taxAmount: tax,
              totalAmount: +(subtotal + tax).toFixed(2),
              status: (po.status as any) || 'draft',
              notes: 'Restock order registered via Supabase procurement',
              items,
            };
          })
        );
        this.orders.set(mappedOrders);
        this.isCloudConnected.set(true);
      }
    } catch (err) {
      console.warn('Supabase PO load deferred:', err);
    }
  }

  // Form for New Purchase Order
  poForm = new FormGroup({
    supplierId: new FormControl('s1', [Validators.required]),
    expectedDate: new FormControl('2026-11-02', [Validators.required]),
    notes: new FormControl(''),
    selectedProductId: new FormControl('p1'),
    quantity: new FormControl(10, [Validators.required, Validators.min(1)]),
    unitCost: new FormControl(45.0, [Validators.required, Validators.min(0.1)]),
  });

  // Dynamic Item List inside Modal
  modalItems = signal<PurchaseOrderItemRow[]>([
    {
      productId: 'p1',
      productName: 'Specialty Coffee Beans 1kg',
      sku: 'CF-RAW-01',
      quantityOrdered: 10,
      unitCost: 45.0,
      totalCost: 450.0,
    },
  ]);

  modalTotals = computed(() => {
    const items = this.modalItems();
    const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0);
    const taxAmount = +(subtotal * 0.05).toFixed(2);
    const totalAmount = +(subtotal + taxAmount).toFixed(2);
    return { subtotal, taxAmount, totalAmount };
  });

  filteredOrders = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();

    return this.orders().filter((order) => {
      const matchesQuery =
        !q ||
        order.poNumber.toLowerCase().includes(q) ||
        order.supplierName.toLowerCase().includes(q) ||
        order.notes.toLowerCase().includes(q);

      const matchesStatus = status === 'all' || order.status === status;

      return matchesQuery && matchesStatus;
    });
  });

  totalRecords = computed(() => this.filteredOrders().length);

  paginatedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredOrders().slice(start, start + this.pageSize());
  });

  // Modal actions
  openCreateModal() {
    this.modalItems.set([
      {
        productId: 'p1',
        productName: 'Specialty Coffee Beans 1kg',
        sku: 'CF-RAW-01',
        quantityOrdered: 10,
        unitCost: 45.0,
        totalCost: 450.0,
      },
    ]);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  addItemToModal() {
    const prodId = this.poForm.get('selectedProductId')?.value;
    const qty = +(this.poForm.get('quantity')?.value || 1);
    const cost = +(this.poForm.get('unitCost')?.value || 0);

    const product = this.availableProducts.find((p) => p.id === prodId);
    if (!product || qty <= 0 || cost <= 0) return;

    const newItem: PurchaseOrderItemRow = {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantityOrdered: qty,
      unitCost: cost,
      totalCost: +(qty * cost).toFixed(2),
    };

    this.modalItems.update((items) => [...items, newItem]);
  }

  removeItemFromModal(index: number) {
    this.modalItems.update((items) => items.filter((_, i) => i !== index));
  }

  onProductSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    const prod = this.availableProducts.find((p) => p.id === target.value);
    if (prod) {
      this.poForm.patchValue({ unitCost: prod.cost });
    }
  }

  savePurchaseOrder(asOrdered = false) {
    const items = this.modalItems();
    if (items.length === 0) return;

    const supplierId = this.poForm.get('supplierId')?.value || 's1';
    const supplier = this.suppliers.find((s) => s.id === supplierId);
    const expectedDate = this.poForm.get('expectedDate')?.value || '';
    const notes = this.poForm.get('notes')?.value || '';
    const totals = this.modalTotals();

    const newOrder: PurchaseOrderRecord = {
      id: `po-${Date.now()}`,
      poNumber: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId,
      supplierName: supplier?.name || 'Authorized Supplier',
      supplierTrn: supplier?.trn || '100234892300001',
      orderDate: new Date().toISOString(),
      expectedDate: new Date(expectedDate).toISOString(),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      status: asOrdered ? 'ordered' : 'draft',
      notes,
      items,
    };

    this.orders.update((list) => [newOrder, ...list]);
    this.closeCreateModal();
  }

  receiveGoods(order: PurchaseOrderRecord) {
    if (order.status === 'received') return;

    this.orders.update((list) =>
      list.map((o) => (o.id === order.id ? { ...o, status: 'received' as const } : o))
    );
  }

  viewOrder(order: PurchaseOrderRecord) {
    this.selectedPoForView.set(order);
  }

  closeViewModal() {
    this.selectedPoForView.set(null);
  }

  onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onStatusSelect(status: string) {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }
}
