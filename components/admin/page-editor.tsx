"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { saveSitePageAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { RichTextEditor } from "@/components/ui/rich-text";
import { useToast } from "@/components/ui/toast";

export function PageEditor({
  handle,
  label,
  path,
  initialTitle,
  initialBody,
}: {
  handle: string;
  label: string;
  path: string;
  initialTitle: string;
  initialBody: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  const save = () =>
    startTransition(async () => {
      const res = await saveSitePageAction(handle, title, body);
      if (res.ok) {
        toast("Page saved — it's live on the store.");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save.", "error");
      }
    });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/pages"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-umber hover:text-walnut"
      >
        <ArrowLeft className="h-4 w-4" /> All pages
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="heading-display text-2xl font-semibold text-ink">{label}</h1>
          <Link
            href={path as never}
            target="_blank"
            className="mt-1 inline-flex items-center gap-1 text-xs text-umber hover:text-walnut"
          >
            {path} <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <Button onClick={save} loading={pending}>
          Save page
        </Button>
      </header>

      <div className="space-y-4 rounded-2xl border border-line bg-white/60 p-5">
        <div>
          <Label htmlFor="page-title">Title</Label>
          <Input id="page-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="page-body">Content</Label>
          <RichTextEditor
            id="page-body"
            value={body}
            onChange={setBody}
            placeholder="Write the page content…"
            className="[&>div:last-child]:min-h-72"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} loading={pending}>
          Save page
        </Button>
      </div>
    </div>
  );
}
