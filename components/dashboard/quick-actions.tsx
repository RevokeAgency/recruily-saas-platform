import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Upload } from "lucide-react"

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild>
        <Link href="/jobs/new">
          <Plus className="mr-2 h-4 w-4" />
          Neuen Job erstellen
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/candidates">
          <Upload className="mr-2 h-4 w-4" />
          Kandidaten hochladen
        </Link>
      </Button>
    </div>
  )
}
