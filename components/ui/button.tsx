import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#78C6C9]/25 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "arctic-primary hover:-translate-y-px active:translate-y-0",
          variant === "ghost" && "text-[#256D85] hover:bg-[#FAFAF9]/80 hover:text-[#256D85]",
          variant === "outline" && "premium-control text-[#256D85] hover:-translate-y-px active:translate-y-0",
          variant === "secondary" && "bg-[#FAFAF9] text-[#1E293B] hover:bg-[#F5F7F6]",
          variant === "destructive" && "bg-[#D96B6B] text-white shadow-sm shadow-red-600/20 hover:bg-[#c55f5f]",
          variant === "link" && "text-[#256D85] underline-offset-4 hover:underline",
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-8 px-3 text-xs",
          size === "lg" && "h-11 px-6",
          size === "icon" && "h-9 w-9",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button }
