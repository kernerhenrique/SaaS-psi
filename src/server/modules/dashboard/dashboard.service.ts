import type { SessionStatus } from "@/generated/prisma/enums";
import {
  ageInYears,
  daysBetweenIsoDates,
  localDayRangeUtc,
  todayInTimeZone,
  utcToLocalDate,
  utcToLocalMinutes,
} from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { decryptText } from "@/server/crypto/records-cipher";
import { shouldSuggestPaymentReminder } from "@/server/modules/payment/payment-rules";

/** Paciente sem próxima consulta há pelo menos esse tempo aparece em "Aguardando retorno". */
export const RETURN_INVITE_AFTER_DAYS = 14;

export type DashboardTodaySession = {
  id: string;
  startTime: string;
  endTime: string;
  patientName: string;
  patientAge: number | null;
  guardianName: string | null;
  isFirstVisit: boolean;
  status: SessionStatus;
  isPaid: boolean;
};

export type DashboardPendingPayment = {
  id: string;
  patientName: string;
  guardianName: string | null;
  sessionDate: string;
  daysAgo: number;
  amountCents: number;
  suggestReminder: boolean;
};

export type DashboardAwaitingReturn = {
  patientId: string;
  patientName: string;
  guardianName: string | null;
  guardianPhone: string | null;
  daysSinceLastSession: number;
};

export type DashboardFollowUp = {
  id: string;
  patientName: string;
  text: string;
  /** Horário da consulta de hoje desse paciente, se houver. */
  todaySessionTime: string | null;
};

export type DashboardData = {
  today: string;
  timezone: string;
  paymentReminderDays: number;
  todaySessions: DashboardTodaySession[];
  pendingPayments: DashboardPendingPayment[];
  pendingTotalCents: number;
  monthReceivedCents: number;
  awaitingReturn: DashboardAwaitingReturn[];
  followUps: DashboardFollowUp[];
};

type GuardianLike = { name: string; isPrimary: boolean };

function primaryGuardianName(guardians: GuardianLike[]): string | null {
  return (guardians.find((g) => g.isPrimary) ?? guardians[0])?.name ?? null;
}

function toTime(date: Date, timeZone: string): string {
  const minutes = utcToLocalMinutes(date, timeZone);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function toIsoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export async function getDashboardData(businessId: string): Promise<DashboardData> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const timezone = business.timezone;
  const today = todayInTimeZone(timezone);
  const todayRange = localDayRangeUtc(today, timezone);
  // `paidAt` é só data (sem hora), então o mês é comparado em datas UTC puras.
  const [year, month] = today.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));

  const guardiansSelect = { select: { name: true, isPrimary: true } } as const;

  const [todaySessions, pendingSessions, monthReceived, awaitingReturn, followUps] = await Promise.all([
    prisma.session.findMany({
      where: {
        businessId,
        startAt: { gte: todayRange.start, lt: todayRange.end },
        status: { not: "CANCELLED" },
      },
      orderBy: { startAt: "asc" },
      include: {
        sessionType: { select: { isFirstVisit: true } },
        patient: { select: { fullName: true, birthDate: true, guardians: guardiansSelect } },
      },
    }),
    prisma.session.findMany({
      where: { businessId, status: "DONE", paymentStatus: "PENDING" },
      orderBy: { startAt: "asc" },
      include: { patient: { select: { fullName: true, guardians: guardiansSelect } } },
    }),
    prisma.session.aggregate({
      where: { businessId, paymentStatus: "PAID", paidAt: { gte: monthStart, lt: nextMonthStart } },
      _sum: { amountCents: true },
    }),
    listAwaitingReturn(businessId, timezone, today),
    prisma.followUpItem.findMany({
      where: { businessId, doneAt: null, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { patient: { select: { id: true, fullName: true } } },
    }),
  ]);

  const todayTimeByPatient = new Map<string, string>();
  for (const s of todaySessions) {
    if (s.status === "SCHEDULED") todayTimeByPatient.set(s.patientId, toTime(s.startAt, timezone));
  }

  const pendingPayments = pendingSessions.map((s) => {
    const sessionDate = utcToLocalDate(s.startAt, timezone);
    return {
      id: s.id,
      patientName: s.patient.fullName,
      guardianName: primaryGuardianName(s.patient.guardians),
      sessionDate,
      daysAgo: daysBetweenIsoDates(sessionDate, today),
      amountCents: s.amountCents,
      suggestReminder: shouldSuggestPaymentReminder(sessionDate, today, business.paymentReminderDays),
    };
  });

  return {
    today,
    timezone,
    paymentReminderDays: business.paymentReminderDays,
    todaySessions: todaySessions.map((s) => {
      const birthDate = toIsoDate(s.patient.birthDate);
      return {
        id: s.id,
        startTime: toTime(s.startAt, timezone),
        endTime: toTime(s.endAt, timezone),
        patientName: s.patient.fullName,
        patientAge: birthDate ? ageInYears(birthDate, today) : null,
        guardianName: primaryGuardianName(s.patient.guardians),
        isFirstVisit: s.sessionType.isFirstVisit,
        status: s.status,
        isPaid: s.paymentStatus === "PAID",
      };
    }),
    pendingPayments,
    pendingTotalCents: pendingPayments.reduce((sum, p) => sum + p.amountCents, 0),
    monthReceivedCents: monthReceived._sum.amountCents ?? 0,
    awaitingReturn,
    followUps: followUps.map((f) => ({
      id: f.id,
      patientName: f.patient.fullName,
      text: decryptText(f.text),
      todaySessionTime: todayTimeByPatient.get(f.patient.id) ?? null,
    })),
  };
}

/**
 * Pacientes sem próxima consulta: a consulta mais recente (realizada ou
 * agendada) decide — se for agendada, o retorno já está marcado; se for
 * realizada há pelo menos RETURN_INVITE_AFTER_DAYS, o paciente aparece aqui.
 */
export async function listAwaitingReturn(
  businessId: string,
  timezone: string,
  today: string,
): Promise<DashboardAwaitingReturn[]> {
  const patients = await prisma.patient.findMany({
    where: { businessId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      guardians: { select: { name: true, phone: true, isPrimary: true } },
      sessions: {
        where: { status: { in: ["DONE", "SCHEDULED"] } },
        orderBy: { startAt: "desc" },
        take: 1,
        select: { status: true, startAt: true },
      },
    },
  });

  return patients
    .flatMap((p) => {
      const last = p.sessions[0];
      if (!last || last.status !== "DONE") return [];
      const days = daysBetweenIsoDates(utcToLocalDate(last.startAt, timezone), today);
      if (days < RETURN_INVITE_AFTER_DAYS) return [];
      const guardian = p.guardians.find((g) => g.isPrimary) ?? p.guardians[0];
      return [
        {
          patientId: p.id,
          patientName: p.fullName,
          guardianName: guardian?.name ?? null,
          guardianPhone: guardian?.phone ?? null,
          daysSinceLastSession: days,
        },
      ];
    })
    .sort((a, b) => b.daysSinceLastSession - a.daysSinceLastSession);
}
