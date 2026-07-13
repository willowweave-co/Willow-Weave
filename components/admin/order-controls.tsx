"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import {
  updateOrderStatusAction,
  setOrderNotesAction,
  deleteOrderAction,
} from "@/app/actions/admin";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";
import { cn } from "@/lib/utils";

const NEXT_LABEL: Record<OrderStatus, string> = {
  pending: "Mark pending",
  confirmed: "Confirm order",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

export function OrderStatusControls({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const setStatus = (status: OrderStatus) => {
    if (status === current) return;
    if (
      status === "cancelled" &&
      !confirm("Cancel this order? Its stock will be returned to inventory.")
    ) {
      return;
    }
    setBusy(status);
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, status);
      setBusy(null);
      if (res.ok) {
        toast(
          status === "shipped"
            ? "Marked shipped — the customer has been emailed."
            : `Order ${NEXT_LABEL[status].toLowerCase().replace("mark ", "marked ")}.`
        );
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't update the status.", "error");
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ORDER_STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => setStatus(s)}
          disabled={pending || s === current}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors disabled:cursor-default",
            s === current
              ? "border-walnut bg-walnut text-ivory"
              : s === "cancelled"
                ? "border-line text-madder hover:border-madder disabled:opacity-40"
                : "border-line text-bark hover:border-walnut hover:text-walnut disabled:opacity-40",
            busy === s && "animate-pulse"
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function DeleteOrderButton({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const remove = () => {
    if (
      !confirm(
        `Delete ${orderNumber} permanently?\n\nUse this for fake or bogus orders. The order disappears from every list and its stock is NOT returned — cancel the order first if you want the stock back. This can't be undone.`
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteOrderAction(orderId);
      if (res.ok) {
        toast(`${orderNumber} deleted.`);
        router.push("/admin/orders");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't delete the order.", "error");
      }
    });
  };

  return (
    <Button variant="danger" size="sm" onClick={remove} loading={pending}>
      <Trash2 className="h-4 w-4" /> Delete order
    </Button>
  );
}

export function OrderNotesForm({
  orderId,
  initialNotes,
}: {
  orderId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Only staff see these — courier booking id, follow-up reminders, etc."
        rows={3}
      />
      <Button
        size="sm"
        variant="outline"
        className="mt-2.5"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await setOrderNotesAction(orderId, notes);
            if (res.ok) toast("Notes saved.");
            else toast(res.error ?? "Couldn't save notes.", "error");
          })
        }
      >
        Save notes
      </Button>
    </div>
  );
}
