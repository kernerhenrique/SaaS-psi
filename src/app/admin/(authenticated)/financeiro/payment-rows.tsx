"use client";

import { Pencil } from "lucide-react";

import { PaymentDialog } from "@/components/payment-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatPriceFromCents } from "@/lib/currency";
import { formatFullDate } from "@/lib/date";
import type { PaymentRow } from "@/lib/finance";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_BADGE } from "@/lib/labels";

/** Lista de pagamentos com opção de corrigir cada um (usada em "Recebidos" e "Por paciente"). */
export function PaymentRows({
  rows,
  today,
  showPatient,
}: {
  rows: PaymentRow[];
  today: string;
  showPatient: boolean;
}) {
  return (
    <ul className="divide-y divide-border/70 rounded-2xl bg-card px-4 shadow-soft ring-1 ring-foreground/5 sm:px-5">
      {rows.map((r) => (
        <li key={r.sessionId} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {showPatient ? r.patientName : `${r.typeName} de ${formatFullDate(r.sessionDate)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {showPatient ? `${r.typeName} de ${formatFullDate(r.sessionDate)} · ` : ""}
              {r.paymentStatus === "PAID"
                ? [r.paymentMethod ? PAYMENT_METHOD_LABELS[r.paymentMethod] : null, r.paidAt ? `recebido em ${formatFullDate(r.paidAt)}` : null]
                    .filter(Boolean)
                    .join(" · ")
                : r.status === "NO_SHOW"
                  ? "Falta"
                  : "Aguardando pagamento"}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <StatusBadge status={PAYMENT_STATUS_BADGE[r.paymentStatus]} />
            <p className="flex-1 text-sm font-semibold tabular-nums sm:w-24 sm:flex-none sm:text-right">
              {formatPriceFromCents(r.amountCents)}
            </p>
            <PaymentDialog
              sessionId={r.sessionId}
              patientName={r.patientName}
              sessionDate={r.sessionDate}
              initial={r}
              today={today}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Alterar pagamento de ${r.patientName}`} title="Alterar pagamento">
                  <Pencil />
                </Button>
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
