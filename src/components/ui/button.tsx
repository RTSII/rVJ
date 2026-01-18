import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-cyan-400/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95",
        destructive:
          "border border-red-400/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-400 hover:shadow-[0_0_20px_rgba(255,51,51,0.4)] active:scale-95",
        outline:
          "border border-purple-500/30 bg-transparent text-foreground hover:bg-purple-500/10 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] active:scale-95",
        secondary:
          "border border-pink-500/50 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 hover:border-pink-500 hover:shadow-[0_0_20px_rgba(255,45,146,0.4)] active:scale-95",
        ghost: "text-foreground/80 hover:bg-cyan-500/10 hover:text-cyan-400 hover:shadow-[0_0_10px_rgba(0,240,255,0.2)] active:scale-95",
        link: "text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
