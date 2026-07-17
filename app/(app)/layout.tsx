import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // First-run onboarding gate: a signed-in customer who hasn't completed
  // onboarding is sent to /onboarding before they can reach the app shell.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarded")
      .eq("id", user.id)
      .single()
    if (profile && !profile.onboarded) redirect("/onboarding")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sidebar)]">
      <AppSidebar />
      <main className="flex-1 overflow-auto [background:var(--app-canvas)]">
        {children}
      </main>
    </div>
  )
}
