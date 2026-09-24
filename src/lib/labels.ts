import type { PaymentMethod, PaymentStatus, SessionStatus } from "@/generated/prisma/enums";
import type { StatusKind } from "@/components/status-badge";

// Tradução dos valores do banco para o que a psicóloga vê na tela.

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CARD: "Cartão",
  TRANSFER: "Transferência",
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, StatusKind> = {
  PAID: "paid",
  PENDING: "pending",
  WONT_PAY: "wont-pay",
};

export const SESSION_STATUS_BADGE: Record<SessionStatus, StatusKind> = {
  SCHEDULED: "scheduled",
  DONE: "done",
  CANCELLED: "cancelled",
  NO_SHOW: "no-show",
};

/** Sugestões para o campo de parentesco (a psicóloga pode digitar outro). */
export const RELATIONSHIP_SUGGESTIONS = ["Mãe", "Pai", "Avó", "Avô", "Tia", "Tio", "Madrasta", "Padrasto"];
