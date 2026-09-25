import type { Metadata } from "next";

import { startOfWeekIso } from "@/lib/date";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getBusinessToday } from "@/server/modules/business/business.service";
import { getMessageTemplates } from "@/server/modules/message/message-template.service";
import { getAgendaOptions, listSessionsForRange, weekRange } from "@/server/modules/session/session.service";
import { prisma } from "@/server/db/prisma";

import { AgendaView } from "./agenda-view";

export const metadata: Metadata = { title: "Agenda" };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function AgendaPage({ searchParams }: PageProps<"/admin/agenda">) {
  const session = await requireAdminSession();
  const { data, nova, paciente } = await searchParams;
  const today = await getBusinessToday(session.businessId);

  // ?data=YYYY-MM-DD escolhe o dia/semana exibidos; sem ela, mostra hoje.
  const selectedDate = typeof data === "string" && DATE_PATTERN.test(data) ? data : today;
  const weekStart = startOfWeekIso(selectedDate);
  const { from, to } = weekRange(weekStart);

  const [sessions, options, templates, business] = await Promise.all([
    listSessionsForRange(session.businessId, from, to),
    getAgendaOptions(session.businessId),
    getMessageTemplates(session.businessId),
    prisma.business.findUniqueOrThrow({ where: { id: session.businessId }, select: { timezone: true } }),
  ]);

  return (
    <AgendaView
      // Remonta ao trocar de semana, para o estado de visualização começar limpo.
      key={weekStart}
      today={today}
      timezone={business.timezone}
      selectedDate={selectedDate}
      weekStart={weekStart}
      sessions={sessions}
      options={options}
      reminderTemplate={templates.reminder}
      // ?nova=1 (e opcionalmente &paciente=ID) já abre o formulário de nova consulta.
      openNewSession={nova === "1"}
      initialPatientId={typeof paciente === "string" ? paciente : undefined}
    />
  );
}
