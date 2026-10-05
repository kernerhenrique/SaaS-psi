import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FilePen, FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { PatientAvatar } from "@/components/patient-avatar";
import { formatFullDate } from "@/lib/date";
import { requireAdminSession } from "@/server/modules/auth/session";
import { listReports, type PatientReportSummary, type ReportListItem } from "@/server/modules/report/report.service";

export const metadata: Metadata = { title: "Relatórios" };

export default async function ReportsPage() {
  const session = await requireAdminSession();
  const { patients, ready } = await listReports(session.businessId);

  return (
    <div className="space-y-10">
      <FadeIn>
        <PageHeader
          title="Relatórios"
          description="O prontuário de cada paciente acumula um bloco por consulta documentada. Revise, salve e imprima ou gere o PDF."
        />
      </FadeIn>

      <FadeIn delay={0.05} className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FilePen className="size-5 text-muted-foreground" />
          Prontos para gerar
        </h2>
        <p className="text-sm text-muted-foreground">Consultas dos últimos 90 dias com anotações e sem relatório.</p>
        {ready.length === 0 ? (
          <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
            Nenhuma consulta pendente. Ao escrever as anotações de uma consulta, ela aparece aqui.
          </p>
        ) : (
          <ReadyList items={ready} />
        )}
      </FadeIn>

      <FadeIn delay={0.1} className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="size-5 text-muted-foreground" />
          Prontuários
        </h2>
        {patients.length === 0 ? (
          <EmptyState
            title="Nenhum prontuário ainda"
            description="Escolha uma consulta acima para gerar o primeiro bloco do relatório de um paciente."
          />
        ) : (
          <PatientList items={patients} />
        )}
      </FadeIn>
    </div>
  );
}

function ReadyList({ items }: { items: ReportListItem[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={item.sessionId}>
          <Link
            href={`/admin/relatorios/${item.sessionId}`}
            className="group flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-foreground/5 transition hover:-translate-y-0.5 hover:ring-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <PatientAvatar name={item.patientName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.patientName}</p>
              <p className="text-xs text-muted-foreground">
                {item.typeName} de {formatFullDate(item.sessionDate)}
              </p>
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              Gerar relatório
              <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PatientList({ items }: { items: PatientReportSummary[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={item.patientId}>
          <Link
            href={`/admin/relatorios/paciente/${item.patientId}`}
            className="group flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-foreground/5 transition hover:-translate-y-0.5 hover:ring-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <PatientAvatar name={item.patientName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.patientName}</p>
              <p className="text-xs text-muted-foreground">
                {item.sessionCount} {item.sessionCount === 1 ? "consulta documentada" : "consultas documentadas"}
              </p>
              <p className="text-xs text-muted-foreground">
                Atualizado em {formatFullDate(item.lastUpdatedAt.slice(0, 10))}
              </p>
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              Abrir
              <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
