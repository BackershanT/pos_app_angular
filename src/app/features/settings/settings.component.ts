import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { uaeTrnValidator } from '../../shared/utils/validators';
import { formatTrn } from '../../shared/utils/formatters';
import { ThemePreference, ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  readonly themeService = inject(ThemeService);
  isSavedToastVisible = signal<boolean>(false);

  settingsForm = new FormGroup({
    businessName: new FormControl('AeroPOS Cafe LLC', [Validators.required]),
    taxNumber: new FormControl('100234892300003', [Validators.required, uaeTrnValidator()]),
    currency: new FormControl('AED', [Validators.required]),
    storeName: new FormControl('Dubai Mall Branch - Terminal 01', [Validators.required]),
    invoicePrefix: new FormControl('INV', [Validators.required]),
    storeAddress: new FormControl('Ground Floor, Financial Center Rd, Downtown Dubai, UAE'),
    allowNegativeStock: new FormControl(false),
    taxInclusivePricing: new FormControl(true),
    autoPrintReceipt: new FormControl(true),
    offlineSalesCache: new FormControl(true),
  });

  saveSettings() {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.isSavedToastVisible.set(true);
    setTimeout(() => {
      this.isSavedToastVisible.set(false);
    }, 3000);
  }

  setTheme(theme: ThemePreference): void {
    this.themeService.setTheme(theme);
  }
}
