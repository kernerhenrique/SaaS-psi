import { describe, expect, it } from "vitest";

import { parseProfileInput, parseSessionTypeInput } from "@/server/modules/settings/settings.service";

describe("parseProfileInput", () => {
  it("normaliza telefone e cor; campos vazios viram null", () => {
    expect(
      parseProfileInput({ name: " Amanda Ribeiro ", crp: "", whatsapp: "(27) 99814-2609", address: " ", accentColor: "#55724F" }),
    ).toEqual({ name: "Amanda Ribeiro", crp: null, whatsapp: "27998142609", address: null, accentColor: "#55724f" });
  });

  it("recusa nome vazio, telefone sem DDD e cor inválida", () => {
    expect(() => parseProfileInput({ name: "" })).toThrow(/seu nome/);
    expect(() => parseProfileInput({ name: "A", whatsapp: "9999-9999" })).toThrow(/DDD/);
    expect(() => parseProfileInput({ name: "A", accentColor: "verde" })).toThrow(/Cor/);
  });
});

describe("parseSessionTypeInput", () => {
  it("valida nome, valor e duração", () => {
    expect(parseSessionTypeInput({ name: "Retorno", priceCents: 22000, durationMin: 50 })).toEqual({
      name: "Retorno",
      priceCents: 22000,
      durationMin: 50,
    });
    expect(() => parseSessionTypeInput({ name: "Retorno", priceCents: -5, durationMin: 50 })).toThrow(/valor/);
    expect(() => parseSessionTypeInput({ name: "Retorno", priceCents: 100, durationMin: 5 })).toThrow(/duração/);
  });
});
