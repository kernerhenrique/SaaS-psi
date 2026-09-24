export type Period = { kind: "month"; year: number; month: number } | { kind: "year"; year: number };

/** Valor do parâmetro ?periodo= na URL: "2026-09" (mês) ou "2026" (ano). */
export function periodParam(period: Period): string {
  return period.kind === "year" ? String(period.year) : `${period.year}-${String(period.month).padStart(2, "0")}`;
}

export function parsePeriod(value: unknown, todayISO: string): Period {
  if (typeof value === "string" && /^\d{4}$/.test(value)) return { kind: "year", year: Number(value) };
  if (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return { kind: "month", year: Number(value.slice(0, 4)), month: Number(value.slice(5)) };
  }
  return { kind: "month", year: Number(todayISO.slice(0, 4)), month: Number(todayISO.slice(5, 7)) };
}

/** Intervalo de datas [from, to) do período. */
export function periodRange(period: Period): { from: string; to: string } {
  if (period.kind === "year") return { from: `${period.year}-01-01`, to: `${period.year + 1}-01-01` };
  const from = `${period.year}-${String(period.month).padStart(2, "0")}-01`;
  // Date.UTC(ano, mês) com o mês 1-based já aponta para o dia 1 do mês seguinte.
  const to = new Date(Date.UTC(period.year, period.month, 1)).toISOString().slice(0, 10);
  return { from, to };
}

/** Anda `delta` meses (ou anos, na visão anual). */
export function shiftPeriod(period: Period, delta: number): Period {
  if (period.kind === "year") return { kind: "year", year: period.year + delta };
  const index = period.year * 12 + (period.month - 1) + delta;
  return { kind: "month", year: Math.floor(index / 12), month: (index % 12) + 1 };
}
