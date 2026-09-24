import { describe, expect, it } from "vitest";

import { shouldSuggestPaymentReminder } from "@/server/modules/payment/payment-rules";

describe("shouldSuggestPaymentReminder", () => {
  const today = "2026-09-24";

  it("sugere a partir do número de dias configurado", () => {
    expect(shouldSuggestPaymentReminder("2026-09-21", today, 3)).toBe(true);
    expect(shouldSuggestPaymentReminder("2026-09-18", today, 3)).toBe(true);
  });

  it("não sugere antes do prazo", () => {
    expect(shouldSuggestPaymentReminder("2026-09-22", today, 3)).toBe(false);
  });

  it("nunca sugere para consulta de hoje ou futura, mesmo com prazo zero", () => {
    expect(shouldSuggestPaymentReminder(today, today, 0)).toBe(false);
    expect(shouldSuggestPaymentReminder("2026-09-30", today, 3)).toBe(false);
  });
});
