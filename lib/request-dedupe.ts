const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Share an identical request while it is pending. Results are deliberately
 * removed as soon as the request settles, so mutations never leave stale data
 * behind and later reads always reach Supabase again.
 */
export function dedupeRequest<T>(
  key: string,
  request: () => Promise<T>,
): Promise<T> {
  const existing = inFlightRequests.get(key);

  if (existing) {
    return existing as Promise<T>;
  }

  const pending = Promise.resolve().then(request);
  inFlightRequests.set(key, pending);

  void pending.finally(() => {
    if (inFlightRequests.get(key) === pending) {
      inFlightRequests.delete(key);
    }
  }).catch(() => {
    // The original promise is returned to callers, which handle its rejection.
  });

  return pending;
}
