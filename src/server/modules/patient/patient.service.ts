import type { NoteStatus, PaymentMethod, PaymentStatus, SessionStatus } from "@/generated/prisma/enums";
import { ageInYears, todayInTimeZone, utcToLocalDate, utcToLocalMinutes } from "@/lib/date";
import { prisma } from "@/server/db/prisma";
import { decryptOptional, decryptText, encryptOptional } from "@/server/crypto/records-cipher";
import { NotFoundError } from "@/server/errors";

import type { PatientInput } from "./patient.parse";

export type GuardianDto = {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
};

export type PatientListItem = {
  id: string;
  fullName: string;
  age: number | null;
  primaryGuardian: { name: string; relationship: string; phone: string | null } | null;
  lastSessionDate: string | null;
  nextSessionDate: string | null;
  openFollowUps: number;
};

export type PatientSessionDto = {
  id: string;
  date: string;
  startTime: string;
  typeName: string;
  isFirstVisit: boolean;
  status: SessionStatus;
  amountCents: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  note: { parentReport: string | null; patientSession: string | null; status: NoteStatus; updatedAt: string } | null;
};

export type PatientRecord = {
  id: string;
  fullName: string;
  birthDate: string | null;
  age: number | null;
  healthInfo: string | null;
  notes: string | null;
  createdAt: string;
  guardians: GuardianDto[];
  parentNotes: { id: string; date: string; content: string }[];
  sessions: PatientSessionDto[];
  followUps: { id: string; text: string; doneAt: string | null; createdAt: string }[];
};

const guardianSelect = {
  id: true,
  name: true,
  relationship: true,
  phone: true,
  email: true,
  isPrimary: true,
} as const;

function isoDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function toTime(date: Date, timeZone: string): string {
  const minutes = utcToLocalMinutes(date, timeZone);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

async function getTimezone(businessId: string): Promise<string> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { timezone: true } });
  return business.timezone;
}

/** Garante que o paciente existe e pertence à psicóloga logada (isolamento entre contas). */
export async function assertPatientOwnership(businessId: string, patientId: string): Promise<void> {
  const exists = await prisma.patient.count({ where: { id: patientId, businessId, deletedAt: null } });
  if (!exists) throw new NotFoundError("Paciente não encontrado");
}

export async function listPatients(businessId: string): Promise<PatientListItem[]> {
  const timezone = await getTimezone(businessId);
  const today = todayInTimeZone(timezone);
  const now = new Date();

  const patients = await prisma.patient.findMany({
    where: { businessId, deletedAt: null },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      birthDate: true,
      guardians: { select: guardianSelect, orderBy: { isPrimary: "desc" } },
      sessions: {
        where: { status: { in: ["DONE", "SCHEDULED"] } },
        select: { startAt: true, status: true },
        orderBy: { startAt: "asc" },
      },
      _count: { select: { followUps: { where: { doneAt: null, deletedAt: null } } } },
    },
  });

  return patients.map((p) => {
    const birthDate = isoDateOnly(p.birthDate);
    // "Última" é qualquer consulta que já começou (mesmo se ainda não foi marcada
    // como realizada); "próxima" é a primeira agendada daqui para frente.
    const past = p.sessions.filter((s) => s.startAt < now);
    const next = p.sessions.find((s) => s.status === "SCHEDULED" && s.startAt >= now);
    const guardian = p.guardians[0];
    return {
      id: p.id,
      fullName: p.fullName,
      age: birthDate ? ageInYears(birthDate, today) : null,
      primaryGuardian: guardian
        ? { name: guardian.name, relationship: guardian.relationship, phone: guardian.phone }
        : null,
      lastSessionDate: past.length ? utcToLocalDate(past[past.length - 1].startAt, timezone) : null,
      nextSessionDate: next ? utcToLocalDate(next.startAt, timezone) : null,
      openFollowUps: p._count.followUps,
    };
  });
}

export async function getPatientRecord(businessId: string, patientId: string): Promise<PatientRecord> {
  const timezone = await getTimezone(businessId);
  const today = todayInTimeZone(timezone);

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, businessId, deletedAt: null },
    include: {
      guardians: { select: guardianSelect, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      parentNotes: { where: { deletedAt: null }, orderBy: { date: "desc" } },
      sessions: {
        orderBy: { startAt: "desc" },
        include: { sessionType: { select: { name: true, isFirstVisit: true } }, note: true },
      },
      followUps: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!patient) throw new NotFoundError("Paciente não encontrado");

  const birthDate = isoDateOnly(patient.birthDate);

  return {
    id: patient.id,
    fullName: patient.fullName,
    birthDate,
    age: birthDate ? ageInYears(birthDate, today) : null,
    healthInfo: decryptOptional(patient.healthInfo),
    notes: decryptOptional(patient.notes),
    createdAt: patient.createdAt.toISOString(),
    guardians: patient.guardians,
    parentNotes: patient.parentNotes.map((n) => ({
      id: n.id,
      date: isoDateOnly(n.date)!,
      content: decryptText(n.content),
    })),
    sessions: patient.sessions.map((s) => ({
      id: s.id,
      date: utcToLocalDate(s.startAt, timezone),
      startTime: toTime(s.startAt, timezone),
      typeName: s.sessionType.name,
      isFirstVisit: s.sessionType.isFirstVisit,
      status: s.status,
      amountCents: s.amountCents,
      paymentStatus: s.paymentStatus,
      paymentMethod: s.paymentMethod,
      paidAt: isoDateOnly(s.paidAt),
      note:
        s.note && !s.note.deletedAt
          ? {
              parentReport: decryptOptional(s.note.parentReport),
              patientSession: decryptOptional(s.note.patientSession),
              status: s.note.status,
              updatedAt: s.note.updatedAt.toISOString(),
            }
          : null,
    })),
    followUps: patient.followUps.map((f) => ({
      id: f.id,
      text: decryptText(f.text),
      doneAt: f.doneAt?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

function patientData(input: PatientInput) {
  return {
    fullName: input.fullName,
    birthDate: input.birthDate ? new Date(`${input.birthDate}T00:00:00Z`) : null,
    healthInfo: encryptOptional(input.healthInfo),
    notes: encryptOptional(input.notes),
  };
}

export async function createPatient(businessId: string, input: PatientInput): Promise<{ id: string }> {
  return prisma.patient.create({
    data: {
      businessId,
      ...patientData(input),
      guardians: { create: input.guardians.map((g) => ({ ...g, businessId })) },
    },
    select: { id: true },
  });
}

/** Atualiza os dados fixos; a lista de responsáveis é substituída pela enviada. */
export async function updatePatient(businessId: string, patientId: string, input: PatientInput): Promise<void> {
  await assertPatientOwnership(businessId, patientId);
  await prisma.$transaction([
    prisma.patient.update({ where: { id: patientId }, data: patientData(input) }),
    prisma.guardian.deleteMany({ where: { patientId, businessId } }),
    prisma.guardian.createMany({ data: input.guardians.map((g) => ({ ...g, businessId, patientId })) }),
  ]);
}
