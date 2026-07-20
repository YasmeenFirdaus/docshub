import * as React from "react"
import { cn } from "@/lib/utils"

const Popover = ({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = React.useState(open ?? false)

  React.useEffect(() => {
    if (open !== undefined) setIsOpen(open)
  }, [open])

  const toggle = React.useCallback(() => {
    const next = !isOpen
    setIsOpen(next)
    onOpenChange?.(next)
  }, [isOpen, onOpenChange])

  return (
    <div className="relative inline-block">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === PopoverTrigger) {
          return React.cloneElement(child as React.ReactElement<any>, { onClick: toggle })
        }
        if (React.isValidElement(child) && child.type === PopoverContent) {
          return isOpen
            ? React.cloneElement(child as React.ReactElement<any>, {
              onClose: () => {
                setIsOpen(false)
                onOpenChange?.(false)
              },
            })
            : null
        }
        return child
      })}
    </div>
  )
}

const PopoverTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => (
  <div ref={ref} {...props} />
))
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end" }
>(({ className, align = "center", children, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        ; (props as any).onClose?.()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [props])

  return (
    <div
      ref={(node) => {
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
          ; (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      className={cn(
        "premium-card absolute top-full mt-2 z-50 min-w-[10rem] overflow-hidden rounded-xl text-slate-900 animate-doc-fade-up",
        align === "start" && "left-0",
        align === "end" && "right-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }
