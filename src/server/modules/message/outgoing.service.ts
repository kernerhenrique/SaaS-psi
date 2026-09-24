import { addDaysToIsoDate, localDayRangeUtc, minutesToTime, todayInTimeZone, utcToLocalDate, utcToLocalMinutes } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { listAwaitingReturn, type DashboardAwaitingReturn } from "@/server/modules/dashboard/dashboard.service";
import { listReceivables, type ReceivableRow } from "@/server/modules/finance/finance.service";

export type UpcomingReminder = {
  sessionId: string;
  patientName: string;
  guardianName: string | null;
  guardianPhone: string | null;
  date: string;
  time: string;
};

export type OutgoingMessages = {
  today: string;
  timezone: string;
  paymentReminderDays: number;
  reminders: UpcomingReminder[];
  payments: ReceivableRow[];
  returns: DashboardAwaitingReturn[];
};

/** Tudo o que vale a pena enviar agora: lembretes de hoje/amanhã, cobranças e convites de retorno. */
export async function listOutgoingMessages(businessId: string): Promise<OutgoingMessages> {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { timezone: true, paymentReminderDays: true },
  });
  const { timezone } = business;
  const today = todayInTimeZone(timezone);

  const [sessions, receivables, returns] = await Promise.all([
    prisma.session.findMany({
      where: {
        businessId,
        status: "SCHEDULED",
        // Do momento atual até o fim de amanhã.
        startAt: { gte: new Date(), lt: localDayRangeUtc(addDaysToIsoDate(today, 1), timezone).end },
      },
      orderBy: { startAt: "asc" },
      include: {
        patient: {
          select: {
            fullName: true,
            guardians: { select: { name: true, phone: true }, orderBy: { isPrimary: "desc" }, take: 1 },
          },
        },
      },
    }),
    listReceivables(businessId),
    listAwaitingReturn(businessId, timezone, today),
  ]);

  return {
    today,
    timezone,
    paymentReminderDays: business.paymentReminderDays,
    reminders: sessions.map((s) => ({
      sessionId: s.id,
      patientName: s.patient.fullName,
      guardianName: s.patient.guardians[0]?.name ?? null,
      guardianPhone: s.patient.guardians[0]?.phone ?? null,
      date: utcToLocalDate(s.startAt, timezone),
      time: minutesToTime(utcToLocalMinutes(s.startAt, timezone)),
    })),
    payments: receivables.filter((r) => r.suggestReminder),
    returns,
  };
}
