import { createClient } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { NextRequest } from "next/server"
import { containsLikelyPii } from "@/lib/training/anonymize"

export const dynamic = "force-dynamic"
export const maxDuration = 120

// Unterhalb dieser Menge lohnt ein Fine-Tune nicht — Mistral empfiehlt
// mindestens einige hundert Beispiele, damit das Training etwas lernt statt
// nur zu rauschen.
const MIN_USEFUL = 100

/**
 * Export der gesammelten Trainingsbeispiele als JSONL im Mistral-Format
 * (eine Zeile pro Beispiel: {"messages":[{role,content}, …]}).
 *
 *   GET /api/training/export?task=dossier[&limit=5000][&stats=1]
 *
 * Nur für Inhaber des jeweiligen Kontos. Exportiert werden ausschließlich
 * pseudonymisierte Beispiele aus Konten mit erteilter Einwilligung — die
 * Sammlung stellt das bereits sicher, hier läuft die finale Gegenprobe.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const url = new URL(req.url)
    const task = url.searchParams.get("task") || "dossier"
    const limit = Math.min(Number(url.searchParams.get("limit")) || 5000, 20000)
    const statsOnly = url.searchParams.get("stats") === "1"

    if (!["dossier", "judge", "ranking"].includes(task)) {
      return Response.json({ error: "Unbekannte Aufgabe (dossier | judge | ranking)" }, { status: 400 })
    }

    // Einwilligung des Kontos prüfen — fail-closed.
    const { data: profile, error: profErr } = await supabase
      .from("user_profiles")
      .select("ai_training_consent")
      .eq("id", user.id)
      .single()
    if (profErr) {
      return Response.json(
        { error: "Trainingsdaten noch nicht aktiv — Migration 023_ai_training_consent.sql ausführen." },
        { status: 400 },
      )
    }
    if (profile?.ai_training_consent !== true) {
      return Response.json(
        { error: "Keine Einwilligung zum Modelltraining erteilt — Export nicht möglich." },
        { status: 403 },
      )
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: rows, error } = await admin
      .from("ai_training_examples")
      .select("messages, label_source, label_strength, created_at")
      .eq("user_id", user.id)
      .eq("task", task)
      .order("created_at", { ascending: true })
      .limit(limit)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    const all = rows || []
    // Finale Gegenprobe: Beispiele mit Restverdacht werden nicht exportiert.
    const clean = all.filter((r) => {
      const joined = (r.messages as { content: string }[]).map((m) => m.content).join("\n")
      return !containsLikelyPii(joined)
    })
    const dropped = all.length - clean.length

    if (statsOnly) {
      return Response.json({
        task,
        total: all.length,
        exportable: clean.length,
        droppedForPii: dropped,
        readyForFineTune: clean.length >= MIN_USEFUL,
        minUseful: MIN_USEFUL,
        hint:
          clean.length >= MIN_USEFUL
            ? "Genug Beispiele für einen ersten Trainingslauf."
            : `Noch ${MIN_USEFUL - clean.length} Beispiele bis zum ersten sinnvollen Fine-Tune.`,
      })
    }

    const jsonl = clean.map((r) => JSON.stringify({ messages: r.messages })).join("\n")

    return new Response(jsonl, {
      headers: {
        "Content-Type": "application/jsonl; charset=utf-8",
        "Content-Disposition": `attachment; filename="revetly-${task}-${new Date().toISOString().slice(0, 10)}.jsonl"`,
        "X-Examples-Exported": String(clean.length),
        "X-Examples-Dropped": String(dropped),
      },
    })
  } catch (error) {
    console.error("[training export] error:", error)
    return Response.json({ error: "Export fehlgeschlagen" }, { status: 500 })
  }
}
