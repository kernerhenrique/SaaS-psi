import type { Metadata } from "next";

import type { PaymentRow } from "@/lib/finance";
import { NotFoundError } from "@/server/errors";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getBusinessToday } from "@/server/modules/business/business.service";
import { listPatientPayments, listReceivables, listReceived } from "@/server/modules/finance/finance.service";
import { getMessageTemplates } from "@/server/modules/message/message-template.service";
import { getAgendaOptions } from "@/server/modules/session/session.service";

import { FinanceView, type FinanceTab } from "./finance-view";
import { parsePeriod, periodRange } from "./period";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinancePage({ searchParams }: PageProps<"/admin/financeiro">) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const today = await getBusinessToday(session.businessId);

  const tab: FinanceTab = params.aba === "recebidos" || params.aba === "paciente" ? params.aba : "receber";
  const period = parsePeriod(params.periodo, today);
  const currentMonth = parsePeriod(undefined, today);
  const patientId = typeof params.paciente === "string" ? params.paciente : null;

  const currentYear = { kind: "year" as const, year: currentMonth.year };

  const [receivables, received, monthReceived, yearReceived, templates, options] = await Promise.all([
    listReceivables(session.businessId),
    tab === "recebidos" ? listReceived(session.businessId, periodRange(period).from, periodRange(period).to) : [],
    listReceived(session.businessId, periodRange(currentMonth).from, periodRange(currentMonth).to),
    listReceived(session.businessId, periodRange(currentYear).from, periodRange(currentYear).to),
    getMessageTemplates(session.businessId),
    getAgendaOptions(session.businessId),
  ]);

  let patientRows: PaymentRow[] | null = null;
  if (tab === "paciente" && patientId) {
    try {
      patientRows = await listPatientPayments(session.businessId, patientId);
    } catch (error) {
      // Paciente inexistente ou de outra conta: mostra a aba sem ninguém selecionado.
      if (!(error instanceof NotFoundError)) throw error;
    }
  }

  return (
    <FinanceView
      today={today}
      tab={tab}
      period={period}
      receivables={receivables}
      received={received}
      monthReceivedCents={monthReceived.reduce((sum, r) => sum + r.amountCents, 0)}
      yearReceivedCents={yearReceived.reduce((sum, r) => sum + r.amountCents, 0)}
      patients={options.patients}
      selectedPatientId={patientRows ? patientId : null}
      patientRows={patientRows}
      paymentReminderTemplate={templates["payment-reminder"]}
    />
  );
}
