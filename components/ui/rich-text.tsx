"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link2,
  Unlink,
  RemoveFormatting,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small word-processor-style editor for descriptions, pages and policies.
 * Stores plain HTML (the same descriptionHtml/bodyHtml the storefront already
 * renders), so nothing changes downstream — the server still sanitizes on save.
 * Built on contentEditable + execCommand: deprecated on paper, but universally
 * supported and dependency-free, which fits the simple marks we need.
 */

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const BTN = "rounded-md p-1.5 text-bark transition-colors hover:bg-linen hover:text-walnut";
const TOOLBAR_SELECT =
  "h-7 rounded-md border border-line bg-white/80 px-1.5 text-xs text-bark focus:border-walnut focus:outline-none";

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={BTN}
      // mousedown would move focus out of the editor and drop the selection
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-line" aria-hidden />;
}

const BULLET_STYLES = [
  { value: "disc", label: "● Filled" },
  { value: "circle", label: "○ Hollow" },
  { value: "square", label: "■ Square" },
];

const NUMBER_STYLES = [
  { value: "decimal", label: "1. 2. 3." },
  { value: "lower-alpha", label: "a. b. c." },
  { value: "upper-alpha", label: "A. B. C." },
  { value: "lower-roman", label: "i. ii. iii." },
  { value: "upper-roman", label: "I. II. III." },
];

export function RichTextEditor({ id, value, onChange, placeholder, className }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  /** last html we emitted — lets us tell external value changes from our own echo */
  const last = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && value !== last.current) {
      el.innerHTML = value || "";
      last.current = value;
    }
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    // an "empty" editable usually keeps a stray <br> — store a clean ""
    const html = el.innerHTML === "<br>" ? "" : el.innerHTML;
    last.current = html;
    onChange(html);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL (e.g. https://… or /size-guide):");
    if (!url) return;
    exec("createLink", url.trim());
  };

  /**
   * Set the marker style of the list around the caret (creating the list
   * first if needed). execCommand can only make plain lists; the style
   * variants are CSS list-style-type on the <ul>/<ol> itself.
   */
  const applyListStyle = (kind: "ul" | "ol", styleType: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const findList = (): HTMLElement | null => {
      let n: Node | null = window.getSelection()?.anchorNode ?? null;
      while (n && n !== el) {
        if (n instanceof HTMLElement && n.tagName.toLowerCase() === kind) return n;
        n = n.parentNode;
      }
      return null;
    };
    if (!findList()) {
      document.execCommand(kind === "ul" ? "insertUnorderedList" : "insertOrderedList");
    }
    const list = findList();
    if (list) list.style.listStyleType = styleType;
    emit();
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-white/70 transition-colors focus-within:border-walnut focus-within:ring-2 focus-within:ring-walnut/15",
        className
      )}
    >
      {/* sticky: long policies scroll, the tools shouldn't. top offset clears
          the admin mobile top bar; the desktop sidebar layout scrolls at top-0 */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-line/70 bg-ivory/95 px-1.5 py-1 backdrop-blur md:top-0">
        <select
          aria-label="Text style"
          title="Text style"
          className={TOOLBAR_SELECT}
          value=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.value) exec("formatBlock", `<${e.target.value}>`);
          }}
        >
          <option value="" disabled>
            Style
          </option>
          <option value="p">Normal text</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="h4">Small heading</option>
        </select>
        <Divider />
        <ToolbarButton label="Bold (Ctrl+B)" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic (Ctrl+I)" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Underline (Ctrl+U)" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Strikethrough" onClick={() => exec("strikeThrough")}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton label="Align left" onClick={() => exec("justifyLeft")}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Align centre" onClick={() => exec("justifyCenter")}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Align right" onClick={() => exec("justifyRight")}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <select
          aria-label="Bullet style"
          title="Bullet style"
          className={TOOLBAR_SELECT}
          value=""
          onChange={(e) => {
            if (e.target.value) applyListStyle("ul", e.target.value);
          }}
        >
          <option value="" disabled>
            ●○■
          </option>
          {BULLET_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <select
          aria-label="Numbering style"
          title="Numbering style"
          className={TOOLBAR_SELECT}
          value=""
          onChange={(e) => {
            if (e.target.value) applyListStyle("ol", e.target.value);
          }}
        >
          <option value="" disabled>
            1·a·i
          </option>
          {NUMBER_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Divider />
        <ToolbarButton label="Add link" onClick={addLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Remove link" onClick={() => exec("unlink")}>
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Clear formatting"
          onClick={() => {
            exec("removeFormat");
            exec("formatBlock", "<p>");
          }}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div
        ref={ref}
        id={id}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Description"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        // paste as plain text — pasted Word/Google-Docs markup makes a mess
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        className={cn(
          "min-h-32 w-full px-3.5 py-2.5 text-sm text-ink focus:outline-none",
          // make the marks visible inside the editor
          "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-xl [&_h2]:font-semibold",
          "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold",
          "[&_h4]:mt-2 [&_h4]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold",
          "[&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_a]:text-walnut [&_a]:underline",
          // placeholder for an empty editor
          "empty:before:pointer-events-none empty:before:text-umber/50 empty:before:content-[attr(data-placeholder)]"
        )}
      />
    </div>
  );
}
