import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-wrap" [style.width]="width()">
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
      left: 0.85rem;
      color: var(--text-dim);
      font-size: 0.85rem;
    }
    input {
      width: 100%;
      height: 38px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0 2.2rem 0 2.3rem;
      color: var(--text-main);
      font-size: 0.825rem;
      outline: none;
      transition: all 0.2s;
    }
    input:focus {
      border-color: var(--primary);
      background: rgba(255, 255, 255, 0.07);
    }
    .clear-btn {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0.2rem;
    }
    .clear-btn:hover { color: #fff; }
  `],
})
export class SearchInputComponent {
  value = input<string>('');
  placeholder = input<string>('Search...');
  width = input<string>('320px');

  valueChange = output<string>();

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }

  clear() {
    this.valueChange.emit('');
  }
}
