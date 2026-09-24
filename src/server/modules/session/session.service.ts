import type { PaymentMethod, PaymentStatus, SessionStatus } from "@/generated/prisma/enums";
import { addDaysToIsoDate, localDayRangeUtc, localMinutesToUtc, utcToLocalDate, utcToLocalMinutes } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

import type { CreateSessionInput, PaymentInput, SessionScheduleInput } from "./session.parse";

export type AgendaSession = {
  id: string;
  patientId: string;
  patientName: string;
  guardianName: string | null;
  guardianPhone: string | null;
  sessionTypeId: string;
  typeName: string;
  isFirstVisit: boolean;
  date: string;
  startMinute: number;
  endMinute: number;
  status: SessionStatus;
  amountCents: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  hasNote: boolean;
};

const OVERLAP_MESSAGE = "Já existe uma consulta nesse horário. Escolha outro horário.";

async function getTimezone(businessId: string): Promise<string> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { timezone: true } });
  return business.timezone;
}

/** Consultas (exceto canceladas) entre `fromISO` (inclusive) e `toISO` (exclusive), no fuso da psicóloga. */
export async function listSessionsForRange(businessId: string, fromISO: string, toISO: string): Promise<AgendaSession[]> {
  const timezone = await getTimezone(businessId);
  const sessions = await prisma.session.findMany({
    where: {
      businessId,
      status: { not: "CANCELLED" },
      startAt: { gte: localDayRangeUtc(fromISO, timezone).start, lt: localDayRangeUtc(toISO, timezone).start },
    },
    orderBy: { startAt: "asc" },
    include: {
      sessionType: { select: { name: true, isFirstVisit: true } },
      note: { select: { id: true, deletedAt: true } },
      patient: {
        select: {
          fullName: true,
          guardians: { select: { name: true, phone: true }, orderBy: { isPrimary: "desc" }, take: 1 },
        },
      },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    patientId: s.patientId,
    patientName: s.patient.fullName,
    guardianName: s.patient.guardians[0]?.name ?? null,
    guardianPhone: s.patient.guardians[0]?.phone ?? null,
    sessionTypeId: s.sessionTypeId,
    typeName: s.sessionType.name,
    isFirstVisit: s.sessionType.isFirstVisit,
    date: utcToLocalDate(s.startAt, timezone),
    startMinute: utcToLocalMinutes(s.startAt, timezone),
    // Consulta que termina à meia-noite vira 1440 (e não 0) para a grade.
    endMinute: utcToLocalMinutes(s.endAt, timezone) || 24 * 60,
    status: s.status,
    amountCents: s.amountCents,
    paymentStatus: s.paymentStatus,
    paymentMethod: s.paymentMethod,
    paidAt: s.paidAt ? s.paidAt.toISOString().slice(0, 10) : null,
    hasNote: Boolean(s.note && !s.note.deletedAt),
  }));
}

function toInstants(schedule: SessionScheduleInput, timezone: string) {
  const startAt = localMinutesToUtc(schedule.date, schedule.startMinute, timezone);
  return { startAt, endAt: new Date(startAt.getTime() + schedule.durationMin * 60_000) };
}

/** Checagem amigável antes de gravar; a restrição do banco cobre gravações simultâneas. */
async function assertNoOverlap(businessId: string, startAt: Date, endAt: Date, ignoreSessionId?: string) {
  const conflict = await prisma.session.findFirst({
    where: {
      businessId,
      status: { not: "CANCELLED" },
      id: ignoreSessionId ? { not: ignoreSessionId } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });
  if (conflict) throw new ValidationError(OVERLAP_MESSAGE);
}

/** Traduz a violação da restrição `no_overlapping_sessions` para a mensagem amigável. */
async function withOverlapGuard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && error.message.includes("no_overlapping_sessions")) {
      throw new ValidationError(OVERLAP_MESSAGE);
    }
    throw error;
  }
}

async function findSession(businessId: string, sessionId: string) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, businessId },
    select: { id: true, status: true, paymentStatus: true, startAt: true, endAt: true },
  });
  if (!session) throw new NotFoundError("Consulta não encontrada");
  return session;
}

