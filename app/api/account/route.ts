import { NextRequest } from "next/server"

import { DELETE_CONFIRMATION, adminClient, deleteAccount } from "@/lib/account/data"
import { getStripe } from "@/lib/stripe/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const OPEN_STATUSES = ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]

/**
 * Konto endgültig löschen (DSGVO Art. 17), inklusive sofortiger Kündigung
 * laufender Abos. Ablauf und Absicherungen siehe deleteAccount in
 * lib/account/data.ts.
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    if (body.confirm !== DELETE_CONFIRMATION) {
      return Response.json({ error: "Bestätigung fehlt" }, { status: 400 })
    }

    const db = adminClient()
    if (!db) return Response.json({ error: "Löschung ist gerade nicht verfügbar" }, { status: 503 })

    const result = await deleteAccount(db, user.id, async (customerId) => {
      if (!process.env.STRIPE_SECRET_KEY) return
      const stripe = getStripe()
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })
      for (const sub of subs.data) {
        if (OPEN_STATUSES.includes(sub.status)) await stripe.subscriptions.cancel(sub.id)
      }
    })
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
    return Response.json({ deleted: true })
  } catch (error) {
    console.error("[account/delete] error:", error)
    return Response.json({ error: "Löschung fehlgeschlagen" }, { status: 500 })
  }
}
