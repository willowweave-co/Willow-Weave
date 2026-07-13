import { notFound } from "next/navigation";
import { EDITABLE_PAGES } from "@/lib/site-pages";
import { resolveSitePage } from "@/lib/page-defaults";
import { PageEditor } from "@/components/admin/page-editor";

interface Props {
  params: Promise<{ handle: string }>;
}

export const metadata = { title: "Edit page" };

export default async function AdminPageEditPage({ params }: Props) {
  const { handle } = await params;
  const entry = EDITABLE_PAGES.find((p) => p.handle === handle);
  if (!entry) notFound();
  const page = await resolveSitePage(handle);
  if (!page) notFound();

  return (
    <PageEditor
      key={handle}
      handle={handle}
      label={entry.label}
      path={entry.path}
      initialTitle={page.title}
      initialBody={page.bodyHtml}
    />
  );
}
