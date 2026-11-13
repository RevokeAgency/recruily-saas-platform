"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Ein Balkendiagramm mit genau einer Reihe (Registrierungen je Woche, Umsatz
// je Monat). Eine Farbe, keine Legende: Der Titel der Karte benennt die Reihe.
// Werte stehen im Tooltip; die Tabelle darunter in der Karte ist die
// Textansicht für alle, die das Diagramm nicht lesen können.
export function AdminBarChart({
  data,
  xKey,
  yKey,
  unit,
}: {
  data: Record<string, string | number>[]
  xKey: string
  yKey: string
  unit: "count" | "eur-cents"
}) {
  const format = (v: number) =>
    unit === "eur-cents"
      ? new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v / 100)
      : new Intl.NumberFormat("de-AT").format(v)

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="rgba(12,26,22,.07)" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: "rgba(12,26,22,.14)" }} tick={{ fontSize: 11, fill: "#6B7B76" }} interval="preserveStartEnd" />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={unit === "eur-cents" ? 64 : 32}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#6B7B76" }}
            tickFormatter={(v: number) => format(v)}
          />
          <Tooltip
            cursor={{ fill: "rgba(12,26,22,.04)" }}
            formatter={(v: number) => [format(v), unit === "eur-cents" ? "Umsatz netto" : "Registrierungen"]}
            contentStyle={{ borderRadius: 12, border: "1px solid rgba(12,26,22,.10)", fontSize: 12 }}
          />
          <Bar dataKey={yKey} fill="var(--rv-green-deep)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
