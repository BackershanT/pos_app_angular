import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductRepository } from '../../data-access/repositories/product.repository';
import { OrderRepository, ProductVelocity } from '../../data-access/repositories/order.repository';
import { AppContext } from '../../core/context/app-context.service';
import { NotificationService } from '../../core/services/notification.service';
import { RealtimeService } from '../../data-access/supabase/realtime.service';
import { DataStateComponent } from '../../shared/components/data-state/data-state.component';
import { describeError, LoadState } from '../../shared/utils/load-state.util';
import {
  countLowStock,
  describeTrend,
  groupSalesByTradingDay,
  PeriodSalesSummary,
  startOfTradingDay,
  summarizePeriodSales,
  tradingDayKey,
} from '../../shared/utils/report.utils';
import { roundCurrency } from '../../shared/utils/calculation.utils';
import { Sale } from '../../data-access/models/order.model';
import { environment } from '../../../environments/environment';

export interface KpiCard {
  title: string;
  value: string;
  sub: string;
  icon: string;
  color: string;
  trend: 'up' | 'down' | 'flat';
}

export interface RecentTicket {
  id: string;
  invoice: string;
  terminal: string;
  lines: number;
  units: number;
  total: number;
  status: string;
  time: string;
}

const SALES_SCAN_LIMIT = 500;

