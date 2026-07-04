import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getContent, POLICY_SLUGS } from "@/lib/content";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const content = await getContent();
  const policy = content.policies[slug];
  if (!policy) return { title: "Policy" };
  return { title: policy.title, description: `Willow Weave — ${policy.title}.` };
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const content = await getContent();
  const policy = content.policies[slug];
  if (!policy || !(POLICY_SLUGS as readonly string[]).includes(slug)) notFound();

  return (
    <div className="container-site py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 border-b border-line pb-4 text-xs">
          {POLICY_SLUGS.map((s) => (
            <Link
              key={s}
              href={`/policies/${s}`}
              className={
                s === slug
                  ? "font-semibold text-walnut"
                  : "text-umber transition-colors hover:text-walnut"
              }
            >
              {content.policies[s]?.title ?? s}
            </Link>
          ))}
        </nav>
        <h1 className="heading-display text-3xl font-semibold text-ink">{policy.title}</h1>
        <div className="rte mt-6" dangerouslySetInnerHTML={{ __html: policy.bodyHtml }} />
      </div>
    </div>
  );
}
