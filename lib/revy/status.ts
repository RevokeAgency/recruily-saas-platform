import { aiConfigured } from "@/lib/ai/provider"
import { REVY_REQUESTS_PER_MONTH, type PlanId } from "@/lib/plans"
import { getPlan } from "@/lib/quota"
import type { RevyContext } from "./agent"

// ─────────────────────────────────────────────────────────────────────────────
// Ist Revy einsatzbereit? Prüft Schritt für Schritt, was fehlt, damit die
// Oberfläche es klar sagen kann statt "nichts gefunden".
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusPunkt {
  name: string
  ok: boolean
  hinweis?: string
}

export async function revyStatus(ctx: RevyContext): Promise<{ bereit: boolean; punkte: StatusPunkt[]; kontingent: { genutzt: number; limit: number | null } | null }> {
  const punkte: StatusPunkt[] = []

  const sicht = await ctx.db.schema("revy").from("jobs").select("stelle_id").limit(1)
  punkte.push(
    sicht.error
      ? {
          name: "Datenschicht (039)",
          ok: false,
          hinweis: /schema/i.test(sicht.error.message)
            ? "Das Schema revy ist nicht freigegeben: Supabase → Project Settings → Data API → Exposed schemas → revy ergänzen."
            : "Migration 039 ist noch nicht eingespielt.",
        }
      : { name: "Datenschicht (039)", ok: true },
  )

  const suche = await ctx.db.schema("revy").rpc("suche", { p_begriffe: ["revetly"] })
  punkte.push(suche.error ? { name: "Suche und Tags (040)", ok: false, hinweis: "Migration 040 ist noch nicht eingespielt." } : { name: "Suche und Tags (040)", ok: true })

  punkte.push(aiConfigured() ? { name: "KI-Anbieter", ok: true } : { name: "KI-Anbieter", ok: false, hinweis: "MISTRAL_API_KEY fehlt in dieser Umgebung." })

  const plan = ((await getPlan(ctx.admin, ctx.ownerId)) ?? "free") as PlanId
  const limit = REVY_REQUESTS_PER_MONTH[plan] ?? 0
  let kontingent: { genutzt: number; limit: number | null } | null = null
  if (limit === "offen" || limit === 0) {
    punkte.push({ name: "Kontingent", ok: false, hinweis: limit === 0 ? "Revy ist in deinem Plan nicht enthalten." : "Für deinen Plan ist kein Kontingent festgelegt." })
  } else {
    const periode = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }).slice(0, 8) + "01"
    const { data } = await ctx.admin.from("revy_usage").select("anfragen").eq("user_id", ctx.ownerId).eq("periode", periode).maybeSingle()
    kontingent = { genutzt: (data?.anfragen as number | undefined) ?? 0, limit }
    const leer = limit != null && kontingent.genutzt >= limit
    punkte.push(leer ? { name: "Kontingent", ok: false, hinweis: `Alle ${limit} Anfragen dieses Monats sind genutzt.` } : { name: "Kontingent", ok: true })
  }

  // 040 fehlt: Revy läuft trotzdem, nur ohne Volltext und Tags.
  const bereit = punkte.every((p) => p.ok || p.name === "Suche und Tags (040)")
  return { bereit, punkte, kontingent }
}
