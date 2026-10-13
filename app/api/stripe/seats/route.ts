import { NextRequest } from "next/server"

import { createClient as createServer } from "@/lib/supabase/server"
import { PLANS, canBuyExtraSeats, maxExtraSeats, seatLimit, type PlanId } from "@/lib/plans"
import {
  bestActiveSubscription,
  ensureSeatPrice,
  getStripe,
  planFromLookupKey,
  seatItem,
  subLookupKey,
} from "@/lib/stripe/server"
import { loadTeam, teamDb } from "@/lib/team/store"
import { getWorkspace, requireOwner } from "@/lib/workspace"

export const dynamic = "force-dynamic"

/**
 * Setzt die Zahl der Zusatzplätze (14,99 € pro Monat und Platz). Mehr Plätze
 * werden sofort anteilig berechnet, weniger als Gutschrift auf die nächste
 * Rechnung. Nur Starter (höchstens 2) und Growth, nur der Inhaber, nur mit
 * laufendem Abo.
 */
export async function POST(req: NextRequest) {
  try {
    const server = await createServer()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
    const ownerOnly = requireOwner(await getWorkspace(server, user.id), "Plätze buchen")
    if (ownerOnly) return ownerOnly

    const body = await req.json().catch(() => ({}))
    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      return Response.json({ error: "Bitte eine ganze Zahl ab 0 wählen." }, { status: 400 })
    }

    const db = teamDb()
    if (!db) return Response.json({ error: "Server nicht konfiguriert" }, { status: 500 })
    const team = await loadTeam(db, user.id)
    if (!team) return Response.json({ error: "Profil nicht gefunden" }, { status: 404 })

    const plan = team.owner.plan as PlanId
    if (!canBuyExtraSeats(plan)) {
      return Response.json(
        { error: plan === "free" ? "Zusätzliche Nutzer gibt es ab dem Plan Starter." : "In deinem Plan sind unbegrenzt viele Nutzer enthalten." },
        { status: 400 },
      )
    }

    const max = maxExtraSeats(plan)
    if (quantity > max) {
      return Response.json(
        {
          error: plan === "starter"
            ? `Bei Starter kannst du höchstens ${max} weitere Nutzer dazubuchen. Für größere Teams wechsle auf Growth mit ${PLANS.growth.seats} Nutzern inklusive.`
            : `Bitte höchstens ${max} Zusatzplätze wählen.`,
          upgrade: plan === "starter",
        },
        { status: 400 },
      )
    }

    // Weniger Plätze nur, wenn alle bisherigen Personen weiter Platz haben.
    // Sonst würden Mitglieder ohne Vorwarnung gesperrt.
    const limit = seatLimit(plan, quantity)
    if (limit !== null && team.seats.used > limit) {
      return Response.json(
        { error: `Im Team sind ${team.seats.used} Personen und Einladungen. Entferne zuerst Mitglieder oder Einladungen.` },
        { status: 409 },
      )
    }

    const { data: profile } = await db.from("user_profiles").select("stripe_customer_id").eq("id", user.id).single()
    const customerId = profile?.stripe_customer_id as string | null
    if (!customerId) return Response.json({ error: "Kein laufendes Abo gefunden." }, { status: 400 })

    const stripe = getStripe()
    const sub = await bestActiveSubscription(stripe, customerId)
    const current = sub ? planFromLookupKey(subLookupKey(sub)) : null
    if (!sub || !current) return Response.json({ error: "Kein laufendes Abo gefunden." }, { status: 400 })
    if (sub.schedule) {
      return Response.json(
        { error: "Für dein Abo ist ein Planwechsel vorgemerkt. Plätze kannst du danach wieder ändern." },
        { status: 409 },
      )
    }

    const existing = seatItem(sub)
    const before = existing?.quantity ?? 0
    if (before === quantity) return Response.json({ ok: true, quantity, noop: true })

    if (quantity === 0 && existing) {
      await stripe.subscriptionItems.del(existing.id, { proration_behavior: "create_prorations" })
    } else if (existing) {
      await stripe.subscriptionItems.update(existing.id, {
        quantity,
        proration_behavior: quantity > before ? "always_invoice" : "create_prorations",
        payment_behavior: "error_if_incomplete",
      })
    } else {
      await stripe.subscriptionItems.create({
        subscription: sub.id,
        price: await ensureSeatPrice(stripe, current.interval),
        quantity,
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
      })
    }

    // Sofort im Profil, nicht erst mit dem Webhook: Die Einladung soll gleich
    // danach funktionieren. Der Webhook schreibt denselben Wert noch einmal.
    const { error } = await db.from("user_profiles").update({ extra_seats: quantity }).eq("id", user.id)
    if (error) console.error("[stripe seats] Profil nicht aktualisiert:", error.message)

    return Response.json({ ok: true, quantity })
  } catch (error) {
    console.error("[stripe seats] error:", error)
    const message = (error as { code?: string }).code === "card_declined"
      ? "Die Zahlung wurde abgelehnt. Bitte prüfe deine Zahlungsart im Abo-Portal."
      : "Plätze konnten nicht geändert werden."
    return Response.json({ error: message }, { status: 500 })
  }
}
