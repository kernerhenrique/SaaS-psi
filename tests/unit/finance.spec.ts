import { describe, expect, it } from "vitest";

import { buildPaymentsCsv, monthlyTotals, sumCents, totalsByMethod, type PaymentRow } from "@/lib/finance";

function row(overrides: Partial<PaymentRow>): PaymentRow {
  return {
    sessionId: "s",
    patientId: "p",
    patientName: "Lucas Almeida",
    guardianName: "Carla Almeida",
    guardianPhone: null,
    sessionDate: "2026-09-10",
    typeName: "Retorno",
    status: "DONE",
    amountCents: 20000,
    paymentStatus: "PAID",
    paymentMethod: "PIX",
    paidAt: "2026-09-10",
    ...overrides,
  };
}

describe("totalsByMethod", () => {
  it("soma só o que foi pago, agrupado pela forma", () => {
    const totals = totalsByMethod([
      row({ paymentMethod: "PIX" }),
      row({ paymentMethod: "PIX", amountCents: 25000 }),
      row({ paymentMethod: "CASH" }),
      row({ paymentStatus: "PENDING", paymentMethod: null }),
    ]);
    expect(totals).toEqual([
      { method: "PIX", totalCents: 45000, count: 2 },
      { method: "CASH", totalCents: 20000, count: 1 },
    ]);
  });
});

describe("monthlyTotals", () => {
  it("usa o mês do recebimento, não o da consulta", () => {
    const months = monthlyTotals(
      [
        row({ sessionDate: "2026-08-28", paidAt: "2026-09-02" }),
        row({ paidAt: "2026-09-15", amountCents: 25000 }),
        row({ paidAt: "2025-09-15" }),
      ],
      2026,
    );
    expect(months[7]).toBe(0);
    expect(months[8]).toBe(45000);
    expect(sumCents(months.map((amountCents) => ({ amountCents })))).toBe(45000);
  });
});

describe("buildPaymentsCsv", () => {
  it("gera planilha com ponto e vírgula, vírgula decimal e acentos", () => {
    const csv = buildPaymentsCsv([row({ patientName: "João; Filho", amountCents: 18050 })]);
    const [header, line] = csv.replace("﻿", "").split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(header).toBe("Recebido em;Paciente;Responsável;Data da consulta;Tipo;Forma;Valor (R$)");
    expect(line).toBe('10/09/2026;"João; Filho";Carla Almeida;10/09/2026;Retorno;PIX;180,50');
  });
});
