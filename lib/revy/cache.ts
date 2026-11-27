import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { describeChain } from "@/lib/ai/provider"

// ─────────────────────────────────────────────────────────────────────────────
// Antwort-Cache von Revy (revy_cache). Gleicher Befehl, gleiche Person,
// gleicher Geltungsbereich, gleicher Datenstand und gleiche Modelle: Die
// Antwort kommt aus dem Cache, kein Modellaufruf, kein Kontingent.
//
// Der Datenstand (revy.datenstand) ändert sich mit jeder neuen Bewerbung,
// jedem Status, Score, Dossier und jeder Änderung an einer Stelle. Er wird mit
// der Sitzung des Nutzers berechnet, also nur über das, was er sehen darf.
// Die Person gehört in den Schlüssel, weil Teammitglieder private Stellen
// nicht sehen.
//
// Nie im Cache: Läufe mit Matching (sie schreiben) und alles NACH_AUSSEN.
// ─────────────────────────────────────────────────────────────────────────────

/** Nach jeder Änderung an Prompts, Werkzeugen oder Prüfern um eins erhöhen. */
export const REVY_LOGIC_VERSION = 2

export function normalizeCommand(befehl: string): string {
  return befehl.toLowerCase().replace(/\s+/g, " ").trim()
}

export async function dataVersion(db: SupabaseClient, stelleId: string | null): Promise<string | null> {
  const { data, error } = await db.schema("revy").rpc("datenstand", { p_stelle: stelleId })
  if (error) {
    console.error("[revy] Datenstand nicht lesbar, kein Cache:", error.message)
    return null
  }
  return typeof data === "string" ? data : null
}

export function cacheKey(args: { actorId: string; befehl: string; stelleId: string | null; datenstand: string }): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        v: REVY_LOGIC_VERSION,
        actor: args.actorId,
        befehl: normalizeCommand(args.befehl),
        stelle: args.stelleId,
        daten: args.datenstand,
        modelle: [describeChain("agent_plan"), describeChain("agent_write")],
      }),
    )
    .digest("hex")
}

export async function readCache<T>(admin: SupabaseClient, ownerId: string, key: string): Promise<T | null> {
  const { data } = await admin.from("revy_cache").select("antwort, treffer").eq("user_id", ownerId).eq("cache_key", key).maybeSingle()
  if (!data) return null
  await admin.from("revy_cache").update({ treffer: (data.treffer ?? 0) + 1 }).eq("user_id", ownerId).eq("cache_key", key)
  return data.antwort as T
}

export async function writeCache(admin: SupabaseClient, ownerId: string, key: string, antwort: unknown): Promise<void> {
  const { error } = await admin.from("revy_cache").upsert({ user_id: ownerId, cache_key: key, antwort, treffer: 0 }, { onConflict: "user_id,cache_key" })
  if (error) console.error("[revy] Cache nicht geschrieben:", error.message)
}
