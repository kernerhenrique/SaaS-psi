/** Guarda só os dígitos, sem o DDI 55 (o link do WhatsApp o adiciona). */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
}

/** "27998142609" → "(27) 99814-2609"; formatos inesperados voltam como vieram. */
export function formatPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

/** Celular ou fixo brasileiro com DDD (10 ou 11 dígitos). */
export function isValidPhone(input: string): boolean {
  const length = normalizePhone(input).length;
  return length === 10 || length === 11;
}
