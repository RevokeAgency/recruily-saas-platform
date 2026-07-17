import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppTopbar } from "@/components/app-topbar"

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
    <div className="h-screen overflow-hidden bg-[var(--app-backdrop)] p-2 sm:p-3">
      {/* The whole app floats as one rounded shell on the grey backdrop. */}
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] [background:var(--app-canvas)] shadow-[0_40px_90px_-40px_rgba(15,23,32,.5)]">
        <AppTopbar />
        <main className="min-h-0 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
