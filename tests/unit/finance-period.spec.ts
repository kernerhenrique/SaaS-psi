import { describe, expect, it } from "vitest";

import { parsePeriod, periodParam, periodRange, shiftPeriod } from "@/app/admin/(authenticated)/financeiro/period";

describe("período do financeiro", () => {
  it("lê mês, ano ou usa o mês atual", () => {
    expect(parsePeriod("2026-02", "2026-09-24")).toEqual({ kind: "month", year: 2026, month: 2 });
    expect(parsePeriod("2025", "2026-09-24")).toEqual({ kind: "year", year: 2025 });
    expect(parsePeriod("2026-13", "2026-09-24")).toEqual({ kind: "month", year: 2026, month: 9 });
  });

  it("calcula o intervalo, inclusive dezembro e fevereiro", () => {
    expect(periodRange({ kind: "month", year: 2026, month: 12 })).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(periodRange({ kind: "month", year: 2028, month: 2 })).toEqual({ from: "2028-02-01", to: "2028-03-01" });
    expect(periodRange({ kind: "year", year: 2026 })).toEqual({ from: "2026-01-01", to: "2027-01-01" });
  });

  it("anda entre meses atravessando o ano", () => {
    expect(periodParam(shiftPeriod({ kind: "month", year: 2026, month: 1 }, -1))).toBe("2025-12");
    expect(periodParam(shiftPeriod({ kind: "month", year: 2026, month: 12 }, 1))).toBe("2027-01");
  });
});
