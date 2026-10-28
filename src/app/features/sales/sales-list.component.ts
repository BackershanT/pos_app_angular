import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { OrderRepository } from '../../data-access/repositories/order.repository';

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
    SearchInputComponent,
    BadgeComponent,
    HasPermissionDirective,
    CurrencyFormatPipe,
    DateFormatPipe,
    TruncatePipe,
  ],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.css',
})
export class SalesListComponent implements OnInit {
  private readonly orderRepo = inject(OrderRepository);

  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  readonly isCloudConnected = signal<boolean>(false);

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  // Selected Sale Details Modal
  selectedSale = signal<SaleTransaction | null>(null);
  isDetailModalOpen = signal<boolean>(false);

  // Refund Modal
  isRefundModalOpen = signal<boolean>(false);
  refundReason = signal<string>('Customer Dissatisfaction');
  returnToStock = signal<boolean>(true);

  sales = signal<SaleTransaction[]>([]);

  async ngOnInit() {
    await this.loadSalesFromSupabase();
  }

  async loadSalesFromSupabase() {
    try {
      const data = await this.orderRepo.getSalesByStore('a0000000-0000-0000-0000-000000000001');
      if (data && data.length > 0) {
        const mapped: SaleTransaction[] = data.map((s: any) => {
          const notesParts = (s.notes || '').split('|');
          const custName = notesParts[0]?.trim() || 'Walk-in Customer';
          const cashier = notesParts[1]?.replace('Cashier:', '').trim() || 'Kasun B.';
          return {
            id: s.id,
            invoiceNumber: s.invoice_number,
            date: s.created_at ? new Date(s.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dubai' }) : 'Recent',
            customerName: custName,
            cashierName: cashier,
            itemsCount: 3,
            subtotal: Number(s.subtotal),
            taxTotal: Number(s.tax_total),
            grandTotal: Number(s.grand_total),
            paymentMethod: 'Card / Electronic',
            status: (s.status as any) || 'completed',
          };
        });
        this.sales.set(mapped);
        this.isCloudConnected.set(true);
      }
    } catch (err) {
      console.warn('Supabase sales load deferred:', err);
    }
  }

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
