"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2, KeyRound } from "lucide-react";
import { updateAccountAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";

export function AccountSettings({
  currentName,
  currentEmail,
  role,
  localMode,
}: {
  currentName: string;
  currentEmail: string;
  role: string;
  localMode: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    if (newPassword && newPassword !== confirmPassword) {
      setError("The two passwords don't match.");
      return;
    }
    startTransition(async () => {
      const res = await updateAccountAction({
        name,
        email,
        newPassword: newPassword || undefined,
      });
      if (res.ok) {
        toast("Account updated.");
        setNewPassword("");
        setConfirmPassword("");
        router.refresh();
      } else {
        setError(res.error ?? "Couldn't update the account.");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-line bg-white/60 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <UserCircle2 className="h-4.5 w-4.5 text-umber" /> Your account
      </h2>
      <p className="mt-1 mb-4 text-xs text-umber">
        Signed in as <strong className="text-bark">{currentEmail}</strong> · {role}
      </p>

      {localMode ? (
        <p className="rounded-xl bg-parchment/70 px-3.5 py-2.5 text-xs leading-relaxed text-bark">
          Account settings become available once Supabase is connected (logins live there).
        </p>
      ) : (
        <>
          {error && (
            <p className="mb-4 rounded-lg border border-madder/30 bg-madder/8 px-3 py-2 text-sm text-madder">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="acc-name">Display name</Label>
              <Input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ausat — Owner"
                autoComplete="name"
              />
              <p className="mt-1 text-xs text-umber">
                Shown in the sidebar so everyone knows who's signed in.
              </p>
            </div>
            <div>
              <Label htmlFor="acc-email">Login email</Label>
              <Input
                id="acc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <p className="mt-1 text-xs text-umber">
                Takes effect immediately — use this address next time you sign in.
              </p>
            </div>
            <div>
              <Label htmlFor="acc-pass">New password (optional)</Label>
              <Input
                id="acc-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave empty to keep current"
                autoComplete="new-password"
              />
              <FieldError>
                {newPassword && newPassword.length < 8 ? "At least 8 characters." : null}
              </FieldError>
            </div>
            <div>
              <Label htmlFor="acc-pass2">Confirm new password</Label>
              <Input
                id="acc-pass2"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat the new password"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={save} loading={pending}>
              <KeyRound className="h-4 w-4" /> Update account
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
