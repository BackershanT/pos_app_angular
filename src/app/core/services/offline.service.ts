import { inject, Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { CompleteSaleRequest } from '../../data-access/models/order.model';
import { APP_STORAGE_KEYS } from '../config/app.config.constants';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class OfflineService {
  private readonly storage = inject(StorageService);
  private readonly notification = inject(NotificationService);

  public readonly isOnline = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  public readonly queuedSalesCount = signal<number>(0);

  constructor() {
    this.initNetworkListeners();
    this.refreshQueueCount();
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.notification.success('Network connection restored. Syncing pending sales...', 'Online');
      this.syncQueuedSales();
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.notification.warning('Internet disconnected. Transactions will be saved offline.', 'Offline Mode');
    });
  }

  queueSale(request: CompleteSaleRequest): void {
    const queue = this.getQueuedSales();
    queue.push(request);
    this.storage.setItem(APP_STORAGE_KEYS.OFFLINE_SALES_QUEUE, queue);
    this.refreshQueueCount();
  }

  getQueuedSales(): CompleteSaleRequest[] {
    return this.storage.getItem<CompleteSaleRequest[]>(APP_STORAGE_KEYS.OFFLINE_SALES_QUEUE, []) || [];
  }

  clearQueue(): void {
    this.storage.removeItem(APP_STORAGE_KEYS.OFFLINE_SALES_QUEUE);
    this.refreshQueueCount();
  }

  private refreshQueueCount(): void {
    this.queuedSalesCount.set(this.getQueuedSales().length);
  }

  async syncQueuedSales(): Promise<void> {
    const queue = this.getQueuedSales();
    if (queue.length === 0) return;

    // Triggered on network restore
    console.log(`Syncing ${queue.length} offline transactions...`);
  }
}
