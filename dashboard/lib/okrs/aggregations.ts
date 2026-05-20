import { createClient } from "@/lib/supabase/server"

export type OkrSource = "mrr_income" | "posts_generated" | "retention_rate"

const SOURCES: OkrSource[] = ["mrr_income", "posts_generated", "retention_rate"]

export function isOkrSource(v: unknown): v is OkrSource {
  return typeof v === "string" && (SOURCES as string[]).includes(v)
}

/**
 * Convert a free-form quarter label (e.g. "Q2 2026", "2026-Q2", "Q2-2026")
 * into the first day of that quarter as ISO date. Returns null if unparseable.
 */
function quarterStart(quarter: string): string | null {
  const match = quarter.match(/(?:Q\s*([1-4]).*?(\d{4}))|(?:(\d{4}).*?Q\s*([1-4]))/i)
  if (!match) return null
  const q = Number(match[1] ?? match[4])
  const year = Number(match[2] ?? match[3])
  if (!q || !year) return null
  const month = (q - 1) * 3
  const d = new Date(Date.UTC(year, month, 1))
  return d.toISOString().slice(0, 10)
}

/**
 * Resolve the live `current` value for a given KR source against Supabase.
 * Returns null on any error / missing inputs so the caller can fall back
 * to the static JSONB value.
 */
export async function resolveKrCurrent(
  source: OkrSource,
  quarter: string,
): Promise<number | null> {
  const start = quarterStart(quarter)
  if (!start) return null

  const supabase = createClient()

  try {
    if (source === "mrr_income") {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "income")
        .gte("date", start)
      if (error) return null
      return (data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
    }

    if (source === "posts_generated") {
      const { count, error } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .in("status", ["approved", "pending"])
        .gte("created_at", `${start}T00:00:00Z`)
      if (error) return null
      return count ?? 0
    }

    if (source === "retention_rate") {
      const { data, error } = await supabase
        .from("clients")
        .select("lifecycle_stage")
      if (error) return null
      const rows = data ?? []
      if (rows.length === 0) return 0
      const retained = rows.filter(
        (r) => r.lifecycle_stage !== "churned",
      ).length
      return Math.round((retained / rows.length) * 100)
    }
  } catch (err) {
    console.error("[resolveKrCurrent] failed:", err)
    return null
  }

  return null
}
