"use client";

import { type HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Elevation level. `base` sits on the canvas; `raised` nests inside a base card. */
  variant?: "base" | "raised" | "overlay";
  hoverLift?: boolean;
}

/**
 * Elevation is expressed as a border + background shift, never a drop shadow —
 * shadows read as grey smudge on a near-black canvas.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "base", hoverLift = false, className = "", children, ...props }, ref) => {
    const elevation = {
      base: "elev-base",
      raised: "elev-raised",
      overlay: "elev-overlay",
    }[variant];

    return (
      <div
        ref={ref}
        className={`rounded-card p-card-pad ${elevation} ${hoverLift ? "hover-lift" : ""} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center justify-between border-b border-line-subtle pb-stack-md ${className}`}
    {...props}
  >
    {children}
  </div>
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className = "", children, ...props }, ref) => (
  <h3 ref={ref} className={`text-overline uppercase text-ink-muted ${className}`} {...props}>
    {children}
  </h3>
));
CardTitle.displayName = "CardTitle";

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => (
  <div ref={ref} className={`pt-stack-md ${className}`} {...props}>
    {children}
  </div>
));
CardContent.displayName = "CardContent";
