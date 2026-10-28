const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Type guard for PostgreSQL `uuid` columns.
 *
 * Passing a non-UUID tenant identifier to PostgREST is never an error - it simply
 * matches zero rows on read (and raises 22P02 on write), which is how misconfigured
 * stores render "empty" data that looks legitimate. Validate before querying.
 */
export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** Throws a descriptive error when a required UUID parameter is malformed. */
export function assertUuid(value: string | null | undefined, label: string): string {
  if (!isUuid(value)) {
    throw new Error(`${label} is missing or not a valid UUID - the active branch/business context is not configured.`);
  }
  return value;
}
