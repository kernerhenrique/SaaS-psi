import type { Prisma } from "@/generated/prisma/client";
import { daysBetweenIsoDates, todayInTimeZone, utcToLocalDate } from "@/lib/date";
import type { PaymentRow } from "@/lib/finance";
import { prisma } from "@/server/db/prisma";
import { NotFoundError } from "@/server/errors";
import { shouldSuggestPaymentReminder } from "@/server/modules/payment/payment-rules";

export type ReceivableRow = PaymentRow & { daysPending: number; suggestReminder: boolean };

const rowInclude = {
  sessionType: { select: { name: true } },
  patient: {
    select: {
      fullName: true,
      guardians: { select: { name: true, phone: true }, orderBy: { isPrimary: "desc" }, take: 1 },
    },
  },
} satisfies Prisma.SessionInclude;

type SessionWithRow = Prisma.SessionGetPayload<{ include: typeof rowInclude }>;

function toRow(s: SessionWithRow, timezone: string): PaymentRow {
  return {
    sessionId: s.id,
    patientId: s.patientId,
    patientName: s.patient.fullName,
    guardianName: s.patient.guardians[0]?.name ?? null,
    guardianPhone: s.patient.guardians[0]?.phone ?? null,
    sessionDate: utcToLocalDate(s.startAt, timezone),
    typeName: s.sessionType.name,
    status: s.status,
    amountCents: s.amountCents,
    paymentStatus: s.paymentStatus,
    paymentMethod: s.paymentMethod,
    paidAt: s.paidAt ? s.paidAt.toISOString().slice(0, 10) : null,
  };
}

async function getBusiness(businessId: string) {
  return prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { timezone: true, paymentReminderDays: true },
  });
}

/** Consultas realizadas sem pagamento, da mais antiga para a mais recente. */
export async function listReceivables(businessId: string): Promise<ReceivableRow[]> {
  const business = await getBusiness(businessId);
  const today = todayInTimeZone(business.timezone);
  const sessions = await prisma.session.findMany({
    where: { businessId, status: "DONE", paymentStatus: "PENDING" },
    orderBy: { startAt: "asc" },
    include: rowInclude,
  });
  return sessions.map((s) => {
    const row = toRow(s, business.timezone);
    return {
      ...row,
      daysPending: daysBetweenIsoDates(row.sessionDate, today),
      suggestReminder: shouldSuggestPaymentReminder(row.sessionDate, today, business.paymentReminderDays),
    };
  });
}

/** Pagamentos recebidos entre `fromISO` (inclusive) e `toISO` (exclusive), pela data do recebimento. */
export async function listReceived(businessId: string, fromISO: string, toISO: string): Promise<PaymentRow[]> {
  const business = await getBusiness(businessId);
  const sessions = await prisma.session.findMany({
    where: {
      businessId,
      paymentStatus: "PAID",
      paidAt: { gte: new Date(`${fromISO}T00:00:00Z`), lt: new Date(`${toISO}T00:00:00Z`) },
    },
    orderBy: [{ paidAt: "desc" }, { startAt: "desc" }],
    include: rowInclude,
  });
  return sessions.map((s) => toRow(s, business.timezone));
}

/** Histórico financeiro completo de um paciente (consultas realizadas, faltas e o que já foi pago). */
export async function listPatientPayments(businessId: string, patientId: string): Promise<PaymentRow[]> {
  const business = await getBusiness(businessId);
  const patient = await prisma.patient.count({ where: { id: patientId, businessId, deletedAt: null } });
  if (!patient) throw new NotFoundError("Paciente não encontrado");

  const sessions = await prisma.session.findMany({
    where: {
      businessId,
      patientId,
      OR: [{ status: { in: ["DONE", "NO_SHOW"] } }, { paymentStatus: "PAID" }],
    },
    orderBy: { startAt: "desc" },
    include: rowInclude,
  });
  return sessions.map((s) => toRow(s, business.timezone));
}
