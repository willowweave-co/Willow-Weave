import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-lg border border-line bg-white/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-umber/50 transition-colors focus:border-walnut focus:outline-none focus:ring-2 focus:ring-walnut/15 disabled:opacity-50";

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

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
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
          "h-4 w-4 rounded border-line text-walnut accent-walnut focus:ring-walnut/30",
          className
        )}
        {...props}
      />
      {label}
    </label>
  );
}
