"use client"

import { useReveal } from "@/lib/hooks/useReveal"

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "var(--font-dm-sans)", fontSize: 15, color: "#0A0A0A" }}>
          <span style={{ color: "#1DB954", fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
          {item}
        </li>
      ))}
    </ul>
  )
}

function EmailVisual() {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 24, border: "1px solid #E8E8E8", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Email arrives</p>
      <div style={{ background: "#F0FAF4", borderRadius: 8, padding: "12px 14px", borderLeft: "3px solid #1DB954", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>From: anna.schmidt@gmail.com</div>
        <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>Bewerbung: Senior Developer</div>
        <div style={{ fontSize: 11, color: "#1DB954", marginTop: 3 }}>+ Lebenslauf.pdf attached</div>
      </div>
      <div style={{ textAlign: "center", fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "#1DB954", fontWeight: 600, marginBottom: 14 }}>&#8595; AI parses instantly</div>
      <div style={{ background: "#FAFAFA", borderRadius: 8, padding: "12px 14px", border: "1px solid #E8E8E8", display: "flex", alignItems: "center", gap: 12 }}>
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="15" fill="none" stroke="#E8E8E8" strokeWidth="3" />
          <circle cx="20" cy="20" r="15" fill="none" stroke="#1DB954" strokeWidth="3" strokeDasharray="81.6 94.2" strokeLinecap="round" transform="rotate(-90 20 20)" />
          <text x="20" y="25" textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: "#0A0A0A", fontFamily: "sans-serif" }}>87%</text>
        </svg>
        <div>
          <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>Anna Schmidt</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Frontend Dev · AI Screened</div>
        </div>
      </div>
    </div>
  )
}

