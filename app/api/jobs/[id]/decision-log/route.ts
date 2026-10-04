import { NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// ─────────────────────────────────────────────────────────────────────────────
// Entscheidungsprotokoll einer Stelle als CSV (KI-Verordnung Art. 12 und 26).
//
// Teil 1: jede Bewerbung mit dem, was die Match Analyse geliefert hat
//         (Analysewert, Gespräch, Match, K.-o., Modell, Befunde) und dem
//         aktuellen Stand der Entscheidung.
// Teil 2: jedes protokollierte Ereignis (decision_events, Migration 031):
//         wer hat wann welchen Status gesetzt, Gespräche bewertet, Absagen
//         verschickt, die Prüfung bestätigt, die Stelle abgeschlossen.
//
// Semikolon und BOM, damit Excel im deutschsprachigen Raum die Datei direkt
// richtig öffnet. Nur eigene Stellen (RLS und user_id-Filter).
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_LABEL: Record<string, string> = {
  status_geaendert: "Status geändert",
  gespraech_bewertet: "Gespräch bewertet",
  absage_verschickt: "Absage verschickt",
  pruefung_bestaetigt: "Menschliche Prüfung bestätigt",
  stelle_abgeschlossen: "Stelle abgeschlossen",
  an_fachbereich_gesendet: "An Fachbereich gesendet",
  rueckmeldung_fachbereich: "Rückmeldung Fachbereich",
  report_erstellt: "Report erstellt",
}

const SOURCE_LABEL: Record<string, string> = {
  public_page: "Stellenseite",
  email: "E-Mail",
}

/** CSV-Zelle: Anführungszeichen verdoppeln, Formel-Einschleusung verhindern. */
function cell(v: unknown): string {
  if (v == null) return ""
  let s = typeof v === "string" ? v : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function row(values: unknown[]): string {
  return values.map(cell).join(";")
}

function when(iso: string | null | undefined): string {
  if (!iso) return ""
  return new Date(iso).toLocaleString("de-AT", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" })
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const { data: job } = await supabase
      .from("jobs")
      .select("id, title, company, created_at, is_active")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single()
    if (!job) return Response.json({ error: "Stelle nicht gefunden" }, { status: 404 })

    const { data: links } = await supabase
      .from("job_candidates")
      .select("*, candidate:candidates(*)")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    // Ohne Migration 031 gibt es keine Ereignisse, der Export bleibt nutzbar.
    const { data: events, error: eventsError } = await supabase
      .from("decision_events")
      .select("created_at, actor_id, job_candidate_id, event, detail")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = (links ?? []) as any[]
    const nameOf = new Map<string, string>(
      list.map((l) => [l.id as string, (one(l.candidate) as { full_name?: string } | null)?.full_name || ""]),
    )
    const actor = (id: string | null) => (!id ? "System" : id === user.id ? user.email || "du" : `Nutzer ${id.slice(0, 8)}`)

    const lines: string[] = []
    lines.push(row(["Entscheidungsprotokoll", `${job.title} · ${job.company}`]))
    lines.push(row(["Stelle angelegt", when(job.created_at)]))
    lines.push(row(["Status der Stelle", job.is_active ? "offen" : "abgeschlossen"]))
    lines.push(row(["Exportiert", when(new Date().toISOString()), "von", user.email ?? ""]))
    lines.push(
      row([
        "Hinweis",
        "Die Match Analyse ist eine Entscheidungshilfe. Einladungen, Einstellungen und Absagen entscheidet ein Mensch.",
      ]),
    )
    lines.push("")

    lines.push(row(["Teil 1: Bewerbungen"]))
    lines.push(
      row([
        "Bewerbung", "Name", "Eingang", "Quelle", "Status", "Analysewert", "Gespräch", "Match",
        "K.-o.", "K.-o.-Gründe", "Platz im Bestenvergleich", "Modell", "Modell in der EU",
        "Befunde in den Unterlagen", "Talent-Pool-Einwilligung",
      ]),
    )
    for (const l of list) {
      const c = one(l.candidate) as Record<string, unknown> | null
      const detail = (l.match_detail ?? {}) as { modelUsed?: string; euResident?: boolean }
      const findings = (c?.document_findings as { findings?: unknown[] } | null)?.findings
      lines.push(
        row([
          String(l.id).slice(0, 8),
          (c?.full_name as string) ?? "",
          when(l.created_at),
          SOURCE_LABEL[l.source as string] ?? (l.source ? String(l.source) : "manuell"),
          l.status ?? "",
          l.screening_score ?? l.match_score ?? "",
          l.interview_score != null ? Math.round(Number(l.interview_score)) : "",
          l.match_score ?? "",
          l.knockout ? "ja" : "nein",
          Array.isArray(l.knockout_reasons) ? l.knockout_reasons.join(" | ") : "",
          l.pool_rank ?? "",
          detail.modelUsed ?? "",
          detail.euResident == null ? "" : detail.euResident ? "ja" : "nein",
          Array.isArray(findings) ? findings.length : "",
          c?.talent_pool_consent === true ? `ja, ${when(c.talent_pool_consent_at as string)}` : "nein",
        ]),
      )
    }
    lines.push("")

    lines.push(row(["Teil 2: Ereignisse"]))
    if (eventsError) {
      lines.push(row(["Das Protokoll der Ereignisse ist noch nicht eingerichtet (Migration 031)."]))
    } else {
      lines.push(row(["Zeitpunkt", "Ereignis", "Bewerbung", "Name", "Handelnd", "Details"]))
      for (const e of events ?? []) {
        const d = (e.detail ?? {}) as Record<string, unknown>
        const details =
          e.event === "status_geaendert"
            ? `${d.von ?? "—"} → ${d.nach ?? "—"}${d.match != null ? ` (Match ${d.match})` : ""}`
            : e.event === "gespraech_bewertet"
              ? `Gespräch ${d.gespraech != null ? Math.round(Number(d.gespraech)) : "—"}, Match ${d.match ?? "—"}`
              : e.event === "pruefung_bestaetigt"
                ? `${d.bestaetigung ?? ""} (${d.offene_bewerbungen ?? 0} offene Bewerbungen)`
                : e.event === "stelle_abgeschlossen"
                  ? `${d.abgesagt ?? 0} abgesagt, ${d.mails_verschickt ?? 0} Absagen verschickt`
                  : e.event === "absage_verschickt"
                    ? d.weg === "einzeln" ? "einzeln verschickt" : "beim Abschließen der Stelle"
                    : e.event === "an_fachbereich_gesendet"
                      ? d.weg === "mail" ? "Freigabe-Link per E-Mail" : "Freigabe-Link"
                      : e.event === "rueckmeldung_fachbereich"
                        ? `${d.urteil === "interessant" ? "Interessant" : "Ablehnen"}${d.kommentar ? ", mit Kommentar" : ""}`
                        : e.event === "report_erstellt"
                          ? `${d.anonym ? `anonym als ${d.profilnummer ?? "Profilnummer"}` : "mit Namen"}, ${d.kandidaten ?? 1} im Report`
                          : JSON.stringify(d)
        const linkId = e.job_candidate_id as string | null
        lines.push(
          row([
            when(e.created_at),
            EVENT_LABEL[e.event] ?? e.event,
            linkId ? linkId.slice(0, 8) : "",
            linkId ? nameOf.get(linkId) || "(gelöscht)" : "",
            e.event === "rueckmeldung_fachbereich" ? "Fachbereich (Freigabe-Link)" : actor(e.actor_id as string | null),
            details,
          ]),
        )
      }
    }

    const safeTitle = (job.title || "stelle").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60)
    const date = new Date().toISOString().slice(0, 10)
    return new Response(`﻿${lines.join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="entscheidungsprotokoll-${encodeURIComponent(safeTitle)}-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[decision-log] export failed:", error)
    return Response.json({ error: "Protokoll konnte nicht erstellt werden" }, { status: 500 })
  }
}