export async function createSession(businessId: string, input: CreateSessionInput): Promise<{ id: string }> {
  const [timezone, patient, sessionType] = await Promise.all([
    getTimezone(businessId),
    prisma.patient.findFirst({ where: { id: input.patientId, businessId, deletedAt: null }, select: { id: true } }),
    prisma.sessionType.findFirst({ where: { id: input.sessionTypeId, businessId }, select: { id: true } }),
  ]);
  if (!patient) throw new ValidationError("Paciente não encontrado.");
  if (!sessionType) throw new ValidationError("Tipo de consulta não encontrado.");

  const { startAt, endAt } = toInstants(input, timezone);
  await assertNoOverlap(businessId, startAt, endAt);

  return withOverlapGuard(() =>
    prisma.session.create({
      data: {
        businessId,
        patientId: input.patientId,
        sessionTypeId: input.sessionTypeId,
        startAt,
        endAt,
        amountCents: input.amountCents,
      },
      select: { id: true },
    }),
  );
}

export async function rescheduleSession(businessId: string, sessionId: string, schedule: SessionScheduleInput) {
  const [timezone, session] = await Promise.all([getTimezone(businessId), findSession(businessId, sessionId)]);
  if (session.status === "CANCELLED") throw new ValidationError("Reabra a consulta antes de remarcar.");

  const { startAt, endAt } = toInstants(schedule, timezone);
  await assertNoOverlap(businessId, startAt, endAt, sessionId);
  await withOverlapGuard(() => prisma.session.update({ where: { id: sessionId }, data: { startAt, endAt } }));
}

/**
 * Muda a situação da consulta. Falta e cancelamento passam o pagamento
 * pendente para "Não vai pagar" (a psicóloga resolve pelo WhatsApp e pode
 * mudar depois); reabrir desfaz isso.
 */
export async function setSessionStatus(businessId: string, sessionId: string, status: SessionStatus) {
  const session = await findSession(businessId, sessionId);

  let paymentStatus = session.paymentStatus;
  if ((status === "CANCELLED" || status === "NO_SHOW") && paymentStatus === "PENDING") paymentStatus = "WONT_PAY";
  if ((status === "SCHEDULED" || status === "DONE") && paymentStatus === "WONT_PAY") paymentStatus = "PENDING";

  // Voltar de cancelada volta a ocupar o horário: precisa estar livre.
  if (session.status === "CANCELLED" && status !== "CANCELLED") {
    await assertNoOverlap(businessId, session.startAt, session.endAt, sessionId);
  }

  await withOverlapGuard(() =>
    prisma.session.update({ where: { id: sessionId }, data: { status, paymentStatus } }),
  );
}

export async function updateSessionPayment(businessId: string, sessionId: string, input: PaymentInput) {
  await findSession(businessId, sessionId);
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      paymentStatus: input.paymentStatus,
      paymentMethod: input.paymentMethod,
      paidAt: input.paidAt ? new Date(`${input.paidAt}T00:00:00Z`) : null,
      amountCents: input.amountCents,
    },
  });
}

/** Dados auxiliares da agenda: pacientes (com sugestão de tipo) e tipos de consulta ativos. */
export async function getAgendaOptions(businessId: string) {
  const [patients, sessionTypes] = await Promise.all([
    prisma.patient.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        _count: { select: { sessions: { where: { status: { in: ["DONE", "SCHEDULED"] } } } } },
      },
    }),
    prisma.sessionType.findMany({
      where: { businessId, active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, priceCents: true, durationMin: true, isFirstVisit: true },
    }),
  ]);

  return {
    patients: patients.map((p) => ({ id: p.id, fullName: p.fullName, hasSessions: p._count.sessions > 0 })),
    sessionTypes,
  };
}

export type AgendaOptions = Awaited<ReturnType<typeof getAgendaOptions>>;

export function weekRange(weekStartISO: string): { from: string; to: string } {
  return { from: weekStartISO, to: addDaysToIsoDate(weekStartISO, 7) };
}
