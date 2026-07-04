import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

export function Badge({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "neutral" | "sale" | "success" | "warning" | "danger" | "gold";
}) {
  const tones = {
    neutral: "bg-linen text-bark",
    sale: "bg-madder text-ivory",
    success: "bg-moss/15 text-moss",
    warning: "bg-gold/20 text-walnut-dark",
    danger: "bg-madder/12 text-madder",
    gold: "bg-gold/20 text-walnut-dark",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const statusTones: Record<OrderStatus, { tone: Parameters<typeof Badge>[0]["tone"]; label: string }> = {
  pending: { tone: "warning", label: "Pending" },
  confirmed: { tone: "gold", label: "Confirmed" },
  shipped: { tone: "neutral", label: "Shipped" },
  delivered: { tone: "success", label: "Delivered" },
  cancelled: { tone: "danger", label: "Cancelled" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { tone, label } = statusTones[status];
  return <Badge tone={tone}>{label}</Badge>;
}
