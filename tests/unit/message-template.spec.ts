import { describe, expect, it } from "vitest";

import { buildWhatsAppLink, renderMessageTemplate } from "@/lib/message-template";

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
