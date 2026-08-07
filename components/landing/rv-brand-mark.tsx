import Image from "next/image"

/**
 * Das Revetly-Logo für Auth- und Modal-Kopfzeilen.
 *
 * Bis hierher stand an dieser Stelle ein Platzhalter aus Farbverlaufskachel und
 * dem Schriftzug „Revetly". Jetzt liegt dieselbe Bilddatei zugrunde wie in
 * Navigation, Footer und Rechtstexten, damit überall dasselbe Logo steht.
 */
export function RvBrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/revetly/LogoEntwurf-trim.png"
      alt="Revetly"
      width={129}
      height={32}
      priority
      className={`h-8 w-auto ${className ?? ""}`}
    />
  )
}
