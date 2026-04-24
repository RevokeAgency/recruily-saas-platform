interface WaveDividerProps {
  fillColor: string
  direction?: "up" | "down"
}

export function WaveDivider({ fillColor, direction = "up" }: WaveDividerProps) {
  // Alternate wave curves based on direction
  const path = direction === "up" 
    ? "M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"
    : "M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z"

  return (
    <div className="overflow-hidden leading-[0] -mb-[2px]">
      <svg 
        viewBox="0 0 1440 80" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none" 
        className="w-full h-[50px] md:h-[80px] block"
      >
        <path d={path} fill={fillColor} />
      </svg>
    </div>
  )
}
