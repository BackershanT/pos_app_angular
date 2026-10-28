import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';

/**
 * BarcodeInputDirective
 * Enhances input fields to handle handheld barcode scanners (USB/Bluetooth HID),
 * distinguishes between rapid hardware scanner bursts (< 60ms) and manual cashier typing,
 * and emits a clean scanned barcode event while automatically clearing the input for subsequent scans.
 *
 * @example
 * <input
 *   type="text"
 *   appBarcodeInput
 *   [autoClear]="true"
 *   [minBarcodeLength]="4"
 *   (barcodeScanned)="onBarcodeScanned($event)"
 *   placeholder="Scan barcode or SKU..."
 * />
 */
@Directive({
  selector: 'input[appBarcodeInput], [appBarcodeInput]',
  standalone: true,
})
export class BarcodeInputDirective {
  private readonly el = inject(ElementRef<HTMLInputElement>);

  /**
   * If true, clears the input field immediately after emitting a successful barcode.
   */
  readonly autoClear = input<boolean>(true);

  /**
   * Minimum valid character length for a barcode.
   */
  readonly minBarcodeLength = input<number>(3);

  /**
   * Whether pressing 'Enter' terminates and triggers barcode submission.
   */
  readonly triggerOnEnter = input<boolean>(true);

  /**
   * Maximum keystroke interval in ms to classify keystrokes as a hardware scanner burst.
   */
  readonly scannerThresholdMs = input<number>(60);

  /**
   * Prevent default Enter behavior (such as submitting enclosing forms).
   */
  readonly preventDefaultOnEnter = input<boolean>(true);

  /**
   * Emitted when a valid barcode is scanned or entered.
   */
  readonly barcodeScanned = output<string>();

  /**
   * Emitted when a rapid hardware scanner burst is detected.
   */
  readonly hardwareScanDetected = output<boolean>();

  private lastKeyTime = 0;
  private isFastBurst = false;
  private burstCharCount = 0;

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const currentTime = Date.now();
    const interval = currentTime - this.lastKeyTime;

    if (event.key === 'Enter') {
      if (this.triggerOnEnter()) {
        const inputElem = this.getInputElement();
        const rawValue = inputElem ? inputElem.value : '';
        const barcode = rawValue.trim();

        if (barcode.length >= this.minBarcodeLength()) {
          if (this.preventDefaultOnEnter()) {
            event.preventDefault();
            event.stopPropagation();
          }

          if (this.isFastBurst && this.burstCharCount >= this.minBarcodeLength()) {
            this.hardwareScanDetected.emit(true);
          }

          this.barcodeScanned.emit(barcode);

          if (this.autoClear()) {
            this.clearInput(inputElem);
          }
        }
      }

      this.resetBurst();
      return;
    }

    // Single character keystroke timing check
    if (event.key.length === 1) {
      if (this.lastKeyTime > 0 && interval <= this.scannerThresholdMs()) {
        this.burstCharCount++;
        if (this.burstCharCount >= 2) {
          this.isFastBurst = true;
        }
      } else if (interval > this.scannerThresholdMs()) {
        this.resetBurst();
      }

      this.lastKeyTime = currentTime;
    }
  }

  private resetBurst(): void {
    this.lastKeyTime = 0;
    this.isFastBurst = false;
    this.burstCharCount = 0;
  }

  private getInputElement(): HTMLInputElement | null {
    const native = this.el.nativeElement as HTMLElement;
    if (native instanceof HTMLInputElement) {
      return native;
    }
    return native?.querySelector ? (native.querySelector('input') as HTMLInputElement | null) : null;
  }

  private clearInput(inputElem: HTMLInputElement | null): void {
    if (!inputElem) return;

    inputElem.value = '';
    // Dispatch input and change events so Angular NgModel / ReactiveForms update their internal state
    inputElem.dispatchEvent(new Event('input', { bubbles: true }));
    inputElem.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
