import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/money";

export function Price({
  price,
  compareAtPrice,
  prefix,
  className,
  size = "md",
}: {
  price: number;
  compareAtPrice?: number | null;
  /** e.g. "from" for ranged card prices */
  prefix?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const onSale = compareAtPrice != null && compareAtPrice > price;
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-baseline gap-x-2",
        size === "sm" && "text-sm",
        size === "md" && "text-[0.95rem]",
        size === "lg" && "text-xl",
        className
      )}
    >
      {prefix && <span className="text-umber text-[0.8em]">{prefix}</span>}
      <span className={cn("font-semibold", onSale ? "text-madder" : "text-ink")}>
        {formatPKR(price)}
      </span>
      {onSale && (
        <s className="text-umber/70 text-[0.85em] font-normal">{formatPKR(compareAtPrice)}</s>
      )}
    </span>
  );
}
