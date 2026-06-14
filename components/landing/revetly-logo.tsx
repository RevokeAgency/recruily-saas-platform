export function RevetlyLogo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="relative inline-flex h-7 w-7 items-center justify-center rounded-[7px]"
        style={{ backgroundColor: "#1DB954" }}
        aria-hidden="true"
      >
        <span className="h-2.5 w-2.5 rounded-[2px] bg-white" />
      </span>
      <span
        className="font-sans text-xl font-extrabold tracking-tight"
        style={{ color: dark ? "#FFFFFF" : "#0F3D2C" }}
      >
        REVETLY
      </span>
    </span>
  )
}
