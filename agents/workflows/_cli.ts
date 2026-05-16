import { logAgent } from "../lib/logger.js";

/**
 * Wraps a workflow main function with global error reporting + process exit.
 * Use at the bottom of each workflow file:
 *
 *   if (import.meta.url === `file://${process.argv[1]}`) {
 *     runCli("daily-brief", runDailyBrief);
 *   }
 */
export function runCli<T>(name: string, fn: () => Promise<T>): void {
  const started = Date.now();
  fn()
    .then((result) => {
      const duration = Date.now() - started;
      console.log(`[workflow:${name}] ok in ${duration}ms`);
      if (result !== undefined) console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      const duration = Date.now() - started;
      const message = err instanceof Error ? err.stack ?? err.message : String(err);
      console.error(`[workflow:${name}] FAILED in ${duration}ms`);
      console.error(message);
      await logAgent({
        agent: "ceo",
        action: `workflow.${name}.crash`,
        status: "error",
        error: message,
        duration_ms: duration,
      });
      process.exit(1);
    });
}

export function isMain(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  // Normalize Windows paths.
  const normalized = entry.replace(/\\/g, "/");
  return metaUrl.endsWith(normalized) || metaUrl === `file:///${normalized}`;
}
