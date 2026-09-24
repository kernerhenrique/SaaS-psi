export function formatPriceFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** 25000 → "250,00" (para preencher um campo de valor). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Lê o que a psicóloga digitou ("250", "250,50", "1.250,00", "R$ 200") e
 * devolve centavos; `null` se não der para entender o valor.
 */
export function inputToCents(value: string): number | null {
  const cleaned = value.replace(/[R$\s]/g, "");
  if (!cleaned) return null;
  // Com vírgula, o ponto é separador de milhar; sem vírgula, o ponto é decimal ("250.5").
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
