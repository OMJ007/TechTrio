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
      "inline-flex items-center justify-center rounded-chip font-medium transition-colors duration-150 " +
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 " +
      "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[.98]";

    const variantStyles = {
      // accent-ink on accent-500 measures 5.59:1
      primary: "bg-accent text-accent-ink hover:bg-accent-600",
      secondary: "bg-surface-inset text-ink-secondary hover:text-ink-primary border border-line",
      outline: "bg-transparent text-ink-secondary hover:text-ink-primary border border-line-interactive hover:border-accent-400",
      ghost: "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-surface-raised",
      danger: "bg-negative text-canvas hover:opacity-90",
    };

    const sizeStyles = {
      sm: "text-label px-3 py-1.5 gap-1.5",
      md: "text-label px-4 py-2 gap-2",
      lg: "text-body px-5 py-2.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-current" />
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
