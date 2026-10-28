import { computed, Injectable, signal } from '@angular/core';

/**
 * Explicit asynchronous lifecycle for any data-backed screen.
 *
 * Every feature must be able to answer four distinct questions instead of
 * collapsing them into "empty array":
 *   idle / loading / ready / empty / error.
 */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/** Why a collection rendered no rows - the copy differs for each case. */
export type EmptyReason = 'no_data' | 'no_results' | 'not_configured';

export interface LoadOptions {
  /**
   * Background refresh: keeps the previous status/data visible and only reports
   * failures, so an opportunistic reload never blanks a working screen.
   */
  silent?: boolean;
  /** Label used when the task resolves zero rows. */
  emptyReason?: EmptyReason;
}

export interface LoadResult {
  status: LoadStatus;
  ok: boolean;
}

/**
 * Standalone signal container for one load operation.
 * One instance per screen (or per independent panel on a screen).
 */
@Injectable({ providedIn: 'root' })
export class LoadState {
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _error = signal<string | null>(null);
  private readonly _emptyReason = signal<EmptyReason>('no_data');

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly emptyReason = this._emptyReason.asReadonly();

  readonly isLoading = computed(() => this._status() === 'loading');
  readonly hasFailed = computed(() => this._status() === 'error');
  readonly isEmpty = computed(() => this._status() === 'empty');
  readonly isReady = computed(() => this._status() === 'ready');
  /** True until the first load attempt settles - used to gate empty-state copy. */
  readonly hasSettled = computed(() => this._status() !== 'idle');

  /**
   * Executes a loader task. `task` must return `true` when it produced rows.
   * Errors are captured into observable state (never rethrown) so callers can
   * render a retry affordance instead of falling back to placeholder data.
   */
  async run(task: () => Promise<boolean>, options: LoadOptions = {}): Promise<LoadResult> {
    const isSilent = options.silent === true;
    if (!isSilent) {
      this._status.set('loading');
      this._error.set(null);
    }

    try {
      const hasData = await task();

      if (hasData) {
        this._status.set('ready');
      } else if (!isSilent) {
        this._emptyReason.set(options.emptyReason ?? 'no_data');
        this._status.set('empty');
      }

      return { status: this._status(), ok: true };
    } catch (err) {
      const message = describeError(err);
      this._error.set(message);
      if (!isSilent) {
        this._status.set('error');
      }
      return { status: this._status(), ok: false };
    }
  }

  /** Forces a specific state (e.g. configuration missing before any request). */
  fail(message: string): void {
    this._error.set(message);
    this._status.set('error');
  }

  markEmpty(reason: EmptyReason = 'no_data'): void {
    this._emptyReason.set(reason);
    this._error.set(null);
    this._status.set('empty');
  }

  markReady(): void {
    this._error.set(null);
    this._status.set('ready');
  }

  reset(): void {
    this._status.set('idle');
    this._error.set(null);
  }
}

/**
 * Translates Postgres/PostgREST/network failures into operator-facing copy.
 * Raw database strings are never shown to cashiers, but the cause class must be
 * distinguishable so support can triage from a screenshot.
 */
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err ?? 'Unknown error');
  }

  const message = err.message || 'Unknown error';
  const lower = message.toLowerCase();

  // Network layer down (SDK throws TypeError: Failed to fetch).
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return 'Cannot reach the cloud backend. The register keeps working offline for cached records only.';
  }

  // Session expiry / invalid credentials.
  if (lower.includes('jwt expired') || lower.includes('invalid login-token') || lower.includes('new row violates row-level security')) {
    return 'Your session is not permitted to read this data. Please sign in again.';
  }

  // Tenant identifier is not a UUID (22P02) - misconfiguration, not user error.
  if (lower.includes('invalid input syntax for type uuid')) {
    return 'The active store or business is not configured correctly, so no records could be matched.';
  }

  // Missing relation / stale schema (42P01, 42703).
  if (lower.includes('does not exist') || lower.includes('could not find the relationship')) {
    return 'The database schema is out of date with this build. Ask an administrator to apply the latest migration.';
  }

  // .single() with zero rows (PGRST116).
  if (lower.includes('json object requested') || lower.includes('no rows')) {
    return 'The requested record was not found.';
  }

  // Permission denied (42501).
  if (lower.includes('permission denied')) {
    return 'You do not have permission to view this data.';
  }

  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'The backend took too long to respond. Please retry.';
  }

  return message;
}