/** Terminal identifier is written into the sale notes by the register. */
function terminalFromNotes(notes: string | null, fallback: string): string {
  const match = /Terminal\s+([A-Za-z0-9-]+)/.exec(notes || '');
  return match?.[1] ?? fallback;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: 'Completed',
    partial_paid: 'Part paid',
    pending: 'Open',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DataStateComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly productRepo = inject(ProductRepository);
  private readonly orderRepo = inject(OrderRepository);
  private readonly notification = inject(NotificationService);
  readonly context = inject(AppContext);
  readonly realtime = inject(RealtimeService);

  readonly overviewState = new LoadState();
  readonly velocityState = new LoadState();
  readonly feedState = new LoadState();

  readonly timezone = environment.pos.timezone;

  todaySummary = signal<PeriodSalesSummary | null>(null);
  previousSummary = signal<PeriodSalesSummary | null>(null);
  velocity = signal<ProductVelocity[]>([]);
  velocityClipped = signal<boolean>(false);
  recentTickets = signal<RecentTicket[]>([]);
  lowStock = signal<{ count: number; tracked: number }>({ count: 0, tracked: 0 });

  private realtimeTeardown: (() => void) | null = null;

  readonly currency = this.context.currency;
  readonly storeName = this.context.storeName;

  stats = computed<KpiCard[]>(() => {
    const today = this.todaySummary();
    const previous = this.previousSummary();
    const currency = this.context.currency();
    const current = today ?? summarizePeriodSales([]);
    const revenueTrend = describeTrend(current.grossSales, previous?.grossSales ?? 0);
    const orderTrend = describeTrend(current.orderCount, previous?.orderCount ?? 0);
    const low = this.lowStock();

    return [
      {
        title: 'Net Sales (Trading Day)',
        value: `${current.grossSales.toFixed(2)} ${currency}`,
        sub: revenueTrend.label,
        icon: 'pi pi-chart-line',
        color: '#3b82f6',
        trend: revenueTrend.direction,
      },
      {
        title: 'Tickets Closed',
        value: `${current.orderCount}`,
        sub:
          current.orderCount > 0
            ? `Average ${(current.avgTicket).toFixed(2)} ${currency} / ticket`
            : 'No tickets closed yet today',
        icon: 'pi pi-receipt',
        color: '#10b981',
        trend: orderTrend.direction,
      },
      {
        title: `VAT Collected (${Math.round(this.context.vatRate() * 100)}%)`,
        value: `${current.vatCollected.toFixed(2)} ${currency}`,
        sub: `FTA TRN ${this.context.taxNumber()} · TRN-bearing invoices`,
        icon: 'pi pi-percentage',
        color: '#f59e0b',
        trend: 'flat',
      },
      {
        title: 'Low Stock SKUs',
        value: `${low.count} SKUs`,
        sub:
          low.tracked === 0
            ? 'No SKUs are tracked at this branch'
            : `Across ${low.tracked} tracked SKUs on this branch`,
        icon: 'pi pi-exclamation-triangle',
        color: '#ef4444',
        trend: low.count > 0 ? 'down' : 'flat',
      },
    ];
  });

  /** Largest sell-through in the window - used to scale the ranking bars. */
  maxUnitsSold = computed(() => {
    const rows = this.velocity();
    return rows.length ? Math.max(...rows.map((r) => r.unitsSold)) : 0;
  });

  hasAnyData = computed(
    () =>
      (this.todaySummary()?.hasActivity ?? false) ||
      this.velocity().length > 0 ||
      this.recentTickets().length > 0,
  );

  async ngOnInit() {
    await this.loadAll();
    // The "Live Stream" badge is only honest if new tickets actually arrive.
    this.realtimeTeardown = this.realtime.watchInserts<Sale>('sales', () => {
      void this.loadAll({ silent: true });
    });
  }

  ngOnDestroy() {
    this.realtimeTeardown?.();
    this.realtimeTeardown = null;
  }

  async loadAll(options: { silent?: boolean } = {}) {
    if (!this.context.isConfigured()) {
      const message =
        'This terminal has no valid store context, so no branch figures can be calculated.';
      this.overviewState.fail(message);
      this.velocityState.fail(message);
      this.feedState.fail(message);
      return;
    }

    await Promise.all([
      this.loadOverview(options),
      this.loadVelocity(options),
      this.loadFeed(options),
    ]);
  }

  /**
   * KPI figures are derived from the branch's own tickets for the current and
   * previous trading day - nothing on this screen is a decorative constant.
   */
  async loadOverview(options: { silent?: boolean } = {}) {
    const storeId = this.context.storeId();

    await this.overviewState.run(
      async () => {
        const now = new Date();
        const todayStart = startOfTradingDay(this.timezone, now);
        const yesterdayStart = new Date(todayStart.getTime() - 86400000);
        const yesterdayReference = new Date(yesterdayStart.getTime() + 1000);

        const [catalog, sales] = await Promise.all([
          this.productRepo.getBranchCatalog(storeId),
          this.orderRepo.getSalesByStore(storeId, SALES_SCAN_LIMIT, { from: yesterdayStart }),
        ]);

        const grouped = groupSalesByTradingDay(sales, this.timezone);
        const todayKey = tradingDayKey(now, this.timezone);
        const yesterdayKey = tradingDayKey(yesterdayReference, this.timezone);

        this.todaySummary.set(summarizePeriodSales(grouped.get(todayKey) ?? []));
        this.previousSummary.set(summarizePeriodSales(grouped.get(yesterdayKey) ?? []));

        const tracked = catalog.products.filter((p) => p.inventory_tracked);
        this.lowStock.set({
          count: countLowStock(
            tracked.map((p) => ({
              stock: Number(p.quantity_on_hand ?? 0),
              reorderLevel: p.reorder_level == null ? null : Number(p.reorder_level),
            })),
          ),
          tracked: tracked.length,
        });

        return catalog.products.length > 0 || sales.length > 0;
      },
      { silent: options.silent },
    );
  }

  async loadVelocity(options: { silent?: boolean } = {}) {
    await this.velocityState.run(
      async () => {
        const result = await this.orderRepo.getProductVelocity(this.context.businessId(), 6);
        this.velocity.set(result.velocity);
        this.velocityClipped.set(result.clipped);
        if (result.clipped) {
          this.notification.warning(
            'Sell-through ranking is based on the most recent ticket lines only, not the full history.',
            'Ranking window clipped',
          );
        }
        return result.velocity.length > 0;
      },
      { silent: options.silent, emptyReason: 'no_data' },
    );
  }

  async loadFeed(options: { silent?: boolean } = {}) {
    await this.feedState.run(
      async () => {
        const sales = await this.orderRepo.getRecentSalesWithLineCounts(this.context.storeId(), 8);
        this.recentTickets.set(
          sales.map((sale) => ({
            id: sale.id,
            invoice: sale.invoice_number,
            terminal: terminalFromNotes(sale.notes, this.context.terminalId()),
            lines: sale.line_count,
            units: sale.units_sold,
            total: roundCurrency(Number(sale.grand_total)),
            status: statusLabel(sale.status),
            time: sale.created_at
              ? new Date(sale.created_at).toLocaleTimeString('en-GB', {
                  timeZone: this.timezone,
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '--:--',
          })),
        );
        return sales.length > 0;
      },
      { silent: options.silent, emptyReason: 'no_data' },
    );
  }

  retryAll(): void {
    void this.loadAll();
  }

  goToPos(): void {
    this.router.navigate(['/pos']);
  }

  goToInventory(): void {
    this.router.navigate(['/inventory']);
  }
}
