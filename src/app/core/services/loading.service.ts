import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly activeRequests = signal<number>(0);
  public readonly isLoading = computed(() => this.activeRequests() > 0);

  startLoading(): void {
    this.activeRequests.update((count) => count + 1);
  }

  stopLoading(): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));
  }
}
