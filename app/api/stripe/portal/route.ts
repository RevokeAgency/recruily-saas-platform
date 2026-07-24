import { NextRequest } from "next/server"
import { createClient as createServer } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { getStripe, ensurePortalConfiguration } from "@/lib/stripe/server"

export const dynamic = "force-dynamic"

// Opens the Stripe customer portal (payment methods, invoices, plan switch,
// cancellation at period end).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data: profile } = await admin
      .from("user_profiles").select("stripe_customer_id").eq("id", user.id).single()

    const customerId = profile?.stripe_customer_id as string | null
    if (!customerId) {
      return Response.json({ error: "Kein Abo vorhanden — wähle zuerst einen Plan." }, { status: 400 })
    }

    const stripe = getStripe()
    const configuration = await ensurePortalConfiguration(stripe)
    const origin = new URL(req.url).origin
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      configuration,
      return_url: `${origin}/subscription`,
    })
    return Response.json({ url: session.url })
  } catch (error) {
    console.error("[stripe portal] error:", error)
    return Response.json({ error: "Portal konnte nicht geöffnet werden" }, { status: 500 })
  }
}
