import { describe, expect, it } from "vitest";

import { formatPhone, isValidPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("remove máscara e DDI", () => {
    expect(normalizePhone("(27) 99814-2609")).toBe("27998142609");
    expect(normalizePhone("+55 27 99814-2609")).toBe("27998142609");
  });
});

describe("formatPhone", () => {
  it("formata celular e fixo", () => {
    expect(formatPhone("27998142609")).toBe("(27) 99814-2609");
    expect(formatPhone("2733221100")).toBe("(27) 3322-1100");
  });

  it("devolve como veio quando o formato é inesperado", () => {
    expect(formatPhone("123")).toBe("123");
  });
});

describe("isValidPhone", () => {
  it("aceita 10 ou 11 dígitos com DDD", () => {
    expect(isValidPhone("(27) 99814-2609")).toBe(true);
    expect(isValidPhone("27 3322-1100")).toBe(true);
    expect(isValidPhone("99814-2609")).toBe(false);
  });
});
