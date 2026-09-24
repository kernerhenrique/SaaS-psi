import Link from "next/link";
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
import { addDaysToIsoDate, formatDateLabel, todayInTimeZone, utcToLocalMinutes } from "@/lib/date";
import { DEFAULT_MESSAGE_TEMPLATES, renderMessageTemplate } from "@/lib/message-template";
import { prisma } from "@/server/db/prisma";
import { getAdminSession } from "@/server/modules/auth/session";

import {
  MOCK_AWAITING_RETURN,
  MOCK_FOLLOW_UPS,
  MOCK_MONTH_RECEIVED_CENTS,
  MOCK_PENDING_PAYMENTS,
  MOCK_TODAY_SESSIONS,
} from "./dashboard-mock";

// A partir de quantos dias pendente o dashboard sugere a mensagem de cobrança.
// Vira configuração da psicóloga (Business.paymentReminderDays) na Fase 2.
const PAYMENT_REMINDER_DAYS = 3;

function greetingFor(localMinutes: number): string {
  const hour = Math.floor(localMinutes / 60);
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function shortDate(dateISO: string): string {
  const [, month, day] = dateISO.split("-");
  return `${day}/${month}`;
}

// "quinta-feira, 24 de setembro" → "Quinta-feira, 24 de setembro" (a classe CSS `capitalize` afetaria toda palavra).
function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

export default async function DashboardPage() {
  const session = await getAdminSession();
  const [user, business] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session!.userId } }),
    prisma.business.findUniqueOrThrow({ where: { id: session!.businessId } }),
  ]);

  const today = todayInTimeZone(business.timezone);
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(
    new Date(`${today}T12:00:00Z`),
  );
  const pendingTotal = MOCK_PENDING_PAYMENTS.reduce((sum, p) => sum + p.amountCents, 0);
  const remainingToday = MOCK_TODAY_SESSIONS.filter((s) => s.status === "scheduled").length;

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          title={`${greetingFor(utcToLocalMinutes(new Date(), business.timezone))}, ${firstName(user.name)}`}
          description={
            <>
              {capitalizeFirst(formatDateLabel(today, business.timezone))}
              {" · "}
              {remainingToday > 0
                ? `${remainingToday} ${remainingToday === 1 ? "consulta ainda hoje" : "consultas ainda hoje"}`
                : "nenhuma consulta restante hoje"}
            </>
          }
          actions={
            <Link href="/admin/agenda" className={cn(buttonVariants({ size: "lg" }), "h-10 rounded-xl px-4")}>
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
          value={String(MOCK_TODAY_SESSIONS.length)}
          hint={`${MOCK_TODAY_SESSIONS.length - remainingToday} realizada, ${remainingToday} a seguir`}
        />
        <StatTile
          icon={HandCoins}
          tone="honey"
          label="A receber"
          value={formatPriceFromCents(pendingTotal)}
          hint={`${MOCK_PENDING_PAYMENTS.length} sessões sem pagamento`}
        />
        <StatTile
          icon={Wallet}
          tone="sage"
          label={`Recebido em ${monthName}`}
          value={formatPriceFromCents(MOCK_MONTH_RECEIVED_CENTS)}
          hint="Pagamentos confirmados no mês"
        />
        <StatTile
          icon={CalendarCheck}
          tone="peach"
          label="Aguardando retorno"
          value={String(MOCK_AWAITING_RETURN.length)}
          hint="Pacientes sem próxima consulta"
        />
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-3">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Section title="Consultas de hoje" description="Copie o lembrete para enviar aos pais antes da consulta.">
            {MOCK_TODAY_SESSIONS.length === 0 ? (
              <EmptyState
                title="Nenhuma consulta hoje"
                description="Quando você marcar uma consulta na agenda, ela aparece aqui."
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {MOCK_TODAY_SESSIONS.map((s) => (
                  <li key={s.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-sm font-semibold tabular-nums">{s.startTime}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{s.endTime}</p>
                      </div>
                      <PatientAvatar name={s.patientName} />
                      <div className="min-w-0 space-y-1.5">
                        <p className="truncate font-medium">
                          {s.patientName} <span className="font-normal text-muted-foreground">· {s.patientAge} anos</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={s.type} />
                          {s.status === "done" ? <StatusBadge status="done" /> : null}
                          {s.paymentStatus ? <StatusBadge status={s.paymentStatus} /> : null}
                        </div>
                      </div>
                    </div>
                    {s.status === "scheduled" ? (
                      <div className="sm:shrink-0">
                        <CopyMessageButton
                          size="sm"
                          label="Copiar lembrete"
                          message={renderMessageTemplate(DEFAULT_MESSAGE_TEMPLATES.reminder, {
                            responsavel: firstName(s.guardianName),
                            nomePaciente: firstName(s.patientName),
                            data: `hoje (${shortDate(today)})`,
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
            <ul className="space-y-3">
              {MOCK_FOLLOW_UPS.map((f) => (
                <li key={f.id} className="rounded-xl bg-muted/60 p-3">
                  <p className="text-sm">{f.text}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {f.patientName}
                    {f.nextSessionTime ? (
                      <>
                        {" · "}
                        <Clock className="size-3" /> hoje às {f.nextSessionTime}
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        </FadeIn>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <Section
            title="Pagamentos pendentes"
            description={`Depois de ${PAYMENT_REMINDER_DAYS} dias, sugerimos uma mensagem de cobrança.`}
          >
            <ul className="space-y-3">
              {MOCK_PENDING_PAYMENTS.map((p) => {
                const sessionDate = addDaysToIsoDate(today, -p.sessionDaysAgo);
                const suggestReminder = p.sessionDaysAgo >= PAYMENT_REMINDER_DAYS;
                return (
                  <li
                    key={p.id}
                    className={cn("rounded-xl p-3", suggestReminder ? "bg-tone-honey/60" : "bg-muted/60")}
                  >
                    <div className="flex items-center gap-3">
                      <PatientAvatar name={p.patientName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Consulta de {shortDate(sessionDate)} · há {p.sessionDaysAgo}{" "}
                          {p.sessionDaysAgo === 1 ? "dia" : "dias"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatPriceFromCents(p.amountCents)}</p>
                    </div>
                    {suggestReminder ? (
                      <div className="mt-3 flex flex-col gap-2 border-t border-tone-honey-foreground/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-tone-honey-foreground">
                          Sugestão: enviar um lembrete de pagamento para {firstName(p.guardianName)}.
                        </p>
                        <CopyMessageButton
                          size="sm"
                          variant="secondary"
                          label="Copiar cobrança"
                          message={renderMessageTemplate(DEFAULT_MESSAGE_TEMPLATES["payment-reminder"], {
                            responsavel: firstName(p.guardianName),
                            nomePaciente: firstName(p.patientName),
                            data: shortDate(sessionDate),
                            valor: formatPriceFromCents(p.amountCents),
                          })}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Section>
        </FadeIn>

        <FadeIn delay={0.25}>
          <Section
            title="Aguardando retorno"
            description="Pacientes sem próxima consulta marcada. Que tal perguntar aos pais?"
          >
            <ul className="space-y-3">
              {MOCK_AWAITING_RETURN.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 rounded-xl bg-muted/60 p-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <PatientAvatar name={r.patientName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.patientName}</p>
                      <p className="text-xs text-muted-foreground">Última consulta há {r.lastSessionDaysAgo} dias</p>
                    </div>
                  </div>
                  <CopyMessageButton
                    size="sm"
                    label="Copiar convite"
                    message={renderMessageTemplate(DEFAULT_MESSAGE_TEMPLATES["return-invite"], {
                      responsavel: firstName(r.guardianName),
                      nomePaciente: firstName(r.patientName),
                    })}
                  />
                </li>
              ))}
            </ul>
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
