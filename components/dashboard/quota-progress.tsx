import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Zap } from "lucide-react"

export function QuotaProgress({ used, total }: { used: number; total: number }) {
  const percentage = total > 0 ? (used / total) * 100 : 0
  const remaining = Math.max(total - used, 0)

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Monatliches Matching-Kontingent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {used}/{total}
            </span>
            <span className="text-sm text-muted-foreground">Matches verwendet</span>
          </div>
          <Progress value={percentage} gradient />
          <p className="text-xs text-muted-foreground tabular-nums">
            Noch {remaining} Matches verfügbar in diesem Monat. Erneuert sich am 1. des Monats.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
