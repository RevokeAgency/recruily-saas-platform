"use client"

/* Reusable green score ring used across product mockups */
export function ScoreRing({
  score,
  size = 44,
  stroke = 4,
  label,
}: {
  score: number
  size?: number
  stroke?: number
  label?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E0E0DC" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#1DB954"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <span
          className="absolute font-syne font-bold text-[#0A0A0A]"
          style={{ fontSize: size * 0.28 }}
        >
          {score}
        </span>
      </span>
      {label ? <span className="font-dm-sans text-[10px] text-[#6B6B6B]">{label}</span> : null}
    </span>
  )
}

type Candidate = { name: string; role: string; score: number }

/* The REVETLY dashboard mockup — a white card with a job pipeline */
export function DashboardMockup({ className = "" }: { className?: string }) {
  const candidates: Candidate[] = [
    { name: "Anna Bauer", role: "Senior Developer", score: 94 },
    { name: "Lukas Weber", role: "Senior Developer", score: 89 },
    { name: "Marie Hofer", role: "Senior Developer", score: 82 },
  ]
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#E0E0DC] bg-white rv-soft-shadow ${className}`}
    >
      {/* top bar */}
      <div className="flex items-center gap-2 border-b border-[#E0E0DC] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E0E0DC]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E0E0DC]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E0E0DC]" />
        <span className="ml-3 rv-eyebrow text-[#6B6B6B]">REVETLY · Pipeline</span>
      </div>
      <div className="p-4">
        {/* job header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-syne text-sm font-bold text-[#0A0A0A]">Senior Developer</p>
            <p className="font-dm-sans text-xs text-[#6B6B6B]">Vienna · 47 applications</p>
          </div>
          <span className="rounded-full bg-[#1DB954]/10 px-2.5 py-1 font-dm-sans text-[11px] font-semibold text-[#158A3E]">
            Active
          </span>
        </div>
        {/* candidate rows */}
        <div className="flex flex-col gap-2">
          {candidates.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between rounded-xl border border-[#E0E0DC] bg-[#F2F2F0] px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A0A0A] font-syne text-xs font-bold text-white">
                  {c.name.charAt(0)}
                </span>
                <div>
                  <p className="font-dm-sans text-xs font-semibold text-[#0A0A0A]">{c.name}</p>
                  <p className="font-dm-sans text-[11px] text-[#6B6B6B]">{c.role}</p>
                </div>
              </div>
              <ScoreRing score={c.score} size={38} stroke={3.5} />
            </div>
          ))}
        </div>
        {/* status footer */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#1DB954]/10 px-3 py-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1DB954] text-[10px] text-white">
            ✓
          </span>
          <span className="font-dm-sans text-[11px] font-medium text-[#158A3E]">
            Interview confirmed with Anna Bauer
          </span>
        </div>
      </div>
    </div>
  )
}
