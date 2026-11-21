import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer shrink-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-80 active:scale-[0.98]",
        outline: "border border-border bg-transparent text-foreground hover:bg-muted active:scale-[0.98]",
        ghost: "hover:bg-muted text-foreground active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2 text-sm [&_svg]:size-4",
        lg: "h-14 px-8 py-4 text-lg [&_svg]:size-6",
        icon: "size-12 p-0 rounded-full",
        "icon-sm": "size-10 p-0 rounded-full [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
