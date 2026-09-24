import { addDaysToIsoDate, ageInYears, localDayRangeUtc, todayInTimeZone, utcToLocalDate } from "@/lib/date";
import { buildReportDraft, type ReportContext } from "@/lib/report";
import { prisma } from "@/server/db/prisma";
import { decryptOptional, decryptText, encryptText } from "@/server/crypto/records-cipher";
import { NotFoundError, ValidationError } from "@/server/errors";

export type ReportBrand = {
  name: string;
  crp: string | null;
  whatsapp: string | null;
  address: string | null;
  logoUrl: string | null;
};

export type ReportPageData = {
  sessionId: string;
  patientId: string;
  patientName: string;
  sessionDate: string;
  today: string;
  brand: ReportBrand;
  /** Relatório salvo (ou `null` se ainda não existe). */
  saved: { content: string; updatedAt: string } | null;
  /** Rascunho montado a partir das anotações atuais da consulta. */
  draft: string;
  hasNote: boolean;
};

export type ReportListItem = {
  sessionId: string;
  patientName: string;
  sessionDate: string;
  typeName: string;
  updatedAt: string | null;
};

const MAX_REPORT_LENGTH = 50_000;

export async function getReportPageData(businessId: string, sessionId: string): Promise<ReportPageData> {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, businessId, patient: { deletedAt: null } },
    include: {
      business: { select: { name: true, crp: true, whatsapp: true, address: true, logoUrl: true, timezone: true } },
      sessionType: { select: { name: true } },
      note: true,
      report: true,
      patient: {
        select: {
          id: true,
          fullName: true,
          birthDate: true,
          guardians: { select: { name: true, relationship: true }, orderBy: { isPrimary: "desc" }, take: 1 },
          followUps: { where: { doneAt: null, deletedAt: null }, orderBy: { createdAt: "asc" }, select: { text: true } },
        },
      },
    },
  });
  if (!session) throw new NotFoundError("Consulta não encontrada");

  const { business, patient } = session;
  const today = todayInTimeZone(business.timezone);
  const sessionDate = utcToLocalDate(session.startAt, business.timezone);
  const birthDate = patient.birthDate?.toISOString().slice(0, 10) ?? null;
  const note = session.note && !session.note.deletedAt ? session.note : null;

  const context: ReportContext = {
    patientName: patient.fullName,
    // Idade na data do atendimento, não na de hoje.
    patientAge: birthDate ? ageInYears(birthDate, sessionDate) : null,
    sessionDate,
    sessionTypeName: session.sessionType.name,
    guardian: patient.guardians[0] ?? null,
    parentReport: decryptOptional(note?.parentReport),
    patientSession: decryptOptional(note?.patientSession),
    followUps: patient.followUps.map((f) => decryptText(f.text)),
  };

  const report = session.report && !session.report.deletedAt ? session.report : null;

  return {
    sessionId: session.id,
    patientId: patient.id,
    patientName: patient.fullName,
    sessionDate,
    today,
    brand: {
      name: business.name,
      crp: business.crp,
      whatsapp: business.whatsapp,
      address: business.address,
      logoUrl: business.logoUrl,
    },
    saved: report ? { content: decryptText(report.content), updatedAt: report.updatedAt.toISOString() } : null,
    draft: buildReportDraft(context),
    hasNote: Boolean(note),
  };
}

export function parseReportContent(body: unknown): string {
  const content = typeof (body as { content?: unknown })?.content === "string" ? (body as { content: string }).content.trim() : "";
  if (!content) throw new ValidationError("O relatório está vazio.");
  if (content.length > MAX_REPORT_LENGTH) throw new ValidationError("O relatório está muito longo.");
  return content;
}

export async function saveReport(businessId: string, sessionId: string, content: string) {
  const session = await prisma.session.findFirst({ where: { id: sessionId, businessId }, select: { id: true } });
  if (!session) throw new NotFoundError("Consulta não encontrada");
  const data = { content: encryptText(content), deletedAt: null };
  await prisma.sessionReport.upsert({
    where: { sessionId },
    create: { businessId, sessionId, ...data },
    update: data,
  });
}

/** Relatórios salvos e consultas recentes com anotação que ainda não têm relatório. */
export async function listReports(businessId: string): Promise<{ saved: ReportListItem[]; ready: ReportListItem[] }> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { timezone: true } });
  const since = localDayRangeUtc(addDaysToIsoDate(todayInTimeZone(business.timezone), -90), business.timezone).start;
  const select = {
    id: true,
    startAt: true,
    sessionType: { select: { name: true } },
    patient: { select: { fullName: true } },
  } as const;

  const [reports, ready] = await Promise.all([
    prisma.sessionReport.findMany({
      where: { businessId, deletedAt: null, session: { patient: { deletedAt: null } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { updatedAt: true, session: { select } },
    }),
    prisma.session.findMany({
      where: {
        businessId,
        startAt: { gte: since },
        patient: { deletedAt: null },
        note: { is: { deletedAt: null } },
        OR: [{ report: { is: null } }, { report: { is: { deletedAt: { not: null } } } }],
      },
      orderBy: { startAt: "desc" },
      select,
    }),
  ]);

  const toItem = (s: (typeof ready)[number], updatedAt: Date | null): ReportListItem => ({
    sessionId: s.id,
    patientName: s.patient.fullName,
    sessionDate: utcToLocalDate(s.startAt, business.timezone),
    typeName: s.sessionType.name,
    updatedAt: updatedAt?.toISOString() ?? null,
  });

  return {
    saved: reports.map((r) => toItem(r.session, r.updatedAt)),
    ready: ready.map((s) => toItem(s, null)),
  };
}
