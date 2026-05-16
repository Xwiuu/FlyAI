// Lightweight markdown-to-HTML without external deps.
// Handles: headings, bold, italic, code, blockquote, unordered lists, hr, paragraphs.
export function renderMarkdown(md: string): string {
  const lines = md.split("\n")
  const out: string[] = []
  let inList = false

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  const inline = (s: string) =>
    escape(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, '<code class="text-xs font-mono bg-muted px-1 rounded">$1</code>')

  for (const raw of lines) {
    const line = raw.trimEnd()

    // Heading
    const h = line.match(/^(#{1,3})\s+(.+)/)
    if (h && h[1] && h[2]) {
      if (inList) { out.push("</ul>"); inList = false }
      const lvl = h[1].length
      const tag = `h${lvl + 2}` // h1→h3, h2→h4, h3→h5 (visual hierarchy below page title)
      const cls =
        lvl === 1
          ? "text-base font-semibold mt-6 mb-2"
          : lvl === 2
          ? "text-sm font-semibold mt-4 mb-1 text-muted-foreground uppercase tracking-widest"
          : "text-sm font-medium mt-3 mb-1"
      out.push(`<${tag} class="${cls}">${inline(h[2])}</${tag}>`)
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false }
      out.push('<hr class="my-4 border-border" />')
      continue
    }

    // Blockquote
    const bq = line.match(/^>\s?(.*)/)
    if (bq && bq[1] !== undefined) {
      if (inList) { out.push("</ul>"); inList = false }
      out.push(`<blockquote class="border-l-2 border-border pl-4 text-muted-foreground italic text-sm my-2">${inline(bq[1])}</blockquote>`)
      continue
    }

    // List item
    const li = line.match(/^[-*]\s+(.+)/)
    if (li && li[1]) {
      if (!inList) { out.push('<ul class="list-disc list-inside space-y-0.5 text-sm my-2">'); inList = true }
      out.push(`<li>${inline(li[1])}</li>`)
      continue
    }

    // Close list
    if (inList && line.trim() === "") {
      out.push("</ul>")
      inList = false
    }

    // Empty line → paragraph break
    if (line.trim() === "") {
      out.push('<div class="h-3" />')
      continue
    }

    // Paragraph
    out.push(`<p class="text-sm leading-relaxed">${inline(line)}</p>`)
  }

  if (inList) out.push("</ul>")
  return out.join("\n")
}
