import type { RevyContext } from "./agent"
import { writeAudit } from "./audit"

// ─────────────────────────────────────────────────────────────────────────────
// Änderungen von Revy (revy_actions) ansehen und einzeln zurücknehmen.
//
// Zurückgenommen wird nur, wenn der Stand noch der von Revy ist. Hat jemand
// danach selbst etwas geändert, bleibt es dabei und Revy sagt das. Die
// Rücknahme läuft mit der Sitzung des Nutzers (RLS) und steht im Protokoll.
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionRow {
  id: string
  created_at: string
  werkzeug: string
  ref: string
  ziel: Record<string, unknown>
  vorher: Record<string, unknown> | null
  nachher: Record<string, unknown> | null
  zurueckgenommen_am: string | null
}

export async function listActions(ctx: RevyContext, limit = 50): Promise<ActionRow[]> {
  const { data, error } = await ctx.db
    .from("revy_actions")
    .select("id, created_at, werkzeug, ref, ziel, vorher, nachher, zurueckgenommen_am")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Änderungen nicht lesbar: ${error.message}`)
  return (data ?? []) as ActionRow[]
}

export type UndoResult = { ok: true } | { ok: false; grund: string }

export async function undoAction(ctx: RevyContext, id: string): Promise<UndoResult> {
  const { data: a } = await ctx.admin
    .from("revy_actions")
    .select("id, user_id, run_id, werkzeug, ref, ziel, vorher, nachher, zurueckgenommen_am")
    .eq("id", id)
    .eq("user_id", ctx.ownerId)
    .maybeSingle()
  if (!a) return { ok: false, grund: "Änderung nicht gefunden." }
  if (a.zurueckgenommen_am) return { ok: false, grund: "Diese Änderung ist schon zurückgenommen." }

  const ziel = a.ziel as { id?: string; candidate_id?: string }
  const vorher = (a.vorher ?? {}) as Record<string, unknown>
  const nachher = (a.nachher ?? {}) as Record<string, unknown>

  switch (a.werkzeug) {
    case "status_setzen":
    case "notiz_anlegen": {
      const feld = a.werkzeug === "status_setzen" ? "status" : "notes"
      // Nur zurück, wenn noch Revys Stand gilt (bedingtes Update).
      const { data, error } = await ctx.db
        .from("job_candidates")
        .update({ [feld]: vorher[feld] ?? null })
        .eq("id", ziel.id as string)
        .eq(feld, nachher[feld] as string)
        .select("id")
      if (error) return { ok: false, grund: "Keine Berechtigung für diese Bewerbung." }
      if (!data?.length) return { ok: false, grund: "Inzwischen geändert. Revy lässt den neuen Stand stehen." }
      break
    }
    case "tag_setzen": {
      const { error } = await ctx.db.from("candidate_tags").delete().eq("id", ziel.id as string)
      if (error) return { ok: false, grund: "Keine Berechtigung für dieses Tag." }
      break
    }
    case "tag_entfernen": {
      const tags = ((vorher.tags ?? []) as Array<{ tag: string; job_id: string | null }>).map((t) => ({
        user_id: ctx.ownerId,
        candidate_id: ziel.candidate_id,
        job_id: t.job_id,
        tag: t.tag,
      }))
      const { error } = await ctx.db.from("candidate_tags").insert(tags)
      if (error && error.code !== "23505") return { ok: false, grund: "Keine Berechtigung für diese Tags." }
      break
    }
    default:
      return { ok: false, grund: "Diese Änderung lässt sich nicht zurücknehmen." }
  }

  // Als zurückgenommen markieren. Bedingung verhindert doppelte Rücknahme.
  await ctx.admin
    .from("revy_actions")
    .update({ zurueckgenommen_am: new Date().toISOString(), zurueckgenommen_durch: ctx.actorId })
    .eq("id", id)
    .is("zurueckgenommen_am", null)
  await writeAudit(ctx.admin, {
    user_id: ctx.ownerId,
    actor_id: ctx.actorId,
    run_id: (a.run_id as string | null) ?? null,
    werkzeug: "ruecknahme",
    parameter: { aktion_id: id, werkzeug: a.werkzeug },
    wirkung: "INTERN",
    refs: [a.ref as string],
    freigabe_durch: ctx.actorId,
    freigabe_am: new Date().toISOString(),
    ergebnis: { zurueckgenommen: true },
  })
  return { ok: true }
}
