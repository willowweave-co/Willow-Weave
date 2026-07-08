import Link from "next/link";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "outline" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-walnut text-ivory hover:bg-walnut-dark border border-transparent",
  outline: "border border-walnut/35 text-walnut hover:border-walnut hover:bg-walnut/5",
  ghost: "text-bark hover:bg-linen border border-transparent",
  danger: "bg-madder text-ivory hover:bg-madder/85 border border-transparent",
  gold: "bg-gold/15 text-walnut-dark border border-gold/40 hover:bg-gold/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-[0.95rem] gap-2",
  icon: "h-10 w-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  href,
  loading,
  className,
  children,
  disabled,
  type,
  onClick,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-full font-medium tracking-wide transition-colors duration-200 select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-walnut",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={classes}
        // callers rely on onClick for side effects alongside navigation
        // (e.g. the cart drawer closing itself before going to /checkout)
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
