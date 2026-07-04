import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Ruler, ArrowRight } from "lucide-react";
import { repo } from "@/lib/data";
import { getContent, THEME_IMAGES } from "@/lib/content";
import { SizeChartTable } from "@/components/store/size-chart-table";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Size Guide",
  description:
    "Willow Weave size charts for tops and trousers — length, chest, shoulder, hem, hip and waist measurements in inches, with fit guidance.",
};

const MEASURE_TIPS = [
  {
    term: "Length",
    tip: "Measured from the highest point of the shoulder straight down to the hem.",
  },
  {
    term: "Chest",
    tip: "Garment laid flat, measured straight across underneath the armholes. Double it for the full circumference.",
  },
  {
    term: "Shoulder",
    tip: "Across the back, from one shoulder seam to the other.",
  },
  {
    term: "Hem / Hip",
    tip: "Width of the garment at the bottom opening and at the hip line respectively, laid flat.",
  },
  {
    term: "Waist Relaxed / Stretched",
    tip: "Trouser waistbands are elasticated — 'relaxed' is unstretched and 'stretched' is the maximum comfortable extension, both laid flat.",
  },
];

export default async function SizeGuidePage() {
  const [charts, content] = await Promise.all([repo.getSizeCharts(), getContent()]);

  return (
    <div className="container-site py-10 md:py-14">
      <header className="max-w-2xl">
        <p className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-umber uppercase">
          <Ruler className="h-4 w-4" /> Fit & measurements
        </p>
        <h1 className="heading-display mt-1 text-3xl font-semibold text-ink sm:text-4xl">
          Size Guide
        </h1>
        <div
          className="rte mt-4"
          dangerouslySetInnerHTML={{ __html: content.home.sizeChartSection.bodyHtml }}
        />
      </header>

      {/* charts */}
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {charts.map((chart) => (
          <section
            key={chart.id}
            className="rounded-2xl border border-line bg-white/50 p-6 sm:p-7"
          >
            <h2 className="heading-display text-xl font-semibold text-ink">{chart.name}</h2>
            {chart.appliesTo && <p className="mt-0.5 text-sm text-umber">{chart.appliesTo}</p>}
            <SizeChartTable chart={chart} className="mt-4" />
          </section>
        ))}
      </div>

      {/* how to measure */}
      <section className="mt-10 grid gap-8 rounded-2xl border border-line bg-parchment/60 p-6 sm:p-10 md:grid-cols-2">
        <div>
          <h2 className="heading-display text-2xl font-semibold text-ink">How to measure</h2>
          <p className="mt-2 text-sm leading-relaxed text-umber">
            All measurements are garment measurements in inches, taken with the piece laid flat.
            Compare them with a well-fitting garment you already own.
          </p>
          <dl className="mt-5 space-y-4">
            {MEASURE_TIPS.map((m) => (
              <div key={m.term} className="border-l-2 border-gold pl-4">
                <dt className="text-sm font-semibold text-ink">{m.term}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-bark">{m.tip}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="self-center overflow-hidden rounded-xl border border-line bg-white">
          <Image
            src={THEME_IMAGES.sizeCharts}
            alt="Original Willow Weave size chart reference"
            width={860}
            height={845}
            className="h-auto w-full object-contain"
          />
        </div>
      </section>

      <div className="mt-10 rounded-2xl border border-line p-6 text-center sm:p-8">
        <p className="heading-display text-xl text-ink">Between sizes, or eyeing a relaxed fit?</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-umber">
          Many of our suits are cut with deliberately loose, contemporary silhouettes. When in
          doubt, take your usual size — or message us and we’ll help you choose.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-walnut hover:underline hover:underline-offset-4"
          >
            Ask us anything <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-walnut hover:underline hover:underline-offset-4"
          >
            Continue shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
