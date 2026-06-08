export function TrustLogos() {
  const companies = ["Talent.io", "Karriere.at", "StepStone", "Indeed", "Personio", "HR.tech"]

  return (
    <section style={{ background: "#FFFFFF", padding: "52px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#A0A0A0", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 36 }}>
          Trusted by recruiting teams across DACH
        </p>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
          {companies.map((name) => (
            <span
              key={name}
              style={{ fontFamily: "var(--font-syne)", fontSize: 18, fontWeight: 700, color: "#0A0A0A", opacity: 0.3, transition: "opacity 0.2s", cursor: "default", letterSpacing: "0.04em" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.65" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.3" }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
