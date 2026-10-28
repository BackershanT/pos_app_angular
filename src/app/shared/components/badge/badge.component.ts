import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [class]="variant()">
      @if (icon()) {
        <i [class]="icon()"></i>
      }
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-full);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .badge.success { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .badge.warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .badge.danger { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .badge.info { background: rgba(59, 130, 246, 0.15); color: #93c5fd; }
    .badge.neutral { background: rgba(255, 255, 255, 0.06); color: var(--text-muted); }
  `],
})
export class BadgeComponent {
  variant = input<BadgeVariant>('neutral');
  icon = input<string | null>(null);
}
