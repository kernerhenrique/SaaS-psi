import { describe, expect, it } from "vitest";

import {
  parseCreateSessionInput,
  parsePaymentInput,
  parseScheduleInput,
  parseSessionStatus,
} from "@/server/modules/session/session.parse";

const today = "2026-09-24";

describe("parseScheduleInput", () => {
  it("converte data e horário", () => {
    expect(parseScheduleInput({ date: "2026-09-25", startTime: "14:30", durationMin: 50 })).toEqual({
      date: "2026-09-25",
      startMinute: 870,
      durationMin: 50,
    });
  });

  it("exige horário válido", () => {
    expect(() => parseScheduleInput({ date: "2026-09-25", startTime: "", durationMin: 50 })).toThrow(/horário/);
  });

  it("não deixa a consulta passar da meia-noite", () => {
    expect(() => parseScheduleInput({ date: "2026-09-25", startTime: "23:30", durationMin: 50 })).toThrow(/mesmo dia/);
  });

  it("limita a duração", () => {
    expect(() => parseScheduleInput({ date: "2026-09-25", startTime: "10:00", durationMin: 5 })).toThrow(/duração/i);
  });
});

describe("parseCreateSessionInput", () => {
  it("exige paciente e tipo", () => {
    const base = { date: "2026-09-25", startTime: "10:00", durationMin: 50, amountCents: 20000 };
    expect(() => parseCreateSessionInput({ ...base, sessionTypeId: "t1" })).toThrow(/paciente/);
    expect(() => parseCreateSessionInput({ ...base, patientId: "p1" })).toThrow(/tipo/);
  });

  it("rejeita valor negativo ou com centavos quebrados", () => {
    const base = { date: "2026-09-25", startTime: "10:00", durationMin: 50, patientId: "p1", sessionTypeId: "t1" };
    expect(() => parseCreateSessionInput({ ...base, amountCents: -1 })).toThrow(/valor/);
    expect(() => parseCreateSessionInput({ ...base, amountCents: 100.5 })).toThrow(/valor/);
  });
});

describe("parsePaymentInput", () => {
  it("pago exige forma de pagamento e usa hoje como data padrão", () => {
    expect(() => parsePaymentInput({ paymentStatus: "PAID", amountCents: 20000 }, today)).toThrow(/forma/);
    expect(parsePaymentInput({ paymentStatus: "PAID", paymentMethod: "PIX", amountCents: 20000 }, today)).toEqual({
      paymentStatus: "PAID",
      paymentMethod: "PIX",
      paidAt: today,
      amountCents: 20000,
    });
  });

  it("aceita recebimento em data diferente da consulta, mas não no futuro", () => {
    const input = { paymentStatus: "PAID", paymentMethod: "CASH", amountCents: 20000 };
    expect(parsePaymentInput({ ...input, paidAt: "2026-09-10" }, today).paidAt).toBe("2026-09-10");
    expect(() => parsePaymentInput({ ...input, paidAt: "2026-09-30" }, today)).toThrow(/futuro/);
  });

  it("pendente e não vai pagar limpam forma e data", () => {
    const result = parsePaymentInput(
      { paymentStatus: "WONT_PAY", paymentMethod: "PIX", paidAt: "2026-09-10", amountCents: 20000 },
      today,
    );
    expect(result).toMatchObject({ paymentMethod: null, paidAt: null });
  });
});

describe("parseSessionStatus", () => {
  it("aceita só situações conhecidas", () => {
    expect(parseSessionStatus({ status: "NO_SHOW" })).toBe("NO_SHOW");
    expect(() => parseSessionStatus({ status: "DELETED" })).toThrow();
  });
});
