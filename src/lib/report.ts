import { formatFullDate } from "./date";

export type ReportContext = {
  patientName: string;
  patientAge: number | null;
  sessionDate: string;
  sessionTypeName: string;
  guardian: { name: string; relationship: string } | null;
  parentReport: string | null;
  patientSession: string | null;
  followUps: string[];
};

/** Títulos das seções (linhas em maiúsculas viram títulos na impressão). */
export const REPORT_SECTIONS = {
  identification: "IDENTIFICAÇÃO",
  demand: "RELATO DOS RESPONSÁVEIS",
  procedure: "ATENDIMENTO",
  followUp: "OBSERVAÇÕES E ENCAMINHAMENTOS",
} as const;

const EMPTY = "(sem anotação — complete aqui)";

/**
 * Rascunho do relatório pós-consulta a partir das anotações da sessão.
 * É só um ponto de partida: a psicóloga revisa e edita antes de salvar.
 */
export function buildReportDraft(ctx: ReportContext): string {
  const identification = [
    `Paciente: ${ctx.patientName}${ctx.patientAge !== null ? `, ${ctx.patientAge} anos` : ""}`,
    ctx.guardian ? `Responsável: ${ctx.guardian.name} (${ctx.guardian.relationship.toLowerCase()})` : null,
    `Atendimento: ${ctx.sessionTypeName.toLowerCase()} em ${formatFullDate(ctx.sessionDate)}`,
  ].filter(Boolean);

  const followUp = ctx.followUps.length
    ? ["Pontos a acompanhar nas próximas sessões:", ...ctx.followUps.map((item) => `- ${item}`)].join("\n")
    : EMPTY;

  return [
    REPORT_SECTIONS.identification,
    identification.join("\n"),
    "",
    REPORT_SECTIONS.demand,
    ctx.parentReport?.trim() || EMPTY,
    "",
    REPORT_SECTIONS.procedure,
    ctx.patientSession?.trim() || EMPTY,
    "",
    REPORT_SECTIONS.followUp,
    followUp,
  ].join("\n");
}

/** Uma linha é título se estiver toda em maiúsculas (ex.: "ATENDIMENTO"). */
export function isReportHeading(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length >= 3 && /\p{L}/u.test(trimmed) && trimmed === trimmed.toLocaleUpperCase("pt-BR");
}
