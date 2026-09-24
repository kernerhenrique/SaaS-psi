import type { PaymentMethod, PaymentStatus, SessionStatus } from "@/generated/prisma/enums";

import { formatFullDate } from "./date";
import { PAYMENT_METHOD_LABELS } from "./labels";

/** Uma consulta vista pelo lado financeiro. */
export type PaymentRow = {
  sessionId: string;
  patientId: string;
  patientName: string;
  guardianName: string | null;
  guardianPhone: string | null;
  sessionDate: string;
  typeName: string;
  status: SessionStatus;
  amountCents: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
};

export const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function sumCents(rows: Pick<PaymentRow, "amountCents">[]): number {
  return rows.reduce((sum, r) => sum + r.amountCents, 0);
}

/** Total recebido por forma de pagamento, do maior para o menor (só formas usadas). */
export function totalsByMethod(rows: PaymentRow[]): { method: PaymentMethod; totalCents: number; count: number }[] {
  const totals = new Map<PaymentMethod, { totalCents: number; count: number }>();
  for (const row of rows) {
    if (row.paymentStatus !== "PAID" || !row.paymentMethod) continue;
    const current = totals.get(row.paymentMethod) ?? { totalCents: 0, count: 0 };
    totals.set(row.paymentMethod, { totalCents: current.totalCents + row.amountCents, count: current.count + 1 });
  }
  return [...totals.entries()]
    .map(([method, t]) => ({ method, ...t }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

/** Total recebido em cada mês do ano (índice 0 = janeiro), pela data do recebimento. */
export function monthlyTotals(rows: PaymentRow[], year: number): number[] {
  const months = Array<number>(12).fill(0);
  for (const row of rows) {
    if (row.paymentStatus !== "PAID" || !row.paidAt || Number(row.paidAt.slice(0, 4)) !== year) continue;
    months[Number(row.paidAt.slice(5, 7)) - 1] += row.amountCents;
  }
  return months;
}

function csvCell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Planilha dos recebimentos (para o contador / carnê-leão). Usa ";" e vírgula
 * decimal, o formato que o Excel em português abre direto.
 */
export function buildPaymentsCsv(rows: PaymentRow[]): string {
  const header = ["Recebido em", "Paciente", "Responsável", "Data da consulta", "Tipo", "Forma", "Valor (R$)"];
  const lines = rows.map((r) =>
    [
      r.paidAt ? formatFullDate(r.paidAt) : "",
      r.patientName,
      r.guardianName ?? "",
      formatFullDate(r.sessionDate),
      r.typeName,
      r.paymentMethod ? PAYMENT_METHOD_LABELS[r.paymentMethod] : "",
      (r.amountCents / 100).toFixed(2).replace(".", ","),
    ]
      .map(csvCell)
      .join(";"),
  );
  // BOM no início para o Excel reconhecer os acentos (UTF-8).
  return "﻿" + [header.join(";"), ...lines].join("\r\n");
}
