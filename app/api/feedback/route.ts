import { NextRequest } from "next/server"
import { createClient as createServer } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"

import { nextPrompt, snoozeUntil, type FeedbackState } from "@/lib/feedback/prompt"
import { sendProductFeedbackNotice } from "@/lib/email/send"

export const dynamic = "force-dynamic"

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const PROFILE_COLUMNS =
  "matches_lifetime, feedback_prompt_stage, feedback_snoozed_until, feedback_opted_out, plan"

/**
 * Fragt ab, ob dem Kunden gerade die Feedback-Frage gezeigt werden soll.
 *
 * Fehlt Migration 024 noch, liefert der SELECT einen Fehler. Dann wird still
 * `null` zurückgegeben statt einer Fehlermeldung: Eine ausbleibende Umfrage
 * darf die Anwendung nicht stören.
 */
export async function GET() {
  try {
    const supabase = await createServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ prompt: null })

    const { data, error } = await admin()
      .from("user_profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .single()

    if (error || !data) return Response.json({ prompt: null })

    const state: FeedbackState = {
      matchesLifetime: Number(data.matches_lifetime ?? 0),
      stage: Number(data.feedback_prompt_stage ?? 0),
      snoozedUntil: (data.feedback_snoozed_until as string | null) ?? null,
      optedOut: data.feedback_opted_out === true,
    }

    return Response.json({ prompt: nextPrompt(state) })
  } catch (err) {
    console.error("[feedback] GET fehlgeschlagen:", err)
    return Response.json({ prompt: null })
  }
}

interface Body {
  action?: "submit" | "later" | "never" | "reset"
  rating?: number | null
  whatWorks?: string
  whatToImprove?: string
  featureWish?: string
  /** 'prompt' = automatische Abfrage, 'settings' = selbst aufgerufen */
  source?: "prompt" | "settings"
}

function clean(value: unknown, max = 4000): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as Body
    const action = body.action ?? "submit"
    const db = admin()

    const { data: profile } = await db
      .from("user_profiles")
      .select(`${PROFILE_COLUMNS}, first_name, last_name, company_name`)
      .eq("id", user.id)
      .single()

    const stage = Number(profile?.feedback_prompt_stage ?? 0)
    const now = new Date()

    // „Nicht mehr fragen" — über die Einstellungen widerrufbar.
    if (action === "never") {
      await db.from("user_profiles")
        .update({ feedback_opted_out: true })
        .eq("id", user.id)
      return Response.json({ ok: true })
    }

    // Wieder einschalten (Einstellungen).
    if (action === "reset") {
      await db.from("user_profiles")
        .update({ feedback_opted_out: false, feedback_snoozed_until: null })
        .eq("id", user.id)
      return Response.json({ ok: true })
    }

    // „Später" — die Schwelle gilt als erledigt, gefragt wird erst wieder bei
    // der nächsten, frühestens aber nach der Schonfrist.
    if (action === "later") {
      await db.from("user_profiles")
        .update({ feedback_prompt_stage: stage + 1, feedback_snoozed_until: snoozeUntil(now) })
        .eq("id", user.id)
      return Response.json({ ok: true })
    }

    // ── Abgabe ───────────────────────────────────────────────────────────────
    const rating =
      typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5
        ? Math.round(body.rating)
        : null
    const whatWorks = clean(body.whatWorks)
    const whatToImprove = clean(body.whatToImprove)
    const featureWish = clean(body.featureWish)

    if (rating === null && !whatWorks && !whatToImprove && !featureWish) {
      return Response.json({ error: "Bitte gib eine Bewertung oder einen Hinweis ab." }, { status: 400 })
    }

    const source = body.source === "settings" ? "settings" : "prompt"

    const { error: insertError } = await db.from("product_feedback").insert({
      user_id: user.id,
      rating,
      what_works: whatWorks,
      what_to_improve: whatToImprove,
      feature_wish: featureWish,
      matches_at_prompt: Number(profile?.matches_lifetime ?? 0),
      plan: (profile?.plan as string | null) ?? null,
      source,
    })

    if (insertError) {
      console.error("[feedback] Speichern fehlgeschlagen:", insertError)
      return Response.json({ error: "Konnte das Feedback nicht speichern." }, { status: 500 })
    }

    // Eine Abgabe über den Dialog erledigt die Schwelle. Über die Einstellungen
    // abgegebenes Feedback lässt den Zähler in Ruhe.
    const update: Record<string, unknown> = { feedback_last_submitted_at: now.toISOString() }
    if (source === "prompt") update.feedback_prompt_stage = stage + 1
    await db.from("user_profiles").update(update).eq("id", user.id)

    // Benachrichtigung an das Revetly-Team. Rein optional, blockiert nie.
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim()
    void sendProductFeedbackNotice({
      customer: name || user.email || user.id,
      company: (profile?.company_name as string | null) ?? null,
      plan: (profile?.plan as string | null) ?? null,
      rating,
      whatWorks,
      whatToImprove,
      featureWish,
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[feedback] POST fehlgeschlagen:", err)
    return Response.json({ error: "Unerwarteter Fehler." }, { status: 500 })
  }
}
