import { describe, expect, it } from "vitest";

import { friendlyDateLabel } from "@/lib/date";
import {
  buildWhatsAppLink,
  DEFAULT_MESSAGE_TEMPLATES,
  findInvalidVariables,
  renderMessageTemplate,
  TEMPLATE_KINDS,
} from "@/lib/message-template";

describe("findInvalidVariables", () => {
  it("os modelos padrão só usam variáveis válidas", () => {
    for (const kind of TEMPLATE_KINDS) {
      expect(findInvalidVariables(DEFAULT_MESSAGE_TEMPLATES[kind], kind)).toEqual([]);
    }
  });

  it("aponta variável com nome errado ou que não se aplica ao modelo", () => {
    expect(findInvalidVariables("Oi {nome}, até {hora}", "reminder")).toEqual(["nome"]);
    expect(findInvalidVariables("Valor: {valor}", "return-invite")).toEqual(["valor"]);
    expect(findInvalidVariables("{} e {nome} e {nome}", "reminder")).toEqual(["", "nome"]);
  });
});

describe("friendlyDateLabel", () => {
  it("usa hoje, amanhã ou o dia da semana", () => {
    expect(friendlyDateLabel("2026-09-24", "2026-09-24", "America/Sao_Paulo")).toBe("hoje (24/09)");
    expect(friendlyDateLabel("2026-09-25", "2026-09-24", "America/Sao_Paulo")).toBe("amanhã (25/09)");
    expect(friendlyDateLabel("2026-10-02", "2026-09-24", "America/Sao_Paulo")).toBe("sexta-feira (02/10)");
  });
});

describe("renderMessageTemplate", () => {
  it("troca as variáveis conhecidas pelos valores", () => {
    const text = renderMessageTemplate("Olá, {responsavel}! Consulta de {nomePaciente} às {hora}.", {
      responsavel: "Carla",
      nomePaciente: "Lucas",
      hora: "14:00",
    });
    expect(text).toBe("Olá, Carla! Consulta de Lucas às 14:00.");
  });

  it("repete a troca quando a variável aparece mais de uma vez", () => {
    expect(renderMessageTemplate("{nomePaciente} e {nomePaciente}", { nomePaciente: "Ana" })).toBe("Ana e Ana");
  });

  it("mantém visível a variável sem valor ou desconhecida", () => {
    expect(renderMessageTemplate("Valor: {valor}. {outra}", {})).toBe("Valor: {valor}. {outra}");
  });
});

describe("buildWhatsAppLink", () => {
  it("adiciona o DDI do Brasil e codifica a mensagem", () => {
    expect(buildWhatsAppLink("(27) 99814-2609", "Olá, tudo bem?")).toBe(
      "https://wa.me/5527998142609?text=Ol%C3%A1%2C%20tudo%20bem%3F",
    );
  });

  it("abre só a conversa quando não há mensagem", () => {
    expect(buildWhatsAppLink("27998142609", "")).toBe("https://wa.me/5527998142609");
  });

  it("não duplica o DDI quando o número já vem com ele", () => {
    expect(buildWhatsAppLink("+55 27 99814-2609", "Oi")).toBe("https://wa.me/5527998142609?text=Oi");
  });
});
