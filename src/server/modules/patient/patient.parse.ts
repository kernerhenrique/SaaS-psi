import { isValidPhone, normalizePhone } from "@/lib/phone";
import { ValidationError } from "@/server/errors";

// Validação das entradas da ficha do paciente. As mensagens aparecem para a
// psicóloga, então são escritas em linguagem do dia a dia.

export const MAX_SHORT_TEXT = 120;
export const MAX_LONG_TEXT = 20_000;

export type GuardianInput = {
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
};

export type PatientInput = {
  fullName: string;
  birthDate: string | null;
  healthInfo: string | null;
  notes: string | null;
  guardians: GuardianInput[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function asObject(value: unknown, message = "Dados inválidos"): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(message);
  }
  return value as Record<string, unknown>;
}

/** Texto obrigatório, sem espaços nas pontas. */
export function requiredText(value: unknown, label: string, max = MAX_SHORT_TEXT): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ValidationError(`Preencha ${label}.`);
  if (text.length > max) throw new ValidationError(`${capitalize(label)} está muito longo.`);
  return text;
}

/** Texto opcional: vazio vira `null`. */
export function optionalText(value: unknown, label: string, max = MAX_LONG_TEXT): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new ValidationError(`${capitalize(label)} inválido.`);
  const text = value.trim();
  if (text.length > max) throw new ValidationError(`${capitalize(label)} está muito longo.`);
  return text || null;
}

/** Data de calendário YYYY-MM-DD válida (rejeita 31/02 etc.). */
export function parseIsoDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new ValidationError(`Informe ${label} completa.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new ValidationError(`${capitalize(label)} não existe no calendário.`);
  }
  return value;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseGuardian(value: unknown, index: number): GuardianInput {
  const g = asObject(value, "Responsável inválido");
  const position = `do ${index + 1}º responsável`;
  const phoneRaw = optionalText(g.phone, `o telefone ${position}`, 30);
  if (phoneRaw && !isValidPhone(phoneRaw)) {
    throw new ValidationError(`O telefone ${position} precisa ter DDD, ex.: (27) 99999-9999.`);
  }
  const email = optionalText(g.email, `o e-mail ${position}`, MAX_SHORT_TEXT);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError(`O e-mail ${position} parece incompleto.`);
  }
  return {
    name: requiredText(g.name, `o nome ${position}`),
    relationship: requiredText(g.relationship, `o parentesco ${position}`, 40),
    phone: phoneRaw ? normalizePhone(phoneRaw) : null,
    email,
    isPrimary: g.isPrimary === true,
  };
}

export function parsePatientInput(body: unknown, todayISO: string): PatientInput {
  const b = asObject(body);

  const birthDate = b.birthDate ? parseIsoDate(b.birthDate, "a data de nascimento") : null;
  if (birthDate && birthDate > todayISO) {
    throw new ValidationError("A data de nascimento está no futuro.");
  }

  if (b.guardians !== undefined && !Array.isArray(b.guardians)) {
    throw new ValidationError("Lista de responsáveis inválida.");
  }
  const guardians = ((b.guardians as unknown[] | undefined) ?? []).map(parseGuardian);
  if (guardians.length > 5) throw new ValidationError("Cadastre no máximo 5 responsáveis.");

  // Sempre exatamente um responsável principal (quem recebe as mensagens por padrão).
  const primaryIndex = Math.max(
    0,
    guardians.findIndex((g) => g.isPrimary),
  );
  guardians.forEach((g, i) => (g.isPrimary = i === primaryIndex));

  return {
    fullName: requiredText(b.fullName, "o nome do paciente"),
    birthDate,
    healthInfo: optionalText(b.healthInfo, "informações de saúde"),
    notes: optionalText(b.notes, "observações"),
    guardians,
  };
}
