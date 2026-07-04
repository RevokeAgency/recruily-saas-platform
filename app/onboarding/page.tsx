import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarded, company_name, slug, logo_url")
    .eq("id", user.id)
    .single()

  // Already set up → straight into the app.
  if (profile?.onboarded) redirect("/dashboard")

  return (
    <OnboardingWizard
      initial={{
        companyName: profile?.company_name ?? "",
        slug: profile?.slug ?? "",
        logoUrl: profile?.logo_url ?? null,
      }}
    />
  )
}
