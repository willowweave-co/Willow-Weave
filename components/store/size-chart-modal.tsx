"use client";

import { useState } from "react";
import Link from "next/link";
import { Ruler, ArrowRight } from "lucide-react";
import type { SizeChart } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { SizeChartTable } from "./size-chart-table";

export function SizeChartModal({ charts }: { charts: SizeChart[] }) {
  const [open, setOpen] = useState(false);
  if (!charts.length) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-walnut underline-offset-4 hover:underline"
      >
        <Ruler className="h-4 w-4" /> Size chart
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Size Chart" className="max-w-xl">
        <div className="space-y-6">
          {charts.map((chart) => (
            <div key={chart.id}>
              <p className="mb-2 font-medium text-ink">
                {chart.name}
                {chart.appliesTo && (
                  <span className="ml-2 text-xs font-normal text-umber">({chart.appliesTo})</span>
                )}
              </p>
              <SizeChartTable chart={chart} />
            </div>
          ))}
          <Link
            href="/size-guide"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-walnut hover:underline hover:underline-offset-4"
          >
            Open the full size guide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Dialog>
    </>
  );
}
