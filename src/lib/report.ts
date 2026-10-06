import { formatFullDate } from "./date";

export type ReportContext = {
  patientName: string;
  patientAge: number | null;
  sessionDate: string;
  sessionTypeName: string;
  guardian: { name: string; relationship: string } | null;
  noteContent: string | null;
};

/** Título da seção de identificação (linhas em maiúsculas viram títulos na impressão). */
export const REPORT_SECTIONS = {
  identification: "IDENTIFICAÇÃO",
} as const;

const EMPTY = "(sem anotação — complete aqui)";

/**
 * Rascunho do relatório avulso de uma consulta, a partir da anotação da
 * sessão. É só um ponto de partida: a psicóloga revisa e edita antes de salvar.
 */
export function buildReportDraft(ctx: ReportContext): string {
  const identification = [
    `Paciente: ${ctx.patientName}${ctx.patientAge !== null ? `, ${ctx.patientAge} anos` : ""}`,
    ctx.guardian ? `Responsável: ${ctx.guardian.name} (${ctx.guardian.relationship.toLowerCase()})` : null,
    `Atendimento: ${ctx.sessionTypeName.toLowerCase()} em ${formatFullDate(ctx.sessionDate)}`,
  ].filter(Boolean);

  return [REPORT_SECTIONS.identification, identification.join("\n"), "", ctx.noteContent?.trim() || EMPTY].join("\n");
}

/** Uma linha é título se estiver toda em maiúsculas (ex.: "ATENDIMENTO"). */
export function isReportHeading(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length >= 3 && /\p{L}/u.test(trimmed) && trimmed === trimmed.toLocaleUpperCase("pt-BR");
}
