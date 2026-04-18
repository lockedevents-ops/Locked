"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  htmlFor?: string;
  text?: string;
  required?: boolean;
  children?: React.ReactNode;
  asChild?: boolean;
}

function Label({
  className,
  text,
  required = false,
  children,
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {text || children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </LabelPrimitive.Root>
  )
}

export { Label }
