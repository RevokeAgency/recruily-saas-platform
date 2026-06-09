export function RevetlyLogo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="inline-block h-7 w-7 rounded-[6px]"
        style={{ backgroundColor: "#1DB954" }}
        aria-hidden="true"
      />
      <span
        className="font-syne text-xl font-bold tracking-tight"
        style={{ color: dark ? "#0A0A0A" : "#FFFFFF" }}
      >
        REVETLY
      </span>
    </span>
  )
}
