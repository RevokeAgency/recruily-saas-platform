// Betreiberzugang für interne Seiten und Endpunkte (Fehlerübersicht,
// Warteliste). Erlaubt sind die Adressen aus MONITORING_ADMIN_EMAIL,
// kommagetrennt. Ist die Variable leer, hat niemand Zugang (fail-closed).
export function isOperator(email: string | null | undefined): boolean {
  const allowed = (process.env.MONITORING_ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (allowed.length === 0 || !email) return false
  return allowed.includes(email.trim().toLowerCase())
}
