"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PaymentForm, type PaymentValues } from "@/components/payment-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api-client";
import { formatFullDate } from "@/lib/date";

/** Botão que abre o registro/alteração do pagamento de uma consulta. */
export function PaymentDialog({
  trigger,
  sessionId,
  patientName,
  sessionDate,
  initial,
  today,
}: {
  trigger: React.ReactElement;
  sessionId: string;
  patientName: string;
  sessionDate: string;
  initial: PaymentValues;
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Pagamento</DialogTitle>
          <DialogDescription>
            {patientName} · consulta de {formatFullDate(sessionDate)}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <PaymentForm
            initial={initial.paymentStatus === "PENDING" ? { ...initial, paymentStatus: "PAID" } : initial}
            today={today}
            onCancel={() => setOpen(false)}
            onSubmit={async (values) => {
              const result = await apiRequest(`/api/admin/sessions/${sessionId}/payment`, "PATCH", values);
              if (!result.ok) return result.error;
              toast.success(values.paymentStatus === "PAID" ? "Pagamento registrado" : "Pagamento atualizado");
              setOpen(false);
              router.refresh();
              return null;
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
