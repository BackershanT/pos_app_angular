import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  effect,
} from '@angular/core';

/**
 * AutoFocusDirective
 * Automatically focuses the host element (or its inner input) with optional delay,
 * text selection, and reactive condition support.
 *
 * @example
 * <!-- Default autofocus on render -->
 * <input type="text" appAutoFocus />
 *
 * <!-- Autofocus with full text selection (useful for overwriting numbers) -->
 * <input type="number" appAutoFocus [selectText]="true" />
 *
 * <!-- Conditional focus when modal/filter opens -->
 * <input [appAutoFocus]="isSearchOpen()" [focusDelay]="100" />
 */
@Directive({
  selector: '[appAutoFocus]',
  standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Boolean condition or true flag enabling focus.
   * Can be passed as boolean or truthy string.
   */
  readonly appAutoFocus = input<boolean | string>(true);

  /**
   * Delay in milliseconds before setting focus (essential for dialog animations).
   */
  readonly focusDelay = input<number>(50);

  /**
   * If true, selects all text within the input upon focus.
   */
  readonly selectText = input<boolean>(false);

  /**
   * Options passed to HTMLElement.focus({ preventScroll: ... })
   */
  readonly preventScroll = input<boolean>(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearTimer();
    });

    // Reactively trigger focus whenever appAutoFocus becomes truthy
    effect(() => {
      const condition = this.appAutoFocus();
      const shouldFocus = condition === true || condition === '' || condition === 'true';

      if (shouldFocus) {
        this.scheduleFocus();
      }
    });
  }

  ngAfterViewInit(): void {
    const condition = this.appAutoFocus();
    const shouldFocus = condition === true || condition === '' || condition === 'true';

    if (shouldFocus) {
      this.scheduleFocus();
    }
  }

  private scheduleFocus(): void {
    this.clearTimer();

    this.timeoutId = setTimeout(() => {
      this.applyFocus();
    }, this.focusDelay());
  }

  private applyFocus(): void {
    const nativeElement = this.el.nativeElement as HTMLElement;
    if (!nativeElement) return;

    // Find target focusable element (either host itself or first child input/button/select/textarea)
    let target = nativeElement;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      const focusableChild = nativeElement.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableChild) {
        target = focusableChild;
      }
    }

    if (typeof target.focus === 'function') {
      target.focus({ preventScroll: this.preventScroll() });

      if (this.selectText() && target instanceof HTMLInputElement) {
        target.select();
      }
    }
  }

  private clearTimer(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
