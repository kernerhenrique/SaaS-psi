import { ValidationError } from "@/server/errors";
import { MAX_LONG_TEXT, optionalText, parseIsoDate, requiredText } from "@/server/modules/patient/patient.parse";

export type ParentNoteInput = { date: string; content: string };
export type SessionNoteInput = { content: string | null };
export type FollowUpInput = { text: string };

// Campo único no lugar dos dois antigos (relato dos pais + sessão), então
// aceita o dobro do texto livre padrão.
const MAX_NOTE_LENGTH = MAX_LONG_TEXT * 2;

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
  const content = optionalText(b.content, "a anotação da consulta", MAX_NOTE_LENGTH);
  if (!content) throw new ValidationError("Escreva a anotação antes de salvar.");
  return { content };
}

export function parseFollowUpInput(body: unknown): FollowUpInput {
  const b = asObject(body);
  return { text: requiredText(b.text, "o ponto a acompanhar", 500) };
}
