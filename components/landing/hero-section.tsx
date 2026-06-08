"use client"

import Link from "next/link"

export function HeroSection() {
  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeLeft {
          from { opacity:0; transform:translateX(-20px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes slideRight {
          from { opacity:0; transform:translateX(60px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes bounceIn {
          0%   { opacity:0; transform:translateY(20px) scale(0.96); }
          60%  { transform:translateY(-5px) scale(1.02); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes float-y {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-8px); }
        }
        @keyframes draw-line {
          from { stroke-dashoffset:400; }
          to   { stroke-dashoffset:0; }
        }
        .h-eyebrow  { animation:fadeLeft 0.5s ease forwards 0.3s; opacity:0; }
        .h-headline { animation:fadeUp 0.5s ease forwards 0.35s; opacity:0; }
        .h-underline path { animation:draw-line 0.9s ease forwards 0.8s; }
        .h-sub      { animation:fadeUp 0.5s ease forwards 0.6s; opacity:0; }
        .h-cta      { animation:fadeUp 0.5s ease forwards 0.8s; opacity:0; }
        .h-badges   { animation:fadeUp 0.5s ease forwards 1.0s; opacity:0; }
        .h-mockup   { animation:slideRight 0.7s ease forwards 0.4s; opacity:0; }
        .h-notif    { animation:bounceIn 0.6s ease forwards 1.2s; opacity:0; }
        .h-float    { animation:float-y 3s ease-in-out infinite 1.8s; }
        .rv-btn-primary {
          display:inline-block; font-size:16px; font-weight:600;
          color:#FFFFFF; background:#1DB954; padding:14px 28px;
          border-radius:6px; text-decoration:none; transition:all 0.2s;
          font-family:var(--font-dm-sans);
        }
        .rv-btn-primary:hover { background:#158A3E; transform:scale(1.02); box-shadow:0 8px 24px rgba(29,185,84,0.35); }
        .rv-btn-ghost { font-size:16px; font-weight:500; color:#0A0A0A; text-decoration:none; transition:all 0.2s; font-family:var(--font-dm-sans); }
        .rv-btn-ghost:hover { text-decoration:underline; }
      `}</style>

      <section style={{ backgroundColor: "#FFFFFF", paddingTop: 64 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "80px 24px 72px", display: "grid", gridTemplateColumns: "55fr 45fr", gap: 56, alignItems: "center" }}>

          {/* LEFT */}
          <div>
            {/* Eyebrow */}
            <div className="h-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1DB954", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#1DB954", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                AI-Powered Recruiting Platform
              </span>
            </div>

            {/* Headline */}
            <h1 className="h-headline" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(40px,5.2vw,66px)", lineHeight: 1.1, color: "#0A0A0A", fontWeight: 700, marginBottom: 0 }}>
              Automate Your<br />Entire Recruiting<br />Pipeline.
            </h1>

            {/* Wavy underline */}
            <div className="h-underline" style={{ marginBottom: 28, marginTop: 8 }}>
              <svg width="300" height="12" viewBox="0 0 300 12" fill="none">
                <path d="M2 8 C38 2,76 12,114 6 S190 2,228 8 S282 12,298 6" stroke="#1DB954" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="400" strokeDashoffset="400" />
              </svg>
            </div>

            {/* Subline */}
            <p className="h-sub" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 18, lineHeight: 1.7, color: "#4A4A4A", maxWidth: 480, marginBottom: 40 }}>
              REVETLY handles everything from application to confirmed interview — automatically. Your team focuses on what actually matters: the conversation.
            </p>

            {/* CTAs */}
            <div className="h-cta" style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", marginBottom: 28 }}>
              <Link href="/auth" className="rv-btn-primary">Get Started Free</Link>
              <Link href="#how-it-works" className="rv-btn-ghost">Watch Demo &rarr;</Link>
            </div>

            {/* Trust badges */}
            <div className="h-badges" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#4A4A4A", display: "flex", flexWrap: "wrap", gap: 0, alignItems: "center" }}>
              {["DSGVO-compliant", "EU servers", "Setup in 5 min", "No credit card"].map((b, i) => (
                <span key={b} style={{ display: "inline-flex", alignItems: "center" }}>
                  <span style={{ color: "#1DB954", fontWeight: 700 }}>&#10003;</span>&nbsp;{b}
                  {i < 3 && <span style={{ margin: "0 10px", color: "#D0D0D0" }}>&middot;</span>}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT — Mockup */}
          <div style={{ position: "relative" }}>
            {/* Green tint blob */}
            <div style={{ position: "absolute", inset: -28, background: "#F0FAF4", borderRadius: 32, zIndex: 0 }} />

            {/* Dashboard card */}
            <div className="h-mockup" style={{ position: "relative", zIndex: 1, background: "#FFFFFF", borderRadius: 16, boxShadow: "0 32px 80px rgba(0,0,0,0.14)", transform: "rotate(-2deg)", border: "1px solid #E8E8E8", overflow: "hidden" }}>
              {/* Browser bar */}
              <div style={{ background: "#F8F7F4", borderBottom: "1px solid #E8E8E8", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "#999", marginLeft: 8 }}>REVETLY · Dashboard</span>
              </div>

              <div style={{ display: "flex", height: 330 }}>
                {/* Sidebar */}
                <div style={{ width: 120, background: "#F8F7F4", borderRight: "1px solid #E8E8E8", padding: "12px 0", flexShrink: 0 }}>
                  {[["Senior Dev", 12, true], ["UX Designer", 7, false], ["Sales Lead", 4, false], ["Data Eng.", 9, false]].map(([job, n, active]) => (
                    <div key={String(job)} style={{ padding: "9px 12px", borderLeft: active ? "2px solid #1DB954" : "2px solid transparent", background: active ? "#F0FAF4" : "transparent" }}>
                      <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, fontWeight: 600, color: active ? "#1DB954" : "#666" }}>{String(job)}</div>
                      <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>{String(n)} candidates</div>
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
                  <div style={{ fontFamily: "var(--font-syne)", fontSize: 12, fontWeight: 700, color: "#0A0A0A", marginBottom: 10 }}>Senior Developer · 12 candidates</div>
                  {[
                    { name: "Markus H.", role: "Full Stack Eng.", score: 92, status: "AI Screened", sc: "#1DB954", sb: "#F0FAF4" },
                    { name: "Anna W.", role: "Frontend Dev", score: 89, status: "Interview Set", sc: "#1DB954", sb: "#FFFFFF" },
                    { name: "Thomas K.", role: "Backend Eng.", score: 76, status: "AI Screened", sc: "#1DB954", sb: "#F0FAF4" },
                    { name: "Julia P.", role: "DevOps", score: 64, status: "Pending", sc: "#888", sb: "#F5F5F5" },
                  ].map((c) => (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, marginBottom: 5, background: "#FAFAFA", border: "1px solid #F0F0F0" }}>
                      <svg width="34" height="34" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#E8E8E8" strokeWidth="3" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#1DB954" strokeWidth="3" strokeDasharray={`${(c.score / 100) * 87.96} 87.96`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                        <text x="18" y="22" textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: "#0A0A0A", fontFamily: "sans-serif" }}>{c.score}</text>
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, fontWeight: 600, color: "#0A0A0A" }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: "#888" }}>{c.role}</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, color: c.sc, background: c.sb, border: `1px solid ${c.sc}40`, padding: "2px 5px", borderRadius: 4, whiteSpace: "nowrap" }}>{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating notification */}
            <div className="h-notif h-float" style={{ position: "absolute", bottom: -14, left: -20, zIndex: 2, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderLeft: "3px solid #1DB954", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 10, padding: "11px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", minWidth: 210 }}>
              <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, color: "#888", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>New match found</div>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: 13, fontWeight: 700, color: "#0A0A0A" }}>Sarah K. &mdash; <span style={{ color: "#1DB954" }}>94% match</span></div>
              <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "#4A4A4A", marginTop: 2 }}>Frontend Developer</div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
