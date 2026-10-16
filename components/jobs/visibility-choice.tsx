"use client"

import { Lock, Users } from "lucide-react"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { VISIBILITY_LABEL, type JobVisibility } from "@/lib/team/visibility"

const ICON = { private: Lock, team: Users } as const

/**
 * Wer sieht die Stelle? Nur ich oder das ganze Team (Migration 036).
 * Erscheint nur, wenn es ein Team gibt.
 */
export function VisibilityChoice({
  value,
  onChange,
  disabled,
}: {
  value: JobVisibility
  onChange: (v: JobVisibility) => void
  disabled?: boolean
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as JobVisibility)}
      className="grid gap-3 sm:grid-cols-2"
      disabled={disabled}
      aria-label="Wer sieht die Stelle"
    >
      {(["private", "team"] as const).map((v) => {
        const Icon = ICON[v]
        const active = value === v
        return (
          <Label
            key={v}
            htmlFor={`visibility-${v}`}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal transition-colors ${
              active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <RadioGroupItem id={`visibility-${v}`} value={v} className="mt-0.5" />
            <span className="space-y-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                {VISIBILITY_LABEL[v].title}
              </span>
              <span className="block text-sm leading-relaxed text-muted-foreground">{VISIBILITY_LABEL[v].hint}</span>
            </span>
          </Label>
        )
      })}
    </RadioGroup>
  )
}
