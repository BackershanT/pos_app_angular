import { Component, input, output } from '@angular/core';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { LoadState } from '../../utils/load-state.util';

/**
 * Renders the four mutually exclusive data lifecycle states for a section:
 * loading, error (with retry), empty (contextual copy) and ready (projected content).
 *
 * Usage:
 * ```html
 * <app-data-state [state]="listState" (retry)="load()" [isFiltered]="searchQuery().length > 0">
 *   <!-- only rendered when rows are available -->
 * </app-data-state>
 * ```
 */
@Component({
  selector: 'app-data-state',
  standalone: true,
  imports: [LoadingSpinnerComponent],
  templateUrl: './data-state.component.html',
  styleUrl: './data-state.component.css',
})
export class DataStateComponent {
  /** Lifecycle container owned by the host component. */
  readonly state = input.required<LoadState>();

  /** Applies "no results for your filters" copy instead of "nothing stored yet". */
  readonly isFiltered = input<boolean>(false);

  readonly loadingMessage = input<string>('Loading records...');
  readonly emptyTitle = input<string | null>(null);
  readonly emptyMessage = input<string | null>(null);
  readonly emptyIcon = input<string>('pi-inbox');
  readonly errorTitle = input<string>('Unable to load this data');
  readonly showRetry = input<boolean>(true);

  /** Emitted when the operator asks for the failed request to be re-attempted. */
  readonly retry = output<void>();

  /** Primary empty headline, honouring explicit input then reason-specific defaults. */
  resolvedEmptyTitle(): string {
    const explicit = this.emptyTitle();
    if (explicit) return explicit;

    if (this.isFiltered() || this.state().emptyReason() === 'no_results') {
      return 'No matching records';
    }
    if (this.state().emptyReason() === 'not_configured') {
      return 'This terminal is not configured';
    }
    return 'No records yet';
  }

  resolvedEmptyMessage(): string {
    const explicit = this.emptyMessage();
    if (explicit) return explicit;

    if (this.isFiltered() || this.state().emptyReason() === 'no_results') {
      return 'Nothing matches the current search or filters. Adjust or clear them to see all records.';
    }
    if (this.state().emptyReason() === 'not_configured') {
      return 'No store or business context is linked to this session, so records cannot be loaded. Sign in with a staff account.';
    }
    return 'The database is connected and returned zero rows for this branch. Create your first record to get started.';
  }

  /** Raw technical detail is surfaced only as a secondary hint for support triage. */
  errorDetail(): string {
    return this.state().error() ?? '';
  }

  onRetry(): void {
    this.retry.emit();
  }
}
