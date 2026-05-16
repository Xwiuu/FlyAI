/**
 * Extracts a JSON object/array from an LLM response, tolerating:
 * - ```json ... ``` or ``` ... ``` fenced blocks (anywhere in the string)
 * - Prose preamble/postamble around the JSON
 * - Nested braces/brackets (depth-tracking close, not lastIndexOf)
 */
export function extractJson<T = unknown>(raw: string): T {
  // 1. Strip all fenced code blocks (greedy, anywhere in the string).
  const stripped = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();

  // 2. Find the first { or [ in the stripped text.
  const firstObj = stripped.indexOf("{");
  const firstArr = stripped.indexOf("[");
  const start = (() => {
    if (firstObj === -1) return firstArr;
    if (firstArr === -1) return firstObj;
    return Math.min(firstObj, firstArr);
  })();

  if (start === -1) {
    throw new Error(`extractJson: no JSON found in response`);
  }

  const open = stripped[start] as "{" | "[";
  const close = open === "{" ? "}" : "]";

  // 3. Depth-track to find the matching closing character.
  //    This correctly handles nested objects/arrays and ignores
  //    braces/brackets inside string literals.
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error(
      `extractJson: could not find closing '${close}' (possible truncation). ` +
        `Raw length: ${raw.length} chars.`,
    );
  }

  const slice = stripped.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch (err) {
    throw new Error(`extractJson: invalid JSON — ${(err as Error).message}`);
  }
}
