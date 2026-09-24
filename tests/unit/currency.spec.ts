import { describe, expect, it } from "vitest";

import { centsToInput, inputToCents } from "@/lib/currency";

describe("inputToCents", () => {
  it("entende os jeitos comuns de digitar valor", () => {
    expect(inputToCents("250")).toBe(25000);
    expect(inputToCents("250,50")).toBe(25050);
    expect(inputToCents("1.250,00")).toBe(125000);
    expect(inputToCents("R$ 200")).toBe(20000);
    expect(inputToCents("180.5")).toBe(18050);
  });

  it("recusa o que não é valor", () => {
    expect(inputToCents("")).toBeNull();
    expect(inputToCents("abc")).toBeNull();
    expect(inputToCents("-10")).toBeNull();
    expect(inputToCents("10,999")).toBeNull();
  });
});

describe("centsToInput", () => {
  it("formata para edição com vírgula", () => {
    expect(centsToInput(25000)).toBe("250,00");
    expect(centsToInput(18050)).toBe("180,50");
  });
});
