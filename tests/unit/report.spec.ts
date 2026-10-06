import { describe, expect, it } from "vitest";

import { buildReportDraft, isReportHeading, REPORT_SECTIONS, type ReportContext } from "@/lib/report";

const base: ReportContext = {
  patientName: "Pedro Henrique Lima",
  patientAge: 11,
  sessionDate: "2026-09-10",
  sessionTypeName: "Retorno",
  guardian: { name: "Juliana Lima", relationship: "Mãe" },
  noteContent: "Mãe relata que ele tem acordado várias vezes à noite. Mais agitado no início; acalmou com o jogo de tabuleiro.",
};

describe("buildReportDraft", () => {
  it("monta a identificação com os dados da consulta e a anotação", () => {
    const draft = buildReportDraft(base);
    expect(draft).toContain("Paciente: Pedro Henrique Lima, 11 anos");
    expect(draft).toContain("Responsável: Juliana Lima (mãe)");
    expect(draft).toContain("Atendimento: retorno em 10/09/2026");
    expect(draft).toContain(`${REPORT_SECTIONS.identification}\nPaciente:`);
    expect(draft).toContain("Mãe relata que ele tem acordado");
  });

  it("deixa um lembrete para completar quando falta anotação", () => {
    const draft = buildReportDraft({ ...base, noteContent: null, guardian: null, patientAge: null });
    expect(draft).toContain("(sem anotação — complete aqui)");
    expect(draft).not.toContain("Responsável:");
    expect(draft).toContain("Paciente: Pedro Henrique Lima\n");
  });
});

describe("isReportHeading", () => {
  it("reconhece títulos em maiúsculas, com acento", () => {
    expect(isReportHeading("IDENTIFICAÇÃO")).toBe(true);
    expect(isReportHeading("Paciente: Pedro")).toBe(false);
    expect(isReportHeading("- ok")).toBe(false);
    expect(isReportHeading("123")).toBe(false);
  });
});
