import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"

// Revetly landing button system — pill radius, gradient/shine mechanics.
// Scoped to the marketing pages; app/dashboard chrome keeps components/ui/button.tsx.
const rvButtonVariants = cva(
  "rv-btn inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold tracking-tight whitespace-nowrap transition-[transform,background-color,color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "rv-btn-shine bg-[image:var(--rv-gradient)] text-[#0C1A16] font-bold shadow-[0_10px_26px_-14px_rgba(22,199,124,.55)] hover:-translate-y-px hover:shadow-[0_16px_34px_-14px_rgba(22,199,124,.62)]",
        grad: "rv-btn-shine bg-[image:var(--rv-gradient)] text-[#0C1A16] font-bold hover:-translate-y-px hover:shadow-[0_16px_36px_-16px_var(--rv-green)]",
        light:
          "rv-btn-shine bg-[#0C1A16] text-white hover:-translate-y-px hover:bg-[#16312A] hover:shadow-[0_30px_70px_-40px_rgba(12,26,22,.30)]",
        ghost:
          "bg-white text-[#0C1A16] border border-[rgba(12,26,22,.16)] hover:border-[#0C1A16] hover:-translate-y-px",
        ghostRing:
          "rv-btn-ring text-[#2C3D38] font-semibold hover:text-[#0C1A16] hover:-translate-y-px",
        ghostLight:
          "bg-white/10 border border-white/26 text-white/92 backdrop-blur-[10px] hover:bg-white/18 hover:border-white/42 hover:text-white",
      },
      size: {
        default: "px-6 py-3.5",
        sm: "px-[17px] py-[9px] text-[0.9rem]",
        lg: "px-7 py-4 text-[1rem]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
)

export interface RvButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof rvButtonVariants> {
  asChild?: boolean
  /** Show the up-right arrow that nudges on hover (index.html .btn .arrow). */
  arrow?: boolean
}

function RvButton({
  className,
  variant,
  size,
  asChild = false,
  arrow = false,
  children,
  ...props
}: RvButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="rv-button"
      className={cn(rvButtonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
      {arrow && <ArrowUpRight className="rv-btn-arrow h-3.5 w-3.5" strokeWidth={2.4} />}
    </Comp>
  )
}

export { RvButton, rvButtonVariants }
