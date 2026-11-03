// Nachweis für Microsoft, dass die Domain revetly.ai zur Kalender-App gehört
// (Entra ID → App-Registrierung → Branding → Herausgeberdomäne). Ohne
// verifizierte Domain und Herausgeber blockieren viele Firmen-Mandanten die
// Zustimmung ihrer Mitarbeiter für Apps aus fremden Mandanten.
// Die Client-ID ist öffentlich, sie steht ohnehin in jeder Anmelde-Adresse.
export const dynamic = "force-dynamic"

export function GET() {
  const id = process.env.MICROSOFT_CALENDAR_CLIENT_ID?.trim()
  if (!id) return new Response("Not found", { status: 404 })
  return Response.json(
    { associatedApplications: [{ applicationId: id }] },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  )
}
