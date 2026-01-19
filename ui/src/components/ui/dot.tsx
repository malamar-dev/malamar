import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const dotVariants = cva("inline-block size-2 rounded-full shrink-0", {
  variants: {
    color: {
      green: "bg-green-500",
      red: "bg-red-500",
    },
    pulse: {
      true: "animate-pulse",
      false: "",
    },
  },
  defaultVariants: {
    color: "green",
    pulse: true,
  },
});

interface DotProps
  extends React.ComponentProps<"span">, VariantProps<typeof dotVariants> {}

function Dot({ className, color, pulse, ...props }: DotProps) {
  return (
    <span
      data-slot="dot"
      className={cn(dotVariants({ color, pulse, className }))}
      {...props}
    />
  );
}

export { Dot, dotVariants };
