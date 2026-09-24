import { daysBetweenIsoDates } from "@/lib/date";

/**
 * Sugere a mensagem de cobrança quando a consulta já aconteceu há pelo menos
 * `reminderDays` dias e o pagamento continua pendente. Consultas futuras ou
 * de hoje nunca disparam a sugestão.
 */
export function shouldSuggestPaymentReminder(
  sessionDateISO: string,
  todayISO: string,
  reminderDays: number,
): boolean {
  return daysBetweenIsoDates(sessionDateISO, todayISO) >= Math.max(1, reminderDays);
}
