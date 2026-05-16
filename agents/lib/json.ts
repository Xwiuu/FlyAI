/**
 * Extracts a JSON object/array from an LLM response, tolerating accidental
 * ```json ... ``` wrapping or surrounding prose.
 */
export function extractJson<T = unknown>(raw: string): T {
  const trimmed = raw.trim();

  // Strip fenced code blocks if present.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced?.[1] ?? trimmed;

  // Find the first {...} or [...] span.
  const firstObj = body.indexOf("{");
  const firstArr = body.indexOf("[");
  const start = (() => {
    if (firstObj === -1) return firstArr;
    if (firstArr === -1) return firstObj;
    return Math.min(firstObj, firstArr);
  })();

  if (start === -1) {
    throw new Error(`extractJson: no JSON found in response`);
  }

  const open = body[start];
  const close = open === "{" ? "}" : "]";
  const end = body.lastIndexOf(close);
  if (end === -1 || end < start) {
    throw new Error(`extractJson: unbalanced ${open}${close} in response`);
  }

  const slice = body.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch (err) {
    throw new Error(`extractJson: invalid JSON — ${(err as Error).message}`);
  }
}
