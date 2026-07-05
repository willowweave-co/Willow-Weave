"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Crown, KeyRound, Trash2, Copy, Check } from "lucide-react";
import type { StoreSettings, StaffMember } from "@/lib/types";
import {
  saveSettingsAction,
  createStaffAction,
  resetStaffPasswordAction,
  updateStaffRoleAction,
  removeStaffAction,
} from "@/app/actions/admin";
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

function TempPasswordReveal({
  email,
  password,
  onDismiss,
}: {
  email: string;
  password: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Login: ${email}\nTemporary password: ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — they can select the text manually */
    }
  };
  return (
    <div className="mt-4 rounded-xl border-2 border-gold/50 bg-gold/10 p-4">
      <p className="text-sm font-semibold text-ink">
        Account ready — share these credentials securely (WhatsApp, in person):
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-3 rounded-lg bg-white/70 px-3.5 py-2.5 font-mono text-sm text-ink">
        <span>{email}</span>
        <span className="font-semibold tracking-wide">{password}</span>
        <button
          onClick={copy}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-bark transition-colors hover:border-walnut hover:text-walnut"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-moss" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-bark">
        This password is shown <strong>only once</strong>. Tell them to change it right after
        signing in, under <em>Settings → Your account</em>.
      </p>
      <button onClick={onDismiss} className="mt-2 text-xs text-umber underline underline-offset-2">
        Done, hide this
      </button>
    </div>
  );
}

export function StaffManager({
  staff,
  isOwner,
  localMode,
  currentUserId,
}: {
  staff: StaffMember[];
  isOwner: boolean;
  localMode: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"owner" | "staff">("staff");
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);

  const create = () =>
    startTransition(async () => {
      const res = await createStaffAction(email, name, role);
      if (res.ok && res.tempPassword) {
        setReveal({ email: email.trim().toLowerCase(), password: res.tempPassword });
        toast(`Account created for ${email}.`);
        setEmail("");
        setName("");
        setRole("staff");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't create the account.", "error");
      }
    });

  const resetPassword = (member: StaffMember) => {
    if (!confirm(`Reset the password for ${member.email}? Their current one stops working.`)) return;
    startTransition(async () => {
      const res = await resetStaffPasswordAction(member.id);
      if (res.ok && res.tempPassword) {
        setReveal({ email: member.email, password: res.tempPassword });
        toast("Password reset.");
      } else {
        toast(res.error ?? "Couldn't reset the password.", "error");
      }
    });
  };

  const changeRole = (member: StaffMember, newRole: "owner" | "staff") => {
    if (newRole === member.role) return;
    startTransition(async () => {
      const res = await updateStaffRoleAction(member.id, newRole);
      if (res.ok) {
        toast(`${member.name} is now ${newRole === "owner" ? "an owner" : "staff"}.`);
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't change the role.", "error");
      }
    });
  };

  const remove = (member: StaffMember) => {
    if (!confirm(`Remove ${member.email} from the team? They won't be able to sign in anymore.`)) {
      return;
    }
    startTransition(async () => {
      const res = await removeStaffAction(member.id);
      if (res.ok) {
        toast(`${member.name} removed.`);
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't remove them.", "error");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-line bg-white/60 p-5">
      <h2 className="mb-1 font-semibold text-ink">Team access</h2>
      <p className="mb-4 text-xs text-umber">
        Owners manage the team and everything else; staff manage products, inventory, orders and
        discounts. Accounts are created here with a one-time temporary password — no email
        involved.
      </p>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {staff.map((s) => {
          const isSelf = s.id === currentUserId;
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {s.name}
                  {s.role === "owner" && <Crown className="h-3.5 w-3.5 text-gold" />}
                  {isSelf && <span className="text-xs font-normal text-umber">(you)</span>}
                </p>
                <p className="truncate text-xs text-umber">{s.email}</p>
              </div>
              {isOwner && !localMode ? (
                <div className="flex items-center gap-1.5">
                  <Select
                    value={s.role}
                    onChange={(e) => changeRole(s, e.target.value as "owner" | "staff")}
                    disabled={pending}
                    aria-label={`Role for ${s.email}`}
                    className="h-8 w-auto px-2 py-1 text-xs"
                  >
                    <option value="staff">Staff</option>
                    <option value="owner">Owner</option>
                  </Select>
                  <button
                    onClick={() => resetPassword(s)}
                    disabled={pending}
                    title="Reset password"
                    aria-label={`Reset password for ${s.email}`}
                    className="rounded-full p-1.5 text-bark transition-colors hover:bg-linen hover:text-walnut"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => remove(s)}
                      disabled={pending}
                      title="Remove from team"
                      aria-label={`Remove ${s.email}`}
                      className="rounded-full p-1.5 text-umber/70 transition-colors hover:bg-linen hover:text-madder"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs font-medium tracking-wide text-bark uppercase">
                  {s.role}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {reveal && (
        <TempPasswordReveal
          email={reveal.email}
          password={reveal.password}
          onDismiss={() => setReveal(null)}
        />
      )}

      {isOwner && (
        <div className="mt-4 rounded-xl border border-dashed border-line p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
            <UserPlus className="h-4 w-4 text-umber" /> Add a team member
          </p>
          {localMode ? (
            <p className="text-xs text-umber">
              Team accounts become available once Supabase is connected (logins live there).
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@email.com"
                aria-label="New member email"
              />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                aria-label="New member name"
              />
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as "owner" | "staff")}
                aria-label="Role"
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </Select>
              <Button onClick={create} loading={pending} disabled={!email}>
                Create account
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
