"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Crown } from "lucide-react";
import type { StoreSettings, StaffMember } from "@/lib/types";
import { saveSettingsAction, inviteStaffAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";

export function SettingsForm({ initial }: { initial: StoreSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    storeName: initial.storeName,
    shippingFee: String(initial.shippingFee),
    freeShippingThreshold: initial.freeShippingThreshold != null ? String(initial.freeShippingThreshold) : "",
    notifyEmail: initial.notifyEmail,
    announcement: initial.announcement ?? "",
  });

  const save = () =>
    startTransition(async () => {
      const res = await saveSettingsAction({
        storeName: form.storeName,
        shippingFee: Number(form.shippingFee) || 0,
        freeShippingThreshold: form.freeShippingThreshold
          ? Number(form.freeShippingThreshold)
          : null,
        notifyEmail: form.notifyEmail,
        announcement: form.announcement || null,
      });
      if (res.ok) {
        toast("Settings saved.");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save settings.", "error");
      }
    });

  return (
    <section className="rounded-2xl border border-line bg-white/60 p-5">
      <h2 className="mb-4 font-semibold text-ink">Store</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="s-name">Store name</Label>
          <Input
            id="s-name"
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="s-notify">New-order notifications go to</Label>
          <Input
            id="s-notify"
            type="email"
            value={form.notifyEmail}
            onChange={(e) => setForm({ ...form, notifyEmail: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <Label htmlFor="s-fee">Delivery charge (Rs)</Label>
          <Input
            id="s-fee"
            inputMode="numeric"
            value={form.shippingFee}
            onChange={(e) => setForm({ ...form, shippingFee: e.target.value.replace(/\D/g, "") })}
          />
        </div>
        <div>
          <Label htmlFor="s-free">Free delivery over (Rs, empty = never)</Label>
          <Input
            id="s-free"
            inputMode="numeric"
            value={form.freeShippingThreshold}
            onChange={(e) =>
              setForm({ ...form, freeShippingThreshold: e.target.value.replace(/\D/g, "") })
            }
            placeholder="e.g. 10000"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="s-announce">Announcement bar (empty = hidden)</Label>
          <Input
            id="s-announce"
            value={form.announcement}
            onChange={(e) => setForm({ ...form, announcement: e.target.value })}
            placeholder="Eid sale — up to 40% off, Cash on Delivery nationwide!"
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={save} loading={pending}>
          Save settings
        </Button>
      </div>
    </section>
  );
}

export function StaffManager({
  staff,
  isOwner,
  localMode,
}: {
  staff: StaffMember[];
  isOwner: boolean;
  localMode: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"owner" | "staff">("staff");

  const invite = () =>
    startTransition(async () => {
      const res = await inviteStaffAction(email, name, role);
      if (res.ok) {
        toast(`Invite sent to ${email}.`);
        setEmail("");
        setName("");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't send the invite.", "error");
      }
    });

  return (
    <section className="rounded-2xl border border-line bg-white/60 p-5">
      <h2 className="mb-1 font-semibold text-ink">Staff access</h2>
      <p className="mb-4 text-xs text-umber">
        Owners manage staff, settings and everything else; staff manage products, inventory,
        orders and discounts.
      </p>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {staff.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                {s.name}
                {s.role === "owner" && <Crown className="h-3.5 w-3.5 text-gold" />}
              </p>
              <p className="text-xs text-umber">{s.email}</p>
            </div>
            <span className="text-xs font-medium tracking-wide text-bark uppercase">{s.role}</span>
          </li>
        ))}
      </ul>

      {isOwner && (
        <div className="mt-4 rounded-xl border border-dashed border-line p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
            <UserPlus className="h-4 w-4 text-umber" /> Invite a team member
          </p>
          {localMode ? (
            <p className="text-xs text-umber">
              Staff invites become available once Supabase is connected (invites are sent through
              its auth system).
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@email.com"
                aria-label="Invitee email"
              />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                aria-label="Invitee name"
              />
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as "owner" | "staff")}
                aria-label="Role"
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </Select>
              <Button onClick={invite} loading={pending} disabled={!email}>
                Invite
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
