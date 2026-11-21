import type { ToolDef } from "./base"
import { INTERN } from "./intern"
import { LESEN } from "./lesen"

// Werkzeugregister von Revy. Neue Werkzeuge nur hier eintragen; die
// Wirkungsklasse steht im Werkzeug selbst, die Freigaberegel in gate.ts.

export * from "./base"
export { remainingMatches } from "./lesen"
export { appendNote, KATEGORIEN } from "./intern"

export const REGISTRY = { ...LESEN, ...INTERN } as const satisfies Record<string, ToolDef>

export type ToolName = keyof typeof REGISTRY

export function getTool(name: string): ToolDef | null {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name) ? (REGISTRY as Record<string, ToolDef>)[name] : null
}
