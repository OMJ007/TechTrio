"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[.98]";

    const variantStyles = {
      primary:
        "bg-[#3B82F6] hover:bg-[#93C5FD] text-[#10131B] shadow-lg shadow-[#3B82F6]/20",
      secondary:
        "bg-white/[0.06] hover:bg-white/[0.1] text-[#C9D1DE] hover:text-white border border-white/[0.1]",
      outline:
        "bg-transparent hover:bg-white/[0.06] text-[#B6BFCE] hover:text-white border border-white/[0.1]",
      ghost:
        "bg-transparent hover:bg-white/[0.06] text-[#B6BFCE] hover:text-white",
      danger:
        "bg-[#F07178] hover:bg-[#E85D67] text-white shadow-sm shadow-[#F07178]/20 active:scale-[0.98]",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5 font-mono",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-5 py-2.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
