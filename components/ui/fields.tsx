import { cn } from "@/lib/utils";

// placeholder:text-umber/90 — /50 measured 2.18:1 against the field's
// bg-white/70, well under the 4.5:1 AA floor. /90 is the lightest step that
// clears it (4.93:1), so the hint text stays visibly secondary to the value
// the customer types while remaining readable. These placeholders teach
// address and phone format, so they have to be legible to do their job.
// border-line-strong, not border-line: a field's edge is what tells you where
// the field is, so WCAG 1.4.11 wants it discernible at 3:1. `line` managed
// 1.28:1 — the boxes effectively had no visible boundary for anyone with
// low vision. Decorative rules elsewhere keep the softer `line`.
const fieldBase =
  "w-full rounded-lg border border-line-strong bg-white/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-umber/90 transition-colors focus:border-walnut focus:outline-none focus:ring-2 focus:ring-walnut/15 disabled:opacity-50";

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium tracking-wide text-bark uppercase", className)}
      {...props}
    >
      {children}
    </label>
  );
}

// ComponentProps (not InputHTMLAttributes) so callers can pass `ref` — React 19
// treats it as an ordinary prop, and the login code box needs to focus itself.
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "appearance-none bg-white/70 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-madder">{children}</p>;
}

export function Checkbox({
  className,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-bark">
      <input
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-line-strong text-walnut accent-walnut focus:ring-walnut/30",
          className
        )}
        {...props}
      />
      {label}
    </label>
  );
}
