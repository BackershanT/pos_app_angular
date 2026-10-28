import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthState } from '../auth/auth.state';
import { isUuid } from '../../shared/utils/uuid.util';
import { environment } from '../../../environments/environment';

export { isUuid };

/**
 * Single source of truth for the active tenant (business) and branch (store).
 *
 * Presentation components and features must never embed store/business identifiers:
 * they read them from this context so the value is consistent for querying,
 * invoices, stock movements and audit trails.
 */
@Injectable({ providedIn: 'root' })
export class AppContext {
  private readonly authState = inject(AuthState);

  private readonly selectedBusinessId = signal<string | null>(null);
  private readonly selectedStoreId = signal<string | null>(null);

  private readonly config = environment.pos;

  /** Active business UUID: explicit selection -> session -> configured default. */
  readonly businessId = computed(
    () =>
      this.firstValidUuid([
        this.selectedBusinessId(),
        this.authState.activeBusinessId(),
        this.config.defaultBusinessId,
      ]),
  );

  /** Active store (branch) UUID: explicit selection -> session -> configured default. */
  readonly storeId = computed(
    () =>
      this.firstValidUuid([
        this.selectedStoreId(),
        this.authState.activeStoreId(),
        this.config.defaultStoreId,
      ]),
  );

  readonly storeName = computed(() => this.config.defaultStoreName);
  readonly storeAddress = computed(() => this.config.defaultStoreAddress);
  readonly terminalId = computed(() => this.config.defaultTerminalId);
  readonly businessName = computed(() => this.config.defaultBusinessName);
  readonly taxNumber = computed(() => this.config.defaultTaxNumber);
  readonly currency = computed(() => this.config.defaultCurrency);
  readonly vatRate = computed(() => this.config.defaultTaxRate);
  readonly invoicePrefix = computed(() => this.config.invoicePrefixDefault);

  /**
   * True when no UUID-safe tenant identifier could be resolved.
   * Data layers surface this as a configuration error instead of an empty list.
   */
  readonly isConfigured = computed(() => isUuid(this.businessId()) && isUuid(this.storeId()));

  /** Switch branch context (multi-store operators). */
  selectStore(storeId: string | null): void {
    this.selectedStoreId.set(isUuid(storeId) ? storeId : null);
  }

  /** Switch business context (multi-business operators). */
  selectBusiness(businessId: string | null): void {
    this.selectedBusinessId.set(isUuid(businessId) ? businessId : null);
  }

  private firstValidUuid(candidates: (string | null | undefined)[]): string {
    return candidates.find((value) => isUuid(value)) ?? '';
  }
}
