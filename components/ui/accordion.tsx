import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

/** Native <details> accordion — zero JS, accessible, matches the store's PDP. */
export function AccordionItem({
  label,
  children,
  defaultOpen,
  className,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      className={cn("details-animated group border-b border-line", className)}
      open={defaultOpen}
    >
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium tracking-wide text-ink uppercase select-none [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="h-4 w-4 text-umber transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}
