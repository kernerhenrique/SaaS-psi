"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { cn } from "cn";

import { CopyMessageButton } from "@/components/copy-message-button";
import { EmptyState } from "@/components/empty-state";
import { PatientAvatar } from "@/components/patient-avatar";
import { PaymentDialog } from "@/components/payment-dialog";
import { Button } from "@/components/ui/button";
import { formatPriceFromCents } from "@/lib/currency";
import { formatFullDate, formatShortDate } from "@/lib/date";
import { renderMessageTemplate } from "@/lib/message-template";
import type { ReceivableRow } from "@/server/modules/finance/finance.service";

function firstName(name: string | null): string {
  return name?.split(" ")[0] ?? "";
}

export function ReceivablesPanel({
  rows,
  today,
  template,
}: {
  rows: ReceivableRow[];
  today: string;
  template: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Tudo em dia"
        description="Nenhuma consulta realizada está esperando pagamento."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Consultas já realizadas que ainda não foram pagas, da mais antiga para a mais recente.
      </p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.sessionId}
            className={cn(
              "rounded-2xl p-4 shadow-soft ring-1 ring-foreground/5",
              r.suggestReminder ? "bg-tone-honey/50" : "bg-card",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <PatientAvatar name={r.patientName} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/pacientes/${r.patientId}`} className="block truncate text-sm font-medium hover:underline">
                    {r.patientName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {r.typeName} de {formatFullDate(r.sessionDate)} ·{" "}
                    {r.daysPending === 0 ? "hoje" : `há ${r.daysPending} ${r.daysPending === 1 ? "dia" : "dias"}`}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPriceFromCents(r.amountCents)}</p>
              </div>
              <PaymentDialog
                sessionId={r.sessionId}
                patientName={r.patientName}
                sessionDate={r.sessionDate}
                initial={r}
                today={today}
                trigger={
                  <Button size="sm" className="h-9 w-full sm:h-7 sm:w-auto">
                    <Wallet />
                    Registrar pagamento
                  </Button>
                }
              />
            </div>
            {r.suggestReminder ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-tone-honey-foreground/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-tone-honey-foreground">
                  Sugestão: enviar um lembrete de pagamento{r.guardianName ? ` para ${firstName(r.guardianName)}` : ""}.
                </p>
                <CopyMessageButton
                  size="sm"
                  variant="secondary"
                  label="Copiar cobrança"
                  message={renderMessageTemplate(template, {
                    responsavel: firstName(r.guardianName),
                    nomePaciente: firstName(r.patientName),
                    data: formatShortDate(r.sessionDate),
                    valor: formatPriceFromCents(r.amountCents),
                  })}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
