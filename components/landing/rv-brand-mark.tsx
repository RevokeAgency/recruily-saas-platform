export function RvBrandMark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-[7px]"
        style={{ backgroundImage: "var(--rv-gradient)" }}
        aria-hidden="true"
      >
        <span className="h-2.5 w-2.5 rounded-[2px] bg-white" />
      </span>
      <span className="text-xl font-extrabold tracking-tight text-[#0C1A16]">Revetly</span>
    </span>
  )
}
