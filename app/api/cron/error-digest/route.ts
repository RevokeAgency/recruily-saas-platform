import { NextRequest } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"

import { escapeHtml, sendMail, shell } from "@/lib/email/client"

export const dynamic = "force-dynamic"

/**
 * Tagesbericht der Fehler.
 *
 * Sofort benachrichtigt wird nur bei einer NEUEN Fehlerart (siehe
 * lib/monitoring/capture.ts). Alles Wiederkehrende sammelt dieser Bericht ein,
 * damit ein Fehler, der tausendmal auftritt, nicht tausend Mails erzeugt.
 *
 * Räumt außerdem alte Einzelvorkommen weg. Die Gruppen bleiben stehen, sie
 * tragen die Geschichte.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const seit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: gruppen, error } = await admin
      .from("error_groups")
      .select("fingerprint, name, message, route, source, occurrences, first_seen, last_seen")
      .gte("last_seen", seit)
      .is("resolved_at", null)
      .order("occurrences", { ascending: false })
      .limit(30)

    if (error) {
      console.error("[error-digest] Gruppen nicht lesbar:", error.message)
      return Response.json({ error: "migration_fehlt" }, { status: 503 })
    }

    // Aufräumen unabhängig davon, ob ein Bericht rausgeht.
    let purged: number | null = null
    const { data: p, error: pErr } = await admin.rpc("purge_error_events", { p_days: 30 })
    if (pErr) console.error("[error-digest] Aufräumen übersprungen:", pErr.message)
    else purged = Number(p ?? 0)

    const to = process.env.ERROR_NOTIFY_EMAIL?.trim()
    if (!to || !gruppen || gruppen.length === 0) {
      // Kein Bericht bei einem stillen Tag. Eine Mail "keine Fehler" liest
      // nach der dritten Woche niemand mehr, und dann fällt auch die auf,
      // die wirklich etwas enthält.
      return Response.json({ ok: true, groups: gruppen?.length ?? 0, sent: false, purged })
    }

    const gesamt = gruppen.reduce((s, g) => s + Number(g.occurrences ?? 0), 0)
    const zeilen = gruppen
      .map(
        (g) => `
        <tr>
          <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:13px;">
            <strong>${escapeHtml(String(g.name ?? "Fehler"))}</strong><br>
            <span style="color:#64707B; font-family:monospace; font-size:12px;">${escapeHtml(String(g.message ?? "").slice(0, 160))}</span>
            ${g.route ? `<br><span style="color:#94a3b8; font-size:11px;">${escapeHtml(String(g.route))} · ${escapeHtml(String(g.source ?? ""))}</span>` : ""}
          </td>
          <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; text-align:right; font-size:13px; white-space:nowrap;">
            ${escapeHtml(String(g.occurrences))}&times;
          </td>
        </tr>`,
      )
      .join("")

    const body = `
      <p style="margin:0 0 16px;">
        In den letzten 24 Stunden: <strong>${gesamt}</strong> Vorkommen in
        <strong>${gruppen.length}</strong> ${gruppen.length === 1 ? "Fehlerart" : "Fehlerarten"}.
      </p>
      <table style="width:100%; border-collapse:collapse;">${zeilen}</table>
      <p style="margin:20px 0 0; color:#64707B; font-size:12px;">
        Vollständige Liste über /api/monitoring/errors.
      </p>
    `

    const sent = await sendMail(
      { to, subject: `Fehlerbericht: ${gesamt} Vorkommen, ${gruppen.length} Arten`, html: shell("Revetly", body) },
      "Fehlerbericht",
    )

    return Response.json({ ok: true, groups: gruppen.length, occurrences: gesamt, sent, purged })
  } catch (err) {
    console.error("[error-digest] fehlgeschlagen:", err)
    return Response.json({ error: "digest failed" }, { status: 500 })
  }
}
