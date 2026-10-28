/**
 * Reporting mathematics for operational dashboards.
 *
 * Kept outside the components so a KPI card never decides on its own how to treat
 * refunded tickets, currencies or a trading day boundary (AGENTS.md: no business
 * calculation inside presentation code).
 */

export type SalesStatus = 'pending' | 'completed' | 'partial_paid' | 'refunded' | 'cancelled' | string;

/** Minimal shape required to aggregate a ticket - matches the `sales` row. */
export interface SaleTotalsLike {
  grand_total: number | string;
  tax_total: number | string;
  discount_total: number | string;
  subtotal: number | string;
  paid_total?: number | string;
  status: SalesStatus;
  created_at: string;
}

export interface PeriodSalesSummary {
  /** Net revenue collected: completed tickets minus fully refunded ones. */
  grossSales: number;
  vatCollected: number;
  discountGiven: number;
  /** Tickets that actually brought money in (excludes refunds/cancellations). */
  orderCount: number;
  refundedCount: number;
  cancelledCount: number;
  avgTicket: number;
  /** True when the window contains at least one ticket of any status. */
  hasActivity: boolean;
}

const EMPTY_SUMMARY: PeriodSalesSummary = {
  grossSales: 0,
  vatCollected: 0,
  discountGiven: 0,
  orderCount: 0,
  refundedCount: 0,
  cancelledCount: 0,
  avgTicket: 0,
  hasActivity: false,
};

function num(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Aggregates a set of tickets into the KPI figures shown on the dashboard.
 * Refunded tickets are subtracted instead of being counted as revenue, so a
 * day of returns can never inflate the top-line number.
 */
export function summarizePeriodSales(sales: readonly SaleTotalsLike[]): PeriodSalesSummary {
  if (!sales || sales.length === 0) return { ...EMPTY_SUMMARY };

  let gross = 0;
  let vat = 0;
  let discounts = 0;
  let orders = 0;
  let refunded = 0;
  let cancelled = 0;

  for (const sale of sales) {
    const status = (sale.status || '').toLowerCase();
    const total = num(sale.grand_total);

    if (status === 'refunded') {
      refunded += 1;
      gross -= total;
      vat -= num(sale.tax_total);
      continue;
    }

    if (status === 'cancelled' || status === 'void' || status === 'voided') {
      cancelled += 1;
      continue;
    }

    // completed / partial_paid / pending all represent real demand.
    gross += total;
    vat += num(sale.tax_total);
    discounts += num(sale.discount_total);
    if (status !== 'pending') orders += 1;
  }

  return {
    grossSales: money(Math.max(0, gross)),
    vatCollected: money(Math.max(0, vat)),
    discountGiven: money(discounts),
    orderCount: orders,
    refundedCount: refunded,
    cancelledCount: cancelled,
    avgTicket: orders > 0 ? money(Math.max(0, gross) / orders) : 0,
    hasActivity: sales.length > 0,
  };
}

/**
 * Start of the trading day for a timezone, expressed as a UTC instant.
 * A Dubai shop still open at 01:00 zone time belongs to the previous shift's
 * day-boundary rules, so "today" is always measured from local midnight.
 */
export function startOfTradingDay(timeZone: string, now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);

  const valueOf = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const year = valueOf('year');
  const month = valueOf('month');
  const day = valueOf('day');

  // Instant the wall clock would represent if read as UTC; the delta against the
  // real instant is exactly the zone offset (Gulf time has no DST).
  const wallClockAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    valueOf('hour'),
    valueOf('minute'),
    valueOf('second'),
  );
  const offsetMs = wallClockAsUtc - Math.floor(now.getTime() / 1000) * 1000;

  return new Date(Date.UTC(year, month - 1, day) - offsetMs);
}

/** Filters a ticket list down to the given trading day. */
export function salesForTradingDay(
  sales: readonly SaleTotalsLike[],
  timeZone: string,
  now: Date = new Date(),
): SaleTotalsLike[] {
  const from = startOfTradingDay(timeZone, now).getTime();
  return sales.filter((sale) => {
    const created = new Date(sale.created_at).getTime();
    return Number.isFinite(created) && created >= from;
  });
}

/** Calendar day (YYYY-MM-DD) an instant falls on inside a timezone. */
export function tradingDayKey(instant: Date | string, timeZone: string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

/**
 * Groups tickets by their trading day so a dashboard can compare today against
 * yesterday without issuing two queries with fragile boundary arithmetic.
 */
export function groupSalesByTradingDay(
  sales: readonly SaleTotalsLike[],
  timeZone: string,
): Map<string, SaleTotalsLike[]> {
  const groups = new Map<string, SaleTotalsLike[]>();
  for (const sale of sales) {
    const key = tradingDayKey(sale.created_at, timeZone);
    const bucket = groups.get(key);
    if (bucket) bucket.push(sale);
    else groups.set(key, [sale]);
  }
  return groups;
}

export interface StockLevelLike {
  /** null when the branch does not track the SKU. */
  stock: number | null;
  reorderLevel: number | null;
}

/** SKUs at or below their branch replenishment threshold. */
export function countLowStock(items: readonly StockLevelLike[]): number {
  return items.filter((item) => {
    if (item.stock === null) return false;
    return item.stock <= (item.reorderLevel ?? 0);
  }).length;
}

export interface SalesDelta {
  label: string;
  direction: 'up' | 'down' | 'flat';
}

/**
 * Compares two periods of equal length (today vs yesterday by default) so the
 * KPI subtitle is a real figure instead of a decorative percentage.
 */
export function describeTrend(current: number, previous: number): SalesDelta {
  if (previous <= 0) {
    return {
      label: current > 0 ? 'No comparable sales in the previous period' : 'No sales recorded yet',
      direction: current > 0 ? 'up' : 'flat',
    };
  }
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.abs(Math.round(change * 10) / 10);
  return {
    label: `${change >= 0 ? '+' : '-'}${rounded}% vs previous period`,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  };
}
