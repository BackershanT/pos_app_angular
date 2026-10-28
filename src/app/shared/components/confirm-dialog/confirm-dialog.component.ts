import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="dialog-backdrop" (click)="cancel.emit()">
        <div class="dialog-card glass-panel" (click)="$event.stopPropagation()">
          <div class="dialog-icon" [class]="type()">
            <i [class]="type() === 'danger' ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle'"></i>
          </div>

          <div class="dialog-content">
            <h3>{{ title() }}</h3>
            <p>{{ message() }}</p>
          </div>

          <div class="dialog-actions">
            <button class="btn-cancel" (click)="cancel.emit()">{{ cancelText() }}</button>
            <button class="btn-confirm" [class]="type()" (click)="confirm.emit()">{{ confirmText() }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    .dialog-card {
      width: 420px;
      padding: 1.75rem;
      text-align: center;
      background: #111827;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-lg);
    }
    .dialog-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
    }
    .dialog-icon.danger { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .dialog-icon.warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .dialog-icon.info { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .dialog-content h3 { font-size: 1.15rem; color: #fff; margin-bottom: 0.35rem; }
    .dialog-content p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; }
    .dialog-actions { display: flex; gap: 0.75rem; width: 100%; margin-top: 0.5rem; }
    .btn-cancel, .btn-confirm { flex: 1; padding: 0.75rem; border-radius: var(--radius-md); font-weight: 700; cursor: pointer; border: none; }
    .btn-cancel { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid var(--border); }
    .btn-confirm.danger { background: var(--danger); color: #fff; }
    .btn-confirm.warning { background: var(--warning); color: #111; }
    .btn-confirm.info { background: var(--primary); color: #fff; }
  `],
})
export class ConfirmDialogComponent {
  isOpen = input<boolean>(false);
  title = input<string>('Confirm Action');
  message = input<string>('Are you sure you want to proceed with this operation?');
  confirmText = input<string>('Confirm');
  cancelText = input<string>('Cancel');
  type = input<'danger' | 'warning' | 'info'>('danger');

  confirm = output<void>();
  cancel = output<void>();
}
