import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { WaitlistAdmin } from "@/components/waitlist/waitlist-admin"
import { getAdminAccess } from "@/lib/admin/access"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "Warteliste | Revetly" },
  robots: { index: false, follow: false },
}

// Interne Seite im Admin-Bereich. Ohne volle Anmeldung (admin@revetly.ai
// mit zweitem Faktor) geht es zum Login unter /admin.
export default async function WaitlistAdminPage() {
  const access = await getAdminAccess()
  if (access.state !== "ok") redirect("/admin")
  return <WaitlistAdmin email={access.user.email ?? ""} />
}
