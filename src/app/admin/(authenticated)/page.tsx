import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarDays, Clock, HandCoins, Plus, Sparkles, Wallet } from "lucide-react";
import { cn } from "cn";

import { CopyMessageButton } from "@/components/copy-message-button";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { PatientAvatar } from "@/components/patient-avatar";
import { StatTile } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceFromCents } from "@/lib/currency";
import { formatDateLabel, formatShortDate, utcToLocalMinutes } from "@/lib/date";
import { renderMessageTemplate } from "@/lib/message-template";
import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getDashboardData, RETURN_INVITE_AFTER_DAYS } from "@/server/modules/dashboard/dashboard.service";
import { getMessageTemplates } from "@/server/modules/message/message-template.service";

export const metadata: Metadata = { title: "Início" };

function greetingFor(localMinutes: number): string {
  const hour = Math.floor(localMinutes / 60);
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// "quinta-feira, 24 de setembro" → "Quinta-feira, 24 de setembro" (a classe CSS `capitalize` afetaria toda palavra).
function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function firstName(fullName: string | null): string {
  return fullName?.split(" ")[0] ?? "";
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export default async function DashboardPage() {
  const session = await requireAdminSession();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    redirect("/admin/login");
  }
  const [data, templates] = await Promise.all([
    getDashboardData(session.businessId),
    getMessageTemplates(session.businessId),
  ]);

  const { today, timezone } = data;
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(
    new Date(`${today}T12:00:00Z`),
  );
  const remainingToday = data.todaySessions.filter((s) => s.status === "SCHEDULED").length;
  const doneToday = data.todaySessions.filter((s) => s.status === "DONE").length;

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          title={`${greetingFor(utcToLocalMinutes(new Date(), timezone))}, ${firstName(user.name)}`}
          description={
            <>
              {capitalizeFirst(formatDateLabel(today, timezone))}
              {" · "}
              {remainingToday > 0
                ? plural(remainingToday, "consulta ainda hoje", "consultas ainda hoje")
                : "nenhuma consulta restante hoje"}
            </>
          }
          actions={
            <Link href="/admin/agenda?nova=1" className={cn(buttonVariants({ size: "lg" }), "h-10 rounded-xl px-4")}>
              <Plus />
              Nova consulta
            </Link>
          }
        />
      </FadeIn>

      <FadeIn delay={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          icon={CalendarDays}
          tone="sky"
          label="Consultas hoje"
          value={String(data.todaySessions.length)}
          hint={`${plural(doneToday, "realizada", "realizadas")}, ${remainingToday} a seguir`}
        />
        <StatTile
          icon={HandCoins}
          tone="honey"
          label="A receber"
          value={formatPriceFromCents(data.pendingTotalCents)}
          hint={plural(data.pendingPayments.length, "sessão sem pagamento", "sessões sem pagamento")}
        />
        <StatTile
          icon={Wallet}
          tone="sage"
          label={`Recebido em ${monthName}`}
          value={formatPriceFromCents(data.monthReceivedCents)}
          hint="Pagamentos confirmados no mês"
        />
        <StatTile
          icon={CalendarCheck}
          tone="peach"
          label="Aguardando retorno"
          value={String(data.awaitingReturn.length)}
          hint="Pacientes sem próxima consulta"
        />
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-3">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Section title="Consultas de hoje" description="Copie o lembrete para enviar aos pais antes da consulta.">
            {data.todaySessions.length === 0 ? (
              <EmptyState
                title="Nenhuma consulta hoje"
                description="Quando você marcar uma consulta na agenda, ela aparece aqui."
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {data.todaySessions.map((s) => (
                  <li key={s.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-sm font-semibold tabular-nums">{s.startTime}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{s.endTime}</p>
                      </div>
                      <PatientAvatar name={s.patientName} />
                      <div className="min-w-0 space-y-1.5">
                        <p className="truncate font-medium">
                          {s.patientName}
                          {s.patientAge !== null ? (
                            <span className="font-normal text-muted-foreground"> · {s.patientAge} anos</span>
                          ) : null}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={s.isFirstVisit ? "first-visit" : "return-visit"} />
                          {s.status === "DONE" ? <StatusBadge status="done" /> : null}
                          {s.status === "NO_SHOW" ? <StatusBadge status="no-show" /> : null}
                          {s.status === "DONE" ? <StatusBadge status={s.isPaid ? "paid" : "pending"} /> : null}
                        </div>
                      </div>
                    </div>
                    {s.status === "SCHEDULED" ? (
                      <div className="sm:shrink-0">
                        <CopyMessageButton
                          size="sm"
                          label="Copiar lembrete"
                          message={renderMessageTemplate(templates.reminder, {
                            responsavel: firstName(s.guardianName),
                            nomePaciente: firstName(s.patientName),
                            data: `hoje (${formatShortDate(today)})`,
                            hora: s.startTime,
                          })}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </FadeIn>

        <FadeIn delay={0.15}>
          <Section
            title="Para acompanhar"
            description="Pontos que você destacou nas últimas sessões."
            icon={<Sparkles className="size-4 text-tone-honey-foreground" />}
          >
            {data.followUps.length === 0 ? (
              <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                Nada pendente. Ao anotar uma sessão, você pode marcar pontos para acompanhar na próxima.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.followUps.map((f) => (
                  <li key={f.id} className="rounded-xl bg-muted/60 p-3">
                    <p className="text-sm">{f.text}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      {f.patientName}
                      {f.todaySessionTime ? (
                        <>
                          {" · "}
                          <Clock className="size-3" /> hoje às {f.todaySessionTime}
                        </>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </FadeIn>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <Section
            title="Pagamentos pendentes"
            description={`Depois de ${plural(data.paymentReminderDays, "dia", "dias")}, sugerimos uma mensagem de cobrança.`}
          >
            {data.pendingPayments.length === 0 ? (
              <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                Tudo em dia: nenhuma consulta realizada com pagamento pendente.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.pendingPayments.map((p) => (
                  <li key={p.id} className={cn("rounded-xl p-3", p.suggestReminder ? "bg-tone-honey/60" : "bg-muted/60")}>
                    <div className="flex items-center gap-3">
                      <PatientAvatar name={p.patientName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Consulta de {formatShortDate(p.sessionDate)} ·{" "}
                          {p.daysAgo === 0 ? "hoje" : `há ${plural(p.daysAgo, "dia", "dias")}`}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatPriceFromCents(p.amountCents)}</p>
                    </div>
                    {p.suggestReminder ? (
                      <div className="mt-3 flex flex-col gap-2 border-t border-tone-honey-foreground/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-tone-honey-foreground">
                          Sugestão: enviar um lembrete de pagamento
                          {p.guardianName ? ` para ${firstName(p.guardianName)}` : ""}.
                        </p>
                        <CopyMessageButton
                          size="sm"
                          variant="secondary"
                          label="Copiar cobrança"
                          message={renderMessageTemplate(templates["payment-reminder"], {
                            responsavel: firstName(p.guardianName),
                            nomePaciente: firstName(p.patientName),
                            data: formatShortDate(p.sessionDate),
                            valor: formatPriceFromCents(p.amountCents),
                          })}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </FadeIn>

        <FadeIn delay={0.25}>
          <Section
            title="Aguardando retorno"
            description={`Sem próxima consulta há ${RETURN_INVITE_AFTER_DAYS} dias ou mais. Que tal perguntar aos pais?`}
          >
            {data.awaitingReturn.length === 0 ? (
              <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                Todos os pacientes recentes já têm próxima consulta marcada.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.awaitingReturn.map((r) => (
                  <li
                    key={r.patientId}
                    className="flex flex-col gap-3 rounded-xl bg-muted/60 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <PatientAvatar name={r.patientName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Última consulta há {plural(r.daysSinceLastSession, "dia", "dias")}
                        </p>
                      </div>
                    </div>
                    <CopyMessageButton
                      size="sm"
                      label="Copiar convite"
                      message={renderMessageTemplate(templates["return-invite"], {
                        responsavel: firstName(r.guardianName),
                        nomePaciente: firstName(r.patientName),
                      })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </FadeIn>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="h-full rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 sm:p-6">
      <header className="mb-5 space-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {icon}
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
