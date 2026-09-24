"use client";

import { useRouter } from "next/navigation";
import { HandCoins, History, ReceiptText, Wallet } from "lucide-react";

import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { formatPriceFromCents } from "@/lib/currency";
import { MONTH_NAMES, sumCents, type PaymentRow } from "@/lib/finance";
import type { ReceivableRow } from "@/server/modules/finance/finance.service";

import { PatientPanel } from "./patient-panel";
import { ReceivablesPanel } from "./receivables-panel";
import { periodParam, type Period } from "./period";
import { ReceivedPanel } from "./received-panel";

export type FinanceTab = "receber" | "recebidos" | "paciente";

export function FinanceView({
  today,
  tab,
  period,
  receivables,
  received,
  monthReceivedCents,
  yearReceivedCents,
  patients,
  selectedPatientId,
  patientRows,
  paymentReminderTemplate,
}: {
  today: string;
  tab: FinanceTab;
  period: Period;
  receivables: ReceivableRow[];
  received: PaymentRow[];
  monthReceivedCents: number;
  yearReceivedCents: number;
  patients: { id: string; fullName: string }[];
  selectedPatientId: string | null;
  patientRows: PaymentRow[] | null;
  paymentReminderTemplate: string;
}) {
  const router = useRouter();
  const currentMonthName = MONTH_NAMES[Number(today.slice(5, 7)) - 1];
  const overdue = receivables.filter((r) => r.suggestReminder).length;

  function changeTab(next: FinanceTab) {
    const params = new URLSearchParams({ aba: next });
    if (next === "recebidos") params.set("periodo", periodParam(period));
    if (next === "paciente" && selectedPatientId) params.set("paciente", selectedPatientId);
    router.push(`/admin/financeiro?${params}`, { scroll: false });
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          title="Financeiro"
          description="Os pagamentos são feitos direto para você; aqui você só registra e acompanha."
        />
      </FadeIn>

      <FadeIn delay={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile
          icon={Wallet}
          tone="sage"
          label={`Recebido em ${currentMonthName}`}
          value={formatPriceFromCents(monthReceivedCents)}
          hint="Pela data em que o dinheiro entrou"
        />
        <StatTile
          icon={HandCoins}
          tone="honey"
          label="A receber"
          value={formatPriceFromCents(sumCents(receivables))}
          hint={
            receivables.length === 0
              ? "Nenhuma pendência"
              : `${receivables.length} ${receivables.length === 1 ? "consulta" : "consultas"}${
                  overdue ? ` · ${overdue} para cobrar` : ""
                }`
          }
        />
        <StatTile
          icon={ReceiptText}
          tone="sky"
          label={`Recebido em ${today.slice(0, 4)}`}
          value={formatPriceFromCents(yearReceivedCents)}
          hint="Total do ano, útil para o imposto de renda"
          className="col-span-2 lg:col-span-1"
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <Tabs value={tab} onValueChange={(value) => changeTab(value as FinanceTab)}>
          <TabsList>
            <TabsTab value="receber">
              <HandCoins />
              A receber{receivables.length ? ` (${receivables.length})` : ""}
            </TabsTab>
            <TabsTab value="recebidos">
              <Wallet />
              Recebidos
            </TabsTab>
            <TabsTab value="paciente">
              <History />
              Por paciente
            </TabsTab>
          </TabsList>

          <TabsPanel value="receber">
            <ReceivablesPanel rows={receivables} today={today} template={paymentReminderTemplate} />
          </TabsPanel>
          <TabsPanel value="recebidos">
            <ReceivedPanel rows={received} period={period} today={today} />
          </TabsPanel>
          <TabsPanel value="paciente">
            <PatientPanel
              patients={patients}
              selectedPatientId={selectedPatientId}
              rows={patientRows}
              today={today}
            />
          </TabsPanel>
        </Tabs>
      </FadeIn>
    </div>
  );
}
