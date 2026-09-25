import { isValidPhone, normalizePhone } from "@/lib/phone";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";
import { optionalText, requiredText } from "@/server/modules/patient/patient.parse";
import { parseAmountCents } from "@/server/modules/session/session.parse";

export type ProfileInput = {
  name: string;
  crp: string | null;
  whatsapp: string | null;
  address: string | null;
  accentColor: string | null;
};

export type SessionTypeInput = { name: string; priceCents: number; durationMin: number };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ValidationError("Dados inválidos");
  return value as Record<string, unknown>;
}

export function parseProfileInput(body: unknown): ProfileInput {
  const b = asObject(body);
  const whatsapp = optionalText(b.whatsapp, "o WhatsApp", 30);
  if (whatsapp && !isValidPhone(whatsapp)) {
    throw new ValidationError("O WhatsApp precisa ter DDD, ex.: (27) 99999-9999.");
  }
  const accentColor = optionalText(b.accentColor, "a cor", 7);
  if (accentColor && !HEX_COLOR.test(accentColor)) throw new ValidationError("Cor inválida.");
  return {
    name: requiredText(b.name, "seu nome", 80),
    crp: optionalText(b.crp, "o CRP", 30),
    whatsapp: whatsapp ? normalizePhone(whatsapp) : null,
    address: optionalText(b.address, "o endereço", 200),
    accentColor: accentColor ? accentColor.toLowerCase() : null,
  };
}

export function parseSessionTypeInput(body: unknown): SessionTypeInput {
  const b = asObject(body);
  const durationMin = b.durationMin;
  if (typeof durationMin !== "number" || !Number.isInteger(durationMin) || durationMin < 10 || durationMin > 240) {
    throw new ValidationError("A duração deve ficar entre 10 e 240 minutos.");
  }
  return {
    name: requiredText(b.name, "o nome do tipo de consulta", 60),
    priceCents: parseAmountCents(b.priceCents),
    durationMin,
  };
}

export async function getSettings(businessId: string) {
  const [business, sessionTypes] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true, crp: true, whatsapp: true, address: true, accentColor: true, logoUrl: true },
    }),
    prisma.sessionType.findMany({
      where: { businessId, active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, priceCents: true, durationMin: true, isFirstVisit: true },
    }),
  ]);
  return { business, sessionTypes };
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

/** Atualiza a identidade da psicóloga (e o nome da saudação do usuário dela). */
export async function updateProfile(businessId: string, userId: string, input: ProfileInput) {
  await prisma.$transaction([
    prisma.business.update({ where: { id: businessId }, data: input }),
    prisma.user.update({ where: { id: userId }, data: { name: input.name } }),
  ]);
}

/** Novos valores valem para as próximas consultas; as já marcadas mantêm o valor combinado. */
export async function updateSessionType(businessId: string, sessionTypeId: string, input: SessionTypeInput) {
  const exists = await prisma.sessionType.count({ where: { id: sessionTypeId, businessId } });
  if (!exists) throw new NotFoundError("Tipo de consulta não encontrado");
  await prisma.sessionType.update({ where: { id: sessionTypeId }, data: input });
}
