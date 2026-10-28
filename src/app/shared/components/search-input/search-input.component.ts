import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-wrap" [style.width]="width()" [style.max-width]="maxWidth()">
      <i class="pi pi-search search-icon"></i>
      <input
        type="text"
        [value]="value()"
        [placeholder]="placeholder()"
        (input)="onInput($event)"
      />
      @if (value()) {
        <button class="clear-btn" (click)="clear()">
          <i class="pi pi-times"></i>
        </button>
      }
    </div>
  `,
  styles: [`
    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.95rem;
      color: var(--text-dim);
      font-size: 0.85rem;
      pointer-events: none;
    }
    input {
      width: 100%;
      height: 40px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0 2.4rem 0 2.5rem;
      color: var(--text-main);
      font-size: 0.85rem;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
    .clear-btn {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
    }
    .clear-btn:hover {
      color: var(--text-main);
    }
  `],
})
export class SearchInputComponent {
  value = input<string>('');
  placeholder = input<string>('Search...');
  width = input<string>('100%');
  maxWidth = input<string>('360px');

  valueChange = output<string>();

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }

  clear() {
    this.valueChange.emit('');
  }
}
