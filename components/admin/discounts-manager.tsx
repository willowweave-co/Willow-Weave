"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, TicketPercent } from "lucide-react";
import type { DiscountCode } from "@/lib/types";
import { saveDiscountAction, deleteDiscountAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Checkbox } from "@/components/ui/fields";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatPKR } from "@/lib/money";
import { formatDate } from "@/lib/utils";

function blank(): DiscountCode {
  return {
    id: "",
    code: "",
    type: "percent",
    value: 10,
    minSubtotal: 0,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    timesUsed: 0,
    active: true,
  };
}

function describe(d: DiscountCode): string {
  const amount = d.type === "percent" ? `${d.value}% off` : `${formatPKR(d.value)} off`;
  const min = d.minSubtotal > 0 ? ` on orders over ${formatPKR(d.minSubtotal)}` : "";
  return amount + min;
}

function statusOf(d: DiscountCode): { label: string; tone: "success" | "neutral" | "danger" } {
  const now = new Date();
  if (!d.active) return { label: "Disabled", tone: "neutral" };
  if (d.startsAt && now < new Date(d.startsAt)) return { label: "Scheduled", tone: "neutral" };
  if (d.endsAt && now > new Date(d.endsAt)) return { label: "Expired", tone: "danger" };
  if (d.usageLimit != null && d.timesUsed >= d.usageLimit)
    return { label: "Used up", tone: "danger" };
  return { label: "Active", tone: "success" };
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fromDateInput = (v: string, endOfDay = false) =>
  v ? new Date(`${v}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString() : null;

export function DiscountsManager({ discounts }: { discounts: DiscountCode[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const res = await saveDiscountAction(editing);
      if (res.ok) {
        toast("Discount saved.");
        setEditing(null);
        router.refresh();
      } else {
        setError(res.error ?? "Couldn't save.");
      }
    });
  };

  const remove = (d: DiscountCode) => {
    if (!confirm(`Delete code ${d.code}?`)) return;
    startTransition(async () => {
      const res = await deleteDiscountAction(d.id);
      if (res.ok) {
        toast("Discount deleted.");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't delete.", "error");
      }
    });
  };

  const toggleActive = (d: DiscountCode) => {
    startTransition(async () => {
      const res = await saveDiscountAction({ ...d, active: !d.active });
      if (res.ok) router.refresh();
      else toast(res.error ?? "Couldn't update.", "error");
    });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-display text-2xl font-semibold text-ink">Discounts</h1>
          <p className="mt-1 text-sm text-umber">
            Codes customers enter at checkout — percentage or fixed amount.
          </p>
        </div>
        <Button onClick={() => setEditing(blank())}>
          <Plus className="h-4 w-4" /> New discount
        </Button>
      </header>

      {discounts.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white/60">
          <table className="w-full text-sm md:min-w-[600px]">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-umber uppercase">
                <th className="px-3 py-3.5 font-medium sm:px-5">Code</th>
                <th className="px-2 py-3.5 font-medium sm:px-4">Discount</th>
                <th className="hidden px-4 py-3.5 font-medium md:table-cell">Window</th>
                <th className="hidden px-4 py-3.5 font-medium md:table-cell">Used</th>
                <th className="hidden px-4 py-3.5 font-medium sm:table-cell">Status</th>
                <th className="px-2 py-3.5 sm:px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {discounts.map((d) => {
                const st = statusOf(d);
                return (
                  <tr key={d.id} className="transition-colors hover:bg-linen/40">
                    <td className="px-3 py-3 font-mono font-semibold break-all text-ink sm:px-5">
                      {d.code}
                    </td>
                    <td className="px-2 py-3 text-bark sm:px-4">
                      {describe(d)}
                      <span className="block text-xs text-umber md:hidden">
                        used {d.timesUsed}
                        {d.usageLimit != null && ` / ${d.usageLimit}`}
                      </span>
                      <span className="mt-1 block sm:hidden">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-umber md:table-cell">
                      {d.startsAt || d.endsAt
                        ? `${d.startsAt ? formatDate(d.startsAt) : "now"} → ${d.endsAt ? formatDate(d.endsAt) : "no end"}`
                        : "Always"}
                    </td>
                    <td className="hidden px-4 py-3 text-bark md:table-cell">
                      {d.timesUsed}
                      {d.usageLimit != null && ` / ${d.usageLimit}`}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td className="px-2 py-3 sm:px-4">
                      <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                        <button
                          onClick={() => toggleActive(d)}
                          className="hidden rounded-full px-2.5 py-1 text-xs font-medium text-bark transition-colors hover:bg-linen sm:block"
                          disabled={pending}
                        >
                          {d.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => setEditing(d)}
                          aria-label={`Edit ${d.code}`}
                          className="rounded-full p-1.5 text-bark transition-colors hover:bg-linen hover:text-walnut"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(d)}
                          aria-label={`Delete ${d.code}`}
                          className="rounded-full p-1.5 text-umber/70 transition-colors hover:bg-linen hover:text-madder"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white/60 py-16 text-center">
          <TicketPercent className="mx-auto h-8 w-8 text-umber" />
          <p className="mt-3 text-bark">No discount codes yet.</p>
          <p className="mt-1 text-sm text-umber">
            Create one like <span className="font-mono font-semibold">EID10</span> for 10% off.
          </p>
        </div>
      )}

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${editing.code}` : "New discount"}
      >
        {editing && (
          <div className="space-y-4">
            {error && (
              <p className="rounded-lg border border-madder/30 bg-madder/8 px-3 py-2 text-sm text-madder">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="d-code">Code</Label>
                <Input
                  id="d-code"
                  value={editing.code}
                  onChange={(e) =>
                    setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/\s/g, "") })
                  }
                  placeholder="EID10"
                  className="font-mono uppercase"
                />
              </div>
              <div>
                <Label htmlFor="d-type">Type</Label>
                <Select
                  id="d-type"
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({ ...editing, type: e.target.value as "percent" | "fixed" })
                  }
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed amount (Rs)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="d-value">{editing.type === "percent" ? "Percent off" : "Rupees off"}</Label>
                <Input
                  id="d-value"
                  inputMode="numeric"
                  value={editing.value || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, value: Number(e.target.value.replace(/\D/g, "")) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="d-min">Minimum order (Rs)</Label>
                <Input
                  id="d-min"
                  inputMode="numeric"
                  value={editing.minSubtotal || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      minSubtotal: Number(e.target.value.replace(/\D/g, "")) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="d-limit">Usage limit</Label>
                <Input
                  id="d-limit"
                  inputMode="numeric"
                  value={editing.usageLimit ?? ""}
                  onChange={(e) => {
                    const n = e.target.value.replace(/\D/g, "");
                    setEditing({ ...editing, usageLimit: n ? Number(n) : null });
                  }}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label htmlFor="d-start">Starts</Label>
                <Input
                  id="d-start"
                  type="date"
                  value={toDateInput(editing.startsAt)}
                  onChange={(e) => setEditing({ ...editing, startsAt: fromDateInput(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="d-end">Ends</Label>
                <Input
                  id="d-end"
                  type="date"
                  value={toDateInput(editing.endsAt)}
                  onChange={(e) =>
                    setEditing({ ...editing, endsAt: fromDateInput(e.target.value, true) })
                  }
                />
              </div>
            </div>
            <Checkbox
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              label="Active"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save} loading={pending}>
                Save discount
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
