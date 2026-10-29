import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { WaitlistAdmin } from "@/components/waitlist/waitlist-admin"
import { isOperator } from "@/lib/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "Warteliste | Revetly" },
  robots: { index: false, follow: false },
}

// Interne Seite. Wer kein Betreiber ist (MONITORING_ADMIN_EMAIL), bekommt
// ein 404, damit die Seite nach außen nicht existiert.
export default async function WaitlistAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isOperator(user?.email)) notFound()
  return <WaitlistAdmin email={user!.email!} />
}
