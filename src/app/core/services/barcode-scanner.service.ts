import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * BarcodeScannerService
 * Listens for hardware handheld barcode scanner inputs (USB/Bluetooth).
 * Scanners emulate keystrokes with < 50ms intervals terminated by Enter.
 */
@Injectable({
  providedIn: 'root',
})
export class BarcodeScannerService {
  private buffer = '';
  private lastKeyTime = 0;
  private readonly thresholdMs = 50; // Maximum time between keystrokes for hardware scanner
  private isListening = false;

  private readonly scannedBarcodeSubject = new Subject<string>();
  public readonly scannedBarcode$ = this.scannedBarcodeSubject.asObservable();
  public readonly lastScannedCode = signal<string | null>(null);

  constructor() {
    this.startListening();
  }

  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    window.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    this.isListening = true;
  }

  stopListening(): void {
    if (!this.isListening || typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.handleKeyDown.bind(this), true);
    this.isListening = false;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Ignore input if user is actively typing in a form input or textarea
    const target = event.target as HTMLElement;
    const isEditingForm = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    
    // Only capture scanner keystrokes
    const currentTime = Date.now();
    const interval = currentTime - this.lastKeyTime;

    if (event.key === 'Enter') {
      if (this.buffer.length >= 4 && interval < 100) {
        // Valid hardware barcode detected!
        event.preventDefault();
        event.stopPropagation();
        
        const code = this.buffer.trim();
        this.lastScannedCode.set(code);
        this.scannedBarcodeSubject.next(code);
      }
      this.buffer = '';
      return;
    }

    if (event.key.length === 1) {
      if (interval > this.thresholdMs && !isEditingForm) {
        // Reset buffer if delay is too long (human typing)
        this.buffer = '';
      }
      
      this.buffer += event.key;
      this.lastKeyTime = currentTime;
    }
  }
}
