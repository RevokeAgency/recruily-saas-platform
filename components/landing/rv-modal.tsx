"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Feature-matrix style modal (index.html .modal-overlay/.modal): scale+fade
// entrance, backdrop-blur, sticky header. Built on Radix Dialog so focus-trap,
// Escape-to-close and overlay-click-to-close come for free (Radix), matching
// the hand-rolled JS behavior in index.html without reimplementing it.
const RvModal = DialogPrimitive.Root
const RvModalTrigger = DialogPrimitive.Trigger

function RvModalContent({
  className,
  children,
  title,
  subtitle,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: React.ReactNode
  subtitle?: React.ReactNode
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-[300] bg-[rgba(8,22,20,.5)] backdrop-blur-[7px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="rv-modal-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-[300] flex max-h-[88vh] w-[min(940px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden bg-white shadow-[0_50px_110px_-55px_rgba(12,26,22,.38)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        style={{ borderRadius: "var(--rv-radius-lg)" }}
        {...props}
      >
        <div className="flex flex-none items-start justify-between gap-4 border-b border-[rgba(12,26,22,.10)] px-6 py-[22px]">
          <div>
            <DialogPrimitive.Title className="text-[1.16rem] font-bold tracking-tight text-[#0C1A16]">
              {title}
            </DialogPrimitive.Title>
            {subtitle && (
              <DialogPrimitive.Description className="mt-[3px] text-[0.8rem] text-[#506A63]">
                {subtitle}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-[#F1F6F4] text-[#2C3D38] transition-colors hover:bg-[#E7F0EC] hover:text-[#0C1A16]"
            aria-label="Schließen"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </DialogPrimitive.Close>
        </div>
        <div className="overflow-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export { RvModal, RvModalTrigger, RvModalContent }
