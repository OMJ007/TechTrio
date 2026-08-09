"use client";

import { type HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "surface" | "raised";
  hoverLift?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "surface", hoverLift = false, className = "", children, ...props }, ref) => {
    const bgStyle = variant === "raised" ? "bg-[#1B2130]/90" : "bg-[#141824]/75";
    const hoverStyle = hoverLift ? "hover-lift" : "";

    return (
      <div
        ref={ref}
        className={`rounded-[20px] border border-white/[0.09] ${bgStyle} backdrop-blur-xl p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,.95)] ${hoverStyle} ${className}`}
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
    className={`flex items-center justify-between pb-4 border-b border-white/[0.08] ${className}`}
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
  <h3
    ref={ref}
    className={`text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] ${className}`}
  >
    {children}
  </h3>
));
CardTitle.displayName = "CardTitle";

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => (
  <div ref={ref} className={`pt-4 ${className}`} {...props}>
    {children}
  </div>
));
CardContent.displayName = "CardContent";
