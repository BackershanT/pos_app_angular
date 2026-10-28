import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';

export interface SaleTransaction {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  cashierName: string;
  itemsCount: number;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: string;
  status: 'completed' | 'partially_refunded' | 'refunded';
}

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    HasPermissionDirective,
    CurrencyFormatPipe,
    DateFormatPipe,
    TruncatePipe,
  ],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.css',
})
export class SalesListComponent {
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Selected Sale Details Modal
  selectedSale = signal<SaleTransaction | null>(null);
  isDetailModalOpen = signal<boolean>(false);

  // Refund Modal
  isRefundModalOpen = signal<boolean>(false);
  refundReason = signal<string>('Customer Dissatisfaction');
  returnToStock = signal<boolean>(true);

  sales = signal<SaleTransaction[]>([
    { id: 's1', invoiceNumber: 'INV-20261028-0412', date: '2026-10-28 17:15', customerName: 'Walk-in Customer', cashierName: 'Kasun B.', itemsCount: 3, subtotal: 64.76, taxTotal: 3.24, grandTotal: 68.0, paymentMethod: 'Card', status: 'completed' },
    { id: 's2', invoiceNumber: 'INV-20261028-0411', date: '2026-10-28 17:10', customerName: 'Ahmed Al-Maktoum', cashierName: 'Kasun B.', itemsCount: 1, subtotal: 22.86, taxTotal: 1.14, grandTotal: 24.0, paymentMethod: 'Apple Pay', status: 'completed' },
    { id: 's3', invoiceNumber: 'INV-20261028-0410', date: '2026-10-28 17:02', customerName: 'Rashid Khan', cashierName: 'Sarah M.', itemsCount: 4, subtotal: 106.67, taxTotal: 5.33, grandTotal: 112.0, paymentMethod: 'Cash', status: 'completed' },
    { id: 's4', invoiceNumber: 'INV-20261028-0409', date: '2026-10-28 16:55', customerName: 'Walk-in Customer', cashierName: 'Sarah M.', itemsCount: 2, subtotal: 43.81, taxTotal: 2.19, grandTotal: 46.0, paymentMethod: 'Card', status: 'completed' },
    { id: 's5', invoiceNumber: 'INV-20261028-0408', date: '2026-10-28 16:30', customerName: 'Fatima Noor', cashierName: 'Kasun B.', itemsCount: 2, subtotal: 36.19, taxTotal: 1.81, grandTotal: 38.0, paymentMethod: 'Card', status: 'refunded' },
    { id: 's6', invoiceNumber: 'INV-20261028-0407', date: '2026-10-28 15:45', customerName: 'Walk-in Customer', cashierName: 'Kasun B.', itemsCount: 3, subtotal: 78.10, taxTotal: 3.90, grandTotal: 82.0, paymentMethod: 'Cash', status: 'completed' },
    { id: 's7', invoiceNumber: 'INV-20261028-0406', date: '2026-10-28 15:10', customerName: 'Zayd Al-Nuaimi', cashierName: 'Sarah M.', itemsCount: 5, subtotal: 135.24, taxTotal: 6.76, grandTotal: 142.0, paymentMethod: 'Card', status: 'partially_refunded' },
  ]);

  filteredSales = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.selectedStatus();
    return this.sales().filter((s) => {
      const matchQ =
        !q ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q);
      const matchSt = st === 'all' || s.status === st;
      return matchQ && matchSt;
    });
  });

  totalRecords = computed(() => this.filteredSales().length);

  paginatedSales = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredSales().slice(start, start + this.pageSize());
  });

  openDetails(sale: SaleTransaction) {
    this.selectedSale.set(sale);
    this.isDetailModalOpen.set(true);
  }

  closeDetails() {
    this.isDetailModalOpen.set(false);
  }

  openRefundModal() {
    this.isRefundModalOpen.set(true);
  }

  closeRefundModal() {
    this.isRefundModalOpen.set(false);
  }

  processRefund() {
    const sale = this.selectedSale();
    if (!sale) return;

    this.sales.update((list) =>
      list.map((s) => (s.id === sale.id ? { ...s, status: 'refunded' as const } : s))
    );

    this.selectedSale.update((s) => (s ? { ...s, status: 'refunded' as const } : null));
    this.closeRefundModal();
  }

  reprintReceipt() {
    window.print();
  }
}
