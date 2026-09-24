import { ValidationError } from "@/server/errors";
import { MAX_LONG_TEXT, optionalText, parseIsoDate, requiredText } from "@/server/modules/patient/patient.parse";

export type ParentNoteInput = { date: string; content: string };
export type SessionNoteInput = { parentReport: string | null; patientSession: string | null };
export type FollowUpInput = { text: string };

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Dados inválidos");
  }
  return value as Record<string, unknown>;
}

export function parseParentNoteInput(body: unknown, todayISO: string): ParentNoteInput {
  const b = asObject(body);
  const date = parseIsoDate(b.date, "a data da conversa");
  if (date > todayISO) throw new ValidationError("A data da conversa está no futuro.");
  return { date, content: requiredText(b.content, "a anotação", MAX_LONG_TEXT) };
}

export function parseSessionNoteInput(body: unknown): SessionNoteInput {
  const b = asObject(body);
  const input = {
    parentReport: optionalText(b.parentReport, "o relato dos pais"),
    patientSession: optionalText(b.patientSession, "a anotação da sessão"),
  };
  if (!input.parentReport && !input.patientSession) {
    throw new ValidationError("Escreva ao menos uma das anotações antes de salvar.");
  }
  return input;
}

export function parseFollowUpInput(body: unknown): FollowUpInput {
  const b = asObject(body);
  return { text: requiredText(b.text, "o ponto a acompanhar", 500) };
}
