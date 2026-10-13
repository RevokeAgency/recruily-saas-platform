import type { SupabaseClient } from "@supabase/supabase-js"

// ─────────────────────────────────────────────────────────────────────────────
// Arbeitsbereich (Migration 035).
//
// Alle Daten gehören dem Inhaber (user_id = Inhaber). Mitglieder arbeiten in
// seinem Arbeitsbereich: Server-Abfragen filtern deshalb nach ownerId, nicht
// nach der angemeldeten Person. Wer kein Mitglied ist, ist sein eigener
// Arbeitsbereich, für bestehende Konten ändert sich nichts.
//
// Was pro Person bleibt: Kalender und Buchungsseiten, Ratenbegrenzung, der
// Akteur im Entscheidungsprotokoll, Name und Login.
// ─────────────────────────────────────────────────────────────────────────────

export type WorkspaceRole = "owner" | "member"

export interface Workspace {
  /** Die angemeldete Person. */
  userId: string
  /** Wem die Daten gehören. Bei gesperrtem Platz die Person selbst. */
  ownerId: string
  role: WorkspaceRole
  /** false: Mitglied über dem Platzlimit, sieht die Daten des Teams nicht. */
  active: boolean
  /** Inhaber des Teams, auch wenn der eigene Platz gesperrt ist. */
  teamOwnerId: string
}

/**
 * Arbeitsbereich der angemeldeten Person. Fehlt die Funktion (Migration 035
 * noch nicht eingespielt), ist jede Person ihr eigener Arbeitsbereich.
 */
export async function getWorkspace(supabase: SupabaseClient, userId: string): Promise<Workspace> {
  const { data, error } = await supabase.rpc("my_workspace")
  const ws = (error ? null : data) as { owner_id?: string; role?: WorkspaceRole; active?: boolean } | null
  if (!ws?.owner_id || ws.role !== "member") {
    return { userId, ownerId: userId, role: "owner", active: true, teamOwnerId: userId }
  }
  const active = ws.active !== false
  return { userId, ownerId: active ? ws.owner_id : userId, role: "member", active, teamOwnerId: ws.owner_id }
}

/** 403 für Mitglieder bei Aktionen, die nur der Inhaber darf (Abo, Team, Firma, Konto). */
export function requireOwner(ws: Workspace, what: string): Response | null {
  if (ws.role === "owner") return null
  return Response.json({ error: `${what} kann nur der Inhaber des Kontos.`, owner_only: true }, { status: 403 })
}
