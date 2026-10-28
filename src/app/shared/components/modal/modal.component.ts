import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="modal-backdrop" (click)="close.emit()">
        <div class="modal-panel glass-panel" [style.max-width]="maxWidth()" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ title() }}</h3>
            <button class="close-x" (click)="close.emit()">&times;</button>
          </div>

          <div class="modal-body">
            <ng-content select="[body]"></ng-content>
          </div>

          <div class="modal-footer">
            <ng-content select="[footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1500;
    }
    .modal-panel {
      width: 90%;
      background: #111827;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-header h3 { font-size: 1.15rem; color: #fff; margin: 0; }
    .close-x { background: none; border: none; color: var(--text-dim); font-size: 1.5rem; cursor: pointer; }
    .close-x:hover { color: #fff; }
    .modal-body { padding: 1.5rem; overflow-y: auto; max-height: 75vh; }
    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--border); background: var(--bg-surface); display: flex; justify-content: flex-end; gap: 0.75rem; }
  `],
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('Modal Dialog');
  maxWidth = input<string>('520px');

  close = output<void>();
}
