export const LLM_TIMEOUT_MS = 15_000;

export type CallResult<T> =
  | { ok: true; value: T; duration_ms: number }
  | { ok: false; error: Error; duration_ms: number; timedOut: boolean };

/**
 * Runs `fn(signal)` with a hard timeout. Never throws — returns a discriminated
 * result so the router can decide whether to fall back without unwinding.
 */
export async function callWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = LLM_TIMEOUT_MS,
): Promise<CallResult<T>> {
  const controller = new AbortController();
  const start = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const value = await fn(controller.signal);
    return { ok: true, value, duration_ms: Date.now() - start };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const timedOut = error.name === "AbortError" || controller.signal.aborted;
    return { ok: false, error, duration_ms: Date.now() - start, timedOut };
  } finally {
    clearTimeout(timer);
  }
}
