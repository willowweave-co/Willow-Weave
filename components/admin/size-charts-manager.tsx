"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Columns3, Rows3 } from "lucide-react";
import type { SizeChart } from "@/lib/types";
import { saveSizeChartAction, deleteSizeChartAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function blank(): SizeChart {
  return {
    id: "",
    name: "",
    appliesTo: "",
    columns: ["Measurement (in)", "S", "M", "L"],
    rows: [["Length", "", "", ""]],
    note: "",
  };
}

export function SizeChartsManager({ charts }: { charts: SizeChart[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(charts[0]?.id ?? null);
  const [draft, setDraft] = useState<SizeChart | null>(
    charts[0] ? structuredClone(charts[0]) : null
  );

  const select = (chart: SizeChart | null) => {
    setSelectedId(chart?.id ?? null);
    setDraft(chart ? structuredClone(chart) : blank());
  };

  const setCell = (ri: number, ci: number, value: string) =>
    setDraft((d) => {
      if (!d) return d;
      const rows = d.rows.map((r) => [...r]);
      rows[ri][ci] = value;
      return { ...d, rows };
    });

  const setColumn = (ci: number, value: string) =>
    setDraft((d) => {
      if (!d) return d;
      const columns = [...d.columns];
      columns[ci] = value;
      return { ...d, columns };
    });

  const addColumn = () =>
    setDraft((d) =>
      d
        ? { ...d, columns: [...d.columns, "XL"], rows: d.rows.map((r) => [...r, ""]) }
        : d
    );

  const removeColumn = (ci: number) =>
    setDraft((d) =>
      d && d.columns.length > 2
        ? {
            ...d,
            columns: d.columns.filter((_, i) => i !== ci),
            rows: d.rows.map((r) => r.filter((_, i) => i !== ci)),
          }
        : d
    );

  const addRow = () =>
    setDraft((d) => (d ? { ...d, rows: [...d.rows, d.columns.map(() => "")] } : d));

  const removeRow = (ri: number) =>
    setDraft((d) => (d && d.rows.length > 1 ? { ...d, rows: d.rows.filter((_, i) => i !== ri) } : d));

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      const res = await saveSizeChartAction(draft);
      if (res.ok) {
        toast("Size chart saved.");
        if (res.id) setDraft({ ...draft, id: res.id });
        if (res.id) setSelectedId(res.id);
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save.", "error");
      }
    });
  };

  const remove = () => {
    if (!draft?.id) return;
    if (!confirm(`Delete “${draft.name}”? Products pointing to it fall back to no chart.`)) return;
    startTransition(async () => {
      const res = await deleteSizeChartAction(draft.id);
      if (res.ok) {
        toast("Chart deleted.");
        select(null);
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't delete.", "error");
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-display text-2xl font-semibold text-ink">Size charts</h1>
          <p className="mt-1 text-sm text-umber">
            The tables shown on product pages and the Size Guide. Measurements are in inches.
          </p>
        </div>
        <Button onClick={() => select(null)}>
          <Plus className="h-4 w-4" /> New chart
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* chart list */}
        <aside className="space-y-1.5">
          {charts.map((c) => (
            <button
              key={c.id}
              onClick={() => select(c)}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                selectedId === c.id
                  ? "border-walnut bg-walnut text-ivory"
                  : "border-line bg-white/60 text-bark hover:border-walnut/40"
              )}
            >
              <p className="text-sm font-semibold">{c.name}</p>
              <p className={cn("text-xs", selectedId === c.id ? "text-ivory/75" : "text-umber")}>
                {c.appliesTo || `${c.rows.length} rows`}
              </p>
            </button>
          ))}
          {!charts.length && (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-umber">
              No charts yet
            </p>
          )}
        </aside>

        {/* editor */}
        {draft && (
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sc-name">Chart name *</Label>
                <Input
                  id="sc-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Top Size Chart"
                />
              </div>
              <div>
                <Label htmlFor="sc-applies">Applies to</Label>
                <Input
                  id="sc-applies"
                  value={draft.appliesTo}
                  onChange={(e) => setDraft({ ...draft, appliesTo: e.target.value })}
                  placeholder="Kurtas, shirts & tops"
                />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr>
                    {draft.columns.map((col, ci) => (
                      <th key={ci} className="p-1">
                        <div className="flex items-center gap-1">
                          <Input
                            value={col}
                            onChange={(e) => setColumn(ci, e.target.value)}
                            className="h-9 bg-parchment/70 text-center font-semibold"
                            aria-label={`Column ${ci + 1} header`}
                          />
                          {ci > 0 && draft.columns.length > 2 && (
                            <button
                              onClick={() => removeColumn(ci)}
                              aria-label="Remove column"
                              className="shrink-0 p-1 text-umber/60 hover:text-madder"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {draft.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="p-1">
                          <Input
                            value={cell}
                            onChange={(e) => setCell(ri, ci, e.target.value)}
                            className={cn("h-9 text-center", ci === 0 && "text-left font-medium")}
                            aria-label={`Row ${ri + 1}, column ${ci + 1}`}
                          />
                        </td>
                      ))}
                      <td className="w-8 p-1 text-center">
                        {draft.rows.length > 1 && (
                          <button
                            onClick={() => removeRow(ri)}
                            aria-label="Remove row"
                            className="p-1 text-umber/60 hover:text-madder"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={addRow}>
                <Rows3 className="h-4 w-4" /> Add row
              </Button>
              <Button variant="outline" size="sm" onClick={addColumn}>
                <Columns3 className="h-4 w-4" /> Add size column
              </Button>
            </div>

            <div className="mt-5">
              <Label htmlFor="sc-note">Note (shown under the table)</Label>
              <Textarea
                id="sc-note"
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="Garment measurements taken flat, in inches…"
              />
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              {draft.id ? (
                <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
                  <Trash2 className="h-4 w-4" /> Delete chart
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={save} loading={pending}>
                {draft.id ? "Save chart" : "Create chart"}
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
