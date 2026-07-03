import { createClient } from "@/lib/supabase/server"
import { PageHero } from "@/components/app/page-hero"
import { RevealGroup } from "@/components/app/reveal-group"
import { EmptyState } from "@/components/empty-state"
import { InboxItem, type InboxEmail } from "@/components/inbox/inbox-item"
import { Inbox } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let items: InboxEmail[] = []
  let jobs: { id: string; title: string }[] = []

  if (user) {
    const [emailsRes, jobsRes] = await Promise.all([
      supabase
        .from("inbound_emails")
        .select("id, from_address, to_address, subject, status, reason, created_at")
        .eq("user_id", user.id)
        .in("status", ["unassigned", "no_cv", "error"])
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("jobs")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ])
    items = (emailsRes.data as InboxEmail[]) || []
    jobs = jobsRes.data || []
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="rv-patternbg" data-pattern="grid" aria-hidden="true" />
      <RevealGroup className="relative z-[1] space-y-6 p-6 lg:p-8">
        <PageHero
          eyebrow="Posteingang"
          title="Nicht zugeordnet"
          subtitle="Bewerbungs-Emails, die keinem Job zugeordnet werden konnten — hier manuell zuweisen."
        />

        <div className="reveal space-y-3">
          {items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Alles zugeordnet"
              description="Es warten keine nicht zugeordneten Bewerbungen. Eingehende Emails landen automatisch im richtigen Job."
            />
          ) : (
            items.map((item) => <InboxItem key={item.id} item={item} jobs={jobs} />)
          )}
        </div>
      </RevealGroup>
    </div>
  )
}
