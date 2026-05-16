"use client"

import * as ToastPrimitive from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export const ToastProvider = ToastPrimitive.Provider
export const ToastViewport = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) => (
  <ToastPrimitive.Viewport
    className={cn(
      "fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-[360px] flex-col gap-2",
      className,
    )}
    {...props}
  />
)

export const Toast = ({
  className,
  variant = "default",
  ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & { variant?: "default" | "destructive" }) => (
  <ToastPrimitive.Root
    className={cn(
      "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-border bg-background p-4 shadow-lg",
      "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
      variant === "destructive" && "border-destructive/30 bg-destructive/5",
      className,
    )}
    {...props}
  />
)

export const ToastTitle = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) => (
  <ToastPrimitive.Title className={cn("text-sm font-semibold", className)} {...props} />
)

export const ToastDescription = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) => (
  <ToastPrimitive.Description className={cn("text-xs text-muted-foreground", className)} {...props} />
)

export const ToastClose = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>) => (
  <ToastPrimitive.Close
    className={cn(
      "absolute right-2 top-2 rounded-sm opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100",
      className,
    )}
    {...props}
  >
    <X className="h-3.5 w-3.5 text-muted-foreground" />
  </ToastPrimitive.Close>
)

export const ToastAction = ToastPrimitive.Action
