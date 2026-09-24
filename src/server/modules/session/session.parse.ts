import type { PaymentMethod, PaymentStatus, SessionStatus } from "@/generated/prisma/enums";
import { timeToMinutes } from "@/lib/date";
import { ValidationError } from "@/server/errors";
import { parseIsoDate } from "@/server/modules/patient/patient.parse";

export type SessionScheduleInput = {
  date: string;
  startMinute: number;
  durationMin: number;
};

export type CreateSessionInput = SessionScheduleInput & {
  patientId: string;
  sessionTypeId: string;
  amountCents: number;
};

export type PaymentInput = {
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  amountCents: number;
};

const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PAID", "WONT_PAY"];
const PAYMENT_METHODS: PaymentMethod[] = ["PIX", "CASH", "CARD", "TRANSFER"];
const SESSION_STATUSES: SessionStatus[] = ["SCHEDULED", "DONE", "CANCELLED", "NO_SHOW"];

// Valor máximo aceito para uma consulta (R$ 10.000) — protege contra erro de digitação.
const MAX_AMOUNT_CENTS = 1_000_000;

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Dados inválidos");
  }
  return value as Record<string, unknown>;
}

function parseId(value: unknown, message: string): string {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(message);
  return value;
}

export function parseAmountCents(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_AMOUNT_CENTS) {
    throw new ValidationError("Informe um valor válido para a consulta.");
  }
  return value;
}

export function parseScheduleInput(body: unknown): SessionScheduleInput {
  const b = asObject(body);
  const date = parseIsoDate(b.date, "a data da consulta");
  const startMinute = typeof b.startTime === "string" ? timeToMinutes(b.startTime) : null;
  if (startMinute === null) throw new ValidationError("Informe o horário da consulta.");
  const durationMin = b.durationMin;
  if (typeof durationMin !== "number" || !Number.isInteger(durationMin) || durationMin < 10 || durationMin > 240) {
    throw new ValidationError("A duração deve ficar entre 10 e 240 minutos.");
  }
  if (startMinute + durationMin > 24 * 60) {
    throw new ValidationError("A consulta precisa terminar no mesmo dia.");
  }
  return { date, startMinute, durationMin };
}

export function parseCreateSessionInput(body: unknown): CreateSessionInput {
  const b = asObject(body);
  return {
    ...parseScheduleInput(b),
    patientId: parseId(b.patientId, "Escolha o paciente."),
    sessionTypeId: parseId(b.sessionTypeId, "Escolha o tipo de consulta."),
    amountCents: parseAmountCents(b.amountCents),
  };
}

export function parseSessionStatus(body: unknown): SessionStatus {
  const status = asObject(body).status;
  if (!SESSION_STATUSES.includes(status as SessionStatus)) throw new ValidationError("Situação inválida.");
  return status as SessionStatus;
}

/**
 * "Pago" exige forma e data de recebimento (padrão: hoje). "Pendente" e
 * "Não vai pagar" limpam forma e data, para os totais não contarem errado.
 */
export function parsePaymentInput(body: unknown, todayISO: string): PaymentInput {
  const b = asObject(body);
  if (!PAYMENT_STATUSES.includes(b.paymentStatus as PaymentStatus)) {
    throw new ValidationError("Escolha a situação do pagamento.");
  }
  const paymentStatus = b.paymentStatus as PaymentStatus;
  const amountCents = parseAmountCents(b.amountCents);

  if (paymentStatus !== "PAID") {
    return { paymentStatus, paymentMethod: null, paidAt: null, amountCents };
  }

  if (!PAYMENT_METHODS.includes(b.paymentMethod as PaymentMethod)) {
    throw new ValidationError("Escolha a forma de pagamento.");
  }
  const paidAt = b.paidAt ? parseIsoDate(b.paidAt, "a data do recebimento") : todayISO;
  if (paidAt > todayISO) throw new ValidationError("A data do recebimento está no futuro.");
  return { paymentStatus, paymentMethod: b.paymentMethod as PaymentMethod, paidAt, amountCents };
}
