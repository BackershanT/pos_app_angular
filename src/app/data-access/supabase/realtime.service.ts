import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.client';

export type RealtimeConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

@Injectable({
  providedIn: 'root',
})
export class RealtimeService implements OnDestroy {
  private readonly supabase = getSupabaseClient();
  private channel: RealtimeChannel | null = null;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  /**
   * Realtime Connection State Signal
   */
  readonly status = signal<RealtimeConnectionStatus>('connecting');
  readonly lastConnectedAt = signal<Date | null>(null);

  /**
   * Convenience Computed Signals
   */
  readonly isConnected = computed(() => this.status() === 'connected');
  readonly isConnecting = computed(() => this.status() === 'connecting');
  readonly isDisconnected = computed(() => this.status() === 'disconnected' || this.status() === 'error');

  /**
   * Formatted status label for the UI
   */
  readonly statusText = computed(() => {
    switch (this.status()) {
      case 'connected':
        return 'Connected Successfully · Realtime';
      case 'connecting':
        return 'Connecting Realtime...';
      case 'error':
        return 'Realtime Error';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  });

  /**
   * Status color class:
   * - connected: green
   * - connecting: orange
   * - disconnected / error: red
   */
  readonly colorClass = computed(() => {
    switch (this.status()) {
      case 'connected':
        return 'status-green';
      case 'connecting':
        return 'status-orange';
      case 'error':
      case 'disconnected':
      default:
        return 'status-red';
    }
  });

  constructor() {
    this.initRealtime();
    this.registerNetworkListeners();
  }

  /**
   * Initializes WebSocket connection to Supabase Realtime channel
   */
  private initRealtime() {
    try {
      this.status.set('connecting');

      // Create a unique channel for POS register realtime synchronization
      this.channel = this.supabase.channel('aeropos-realtime-hub', {
        config: {
          broadcast: { self: true },
          presence: { key: 'pos-terminal' },
        },
      });

      this.channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          this.status.set('connected');
          this.lastConnectedAt.set(new Date());
        } else if (status === 'TIMED_OUT') {
          this.status.set('connecting');
        } else if (status === 'CHANNEL_ERROR') {
          this.status.set('error');
        } else if (status === 'CLOSED') {
          this.status.set('disconnected');
        }
      });
    } catch (e) {
      this.status.set('error');
    }
  }

  /**
   * Reconnects Realtime channel manually or upon network recovery
   */
  reconnect() {
    if (this.channel) {
      try {
        this.supabase.removeChannel(this.channel);
      } catch {
        // Ignore cleanup error
      }
      this.channel = null;
    }
    this.initRealtime();
  }

  private registerNetworkListeners() {
    if (typeof window !== 'undefined') {
      this.onlineHandler = () => {
        this.reconnect();
      };
      this.offlineHandler = () => {
        this.status.set('disconnected');
      };

      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      if (this.onlineHandler) window.removeEventListener('online', this.onlineHandler);
      if (this.offlineHandler) window.removeEventListener('offline', this.offlineHandler);
    }
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
