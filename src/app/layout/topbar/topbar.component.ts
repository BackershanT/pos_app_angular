import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AutoFocusDirective } from '../../shared/directives/auto-focus.directive';
import { BarcodeInputDirective } from '../../shared/directives/barcode-input.directive';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { LayoutService } from '../../core/services/layout.service';
import { RealtimeService } from '../../data-access/supabase/realtime.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, AutoFocusDirective, BarcodeInputDirective],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  readonly themeService = inject(ThemeService);
  readonly layout = inject(LayoutService);
  readonly realtime = inject(RealtimeService);

  currentTime = signal(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

  constructor() {
    setInterval(() => {
      this.currentTime.set(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
  }

  onBarcodeScanned(barcode: string): void {
    this.notification.info(`Barcode scanned: ${barcode}`, 'Hardware Scanner');
  }
}
