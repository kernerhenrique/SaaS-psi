import { StatTile } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { formatPriceFromCents } from "@/lib/currency";
import { formatFullDate } from "@/lib/date";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_BADGE } from "@/lib/labels";
import type { PatientSessionDto } from "@/server/modules/patient/patient.service";
import { CircleCheck, HandCoins } from "lucide-react";

/** Histórico de pagamentos do paciente (a edição do pagamento chega na etapa do Financeiro). */
export function PaymentsPanel({ sessions }: { sessions: PatientSessionDto[] }) {
  // Só consultas realizadas (ou faltas) entram na conta; as agendadas ainda não geram cobrança.
  const billable = sessions.filter((s) => s.status === "DONE" || s.status === "NO_SHOW");
  const paid = billable.filter((s) => s.paymentStatus === "PAID").reduce((sum, s) => sum + s.amountCents, 0);
  const pending = billable
    .filter((s) => s.status === "DONE" && s.paymentStatus === "PENDING")
    .reduce((sum, s) => sum + s.amountCents, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:max-w-lg">
        <StatTile icon={CircleCheck} tone="sage" label="Total pago" value={formatPriceFromCents(paid)} hint="Desde o início" />
        <StatTile icon={HandCoins} tone="honey" label="A receber" value={formatPriceFromCents(pending)} hint="Consultas realizadas" />
      </div>

      {billable.length === 0 ? (
        <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">Nenhuma consulta realizada ainda.</p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-2xl bg-card px-5 shadow-soft ring-1 ring-foreground/5">
          {billable.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {formatFullDate(s.date)} <span className="font-normal text-muted-foreground">· {s.typeName}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.paymentStatus === "PAID"
                    ? [s.paymentMethod ? PAYMENT_METHOD_LABELS[s.paymentMethod] : null, s.paidAt ? `recebido em ${formatFullDate(s.paidAt)}` : null]
                        .filter(Boolean)
                        .join(" · ")
                    : s.status === "NO_SHOW"
                      ? "Falta"
                      : "Aguardando pagamento"}
                </p>
              </div>
              <StatusBadge status={PAYMENT_STATUS_BADGE[s.paymentStatus]} />
              <p className="w-24 text-right text-sm font-semibold tabular-nums">{formatPriceFromCents(s.amountCents)}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Para registrar ou corrigir um pagamento, use a tela Financeiro (em construção).
      </p>
    </div>
  );
}