function ScoreVisual() {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 24, border: "1px solid #E8E8E8", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="24" fill="none" stroke="#E8E8E8" strokeWidth="4" />
          <circle cx="30" cy="30" r="24" fill="none" stroke="#1DB954" strokeWidth="4" strokeDasharray="136.3 150.8" strokeLinecap="round" transform="rotate(-90 30 30)" />
          <text x="30" y="35" textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: "#0A0A0A", fontFamily: "sans-serif" }}>91%</text>
        </svg>
        <div>
          <div style={{ fontFamily: "var(--font-syne)", fontSize: 16, fontWeight: 700, color: "#0A0A0A" }}>Anna Weber</div>
          <div style={{ fontSize: 13, color: "#888" }}>Overall Match Score</div>
        </div>
      </div>
      {[["Hard Skills", 95], ["Experience", 88], ["Languages", 100], ["Culture Fit", 82]].map(([label, val]) => (
        <div key={String(label)} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#4A4A4A", marginBottom: 4 }}>
            <span>{String(label)}</span><span style={{ fontWeight: 600, color: "#0A0A0A" }}>{val}%</span>
          </div>
          <div style={{ height: 6, background: "#F0F0F0", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${val}%`, background: "#1DB954", borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmbedVisual() {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E8E8E8", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ background: "#F8F7F4", borderBottom: "1px solid #E8E8E8", padding: "9px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#FF5F57" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#FFBD2E" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#28C840" }} />
        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, color: "#999", marginLeft: 8 }}>careers.yourcompany.com</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ fontFamily: "var(--font-syne)", fontSize: 14, fontWeight: 700, color: "#0A0A0A", marginBottom: 3 }}>Senior Developer</div>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 14 }}>Fulltime · Vienna, Austria</div>
        <div style={{ background: "#F8F7F4", borderRadius: 8, padding: 14, border: "1px solid #E8E8E8" }}>
          <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Apply Now</div>
          <div style={{ height: 28, background: "#FFFFFF", border: "1px solid #E8E8E8", borderRadius: 5, marginBottom: 6 }} />
          <div style={{ height: 28, background: "#FFFFFF", border: "1px solid #E8E8E8", borderRadius: 5, marginBottom: 6 }} />
          <div style={{ height: 28, background: "#F0FAF4", border: "1px dashed #1DB954", borderRadius: 5, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: "#1DB954" }}>+ Upload CV</span>
          </div>
          <div style={{ background: "#1DB954", borderRadius: 5, padding: "8px 0", textAlign: "center" }}>
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, fontWeight: 600, color: "#FFFFFF" }}>Send Application</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CalendarVisual() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E8E8E8", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-syne)", fontSize: 14, fontWeight: 700, color: "#0A0A0A" }}>Interview: Anna Weber</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Senior Developer Role</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#1DB954", background: "#F0FAF4", border: "1px solid #1DB95440", padding: "3px 8px", borderRadius: 4 }}>&#10003; Confirmed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#4A4A4A" }}>
          <span>📅</span><span>Tuesday &middot; 14:00 – 14:45</span>
        </div>
      </div>
      <div style={{ background: "#F8F7F4", borderRadius: 12, padding: 18, border: "1px solid #E8E8E8" }}>
        <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Automated email preview</div>
        <div style={{ fontSize: 13, color: "#4A4A4A", lineHeight: 1.6 }}>
          <strong style={{ color: "#0A0A0A" }}>Your interview is confirmed</strong> for Tuesday at 14:00. A calendar invite has been sent. We look forward to meeting you!
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  { bg: "#F8F7F4", textLeft: true, icon: "📧", headline: "One email address.\nEvery application.\nAutomatically.", body: "Each job in REVETLY gets its own dedicated inbox. Post on Karriere.at, Indeed, or anywhere — every CV lands instantly in the right job container. No imports. No copy-paste. Nothing.", list: ["Auto-generated per job", "Routes to correct container", "CV parsed instantly by AI", "Works with any job board"], Visual: EmailVisual },
  { bg: "#FFFFFF", textLeft: false, icon: "🧠", headline: "AI that actually\nunderstands CVs.\nNot just keywords.", body: "REVETLY's matching engine reads experience, context, and real fit — across 9 weighted categories. Every candidate gets a score. You know exactly who to call.", list: ["9-category weighted scoring", "Configurable KO criteria", "Per-category breakdown", "AI recommendations included"], Visual: ScoreVisual },
  { bg: "#F0FAF4", textLeft: true, icon: "🔗", headline: "Your careers page,\npowered by REVETLY.", body: "Share a link or embed an application form directly on your website. One line of code. Candidates apply in seconds. Data flows straight into the right pipeline.", list: ["Shareable apply link per job", "Embeddable iFrame widget", "Branded for your company", "Mobile-optimized form"], Visual: EmbedVisual },
  { bg: "#FFFFFF", textLeft: false, icon: "📅", headline: "Interview confirmed.\nZero back-and-forth.", body: "REVETLY contacts your shortlisted candidates automatically, handles scheduling, sends confirmations and reminders. You get a calendar invite. That's the only email you need.", list: ["Automatic candidate outreach", "Self-serve scheduling link", "Reminders sent automatically", "Calendar sync included"], Visual: CalendarVisual },
]

export function FeaturesSection() {
  const ref = useReveal()
  return (
    <section id="features" ref={ref} style={{ background: "#FFFFFF", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div className="reveal" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#1DB954", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 16, textAlign: "center" }}>Features</div>
        <h2 className="reveal" style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(28px,3.4vw,44px)", fontWeight: 700, color: "#0A0A0A", lineHeight: 1.2, textAlign: "center", marginBottom: 64 }}>
          Everything you need.<br />Nothing you don&apos;t.
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {FEATURES.map((f, fi) => (
            <div key={fi} style={{ background: f.bg, borderRadius: 16, padding: "48px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
              <div className={f.textLeft ? "reveal-left" : "reveal-right"} style={{ order: f.textLeft ? 0 : 1 }}>
                <div style={{ fontSize: 30, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(20px,2vw,27px)", fontWeight: 700, color: "#0A0A0A", lineHeight: 1.3, marginBottom: 14, whiteSpace: "pre-line" }}>{f.headline}</h3>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 17, color: "#4A4A4A", lineHeight: 1.7, margin: 0 }}>{f.body}</p>
                <FeatureList items={f.list} />
              </div>
              <div className={f.textLeft ? "reveal-right" : "reveal-left"} style={{ order: f.textLeft ? 1 : 0 }}>
                <f.Visual />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
