import { CheckCircle2 } from "lucide-react"

// Renders a parsed job description (from /api/jobs/parse) with real structure:
// short "Überschrift:" lines become subheadings, "- " / "•" / "*" lines become
// check-marked bullet lists, blank lines separate sections, everything else is
// a paragraph. Degrades gracefully to a single paragraph for unstructured text,
// so legacy jobs stored as one blob still render (just without bullets).
export function formatJobDescription(text: string): React.ReactNode[] | null {
  if (!text?.trim()) return null

  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let key = 0

  const flushList = () => {
    if (currentList.length > 0) {
      const items = currentList
      elements.push(
        <ul key={key++} className="my-3 space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--rv-green-deep)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>,
      )
      currentList = []
    }
  }

  for (const raw of lines) {
    // Strip common markdown noise the model may still emit.
    const trimmed = raw.trim().replace(/\*\*/g, "").replace(/^#+\s*/, "")

    if (!trimmed) {
      flushList()
      continue
    }

    const bulletMatch = trimmed.match(/^[•\-*]\s+(.+)/)
    if (bulletMatch) {
      currentList.push(bulletMatch[1].trim())
      continue
    }

    // A short line that ends in a colon and isn't a full sentence = heading.
    if (trimmed.endsWith(":") && trimmed.length <= 60 && !/[.!?]\s/.test(trimmed)) {
      flushList()
      elements.push(
        <h4 key={key++} className="mb-2 mt-5 font-semibold text-foreground first:mt-0">
          {trimmed}
        </h4>,
      )
      continue
    }

    flushList()
    elements.push(
      <p key={key++} className="mb-3 leading-relaxed last:mb-0">
        {trimmed}
      </p>,
    )
  }

  flushList()
  return elements
}

export function FormattedJobDescription({ text, className }: { text: string; className?: string }) {
  const elements = formatJobDescription(text)
  if (!elements) return null
  return <div className={className}>{elements}</div>
}
