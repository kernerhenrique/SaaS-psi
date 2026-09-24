/** Variáveis que a psicóloga pode usar nos modelos de mensagem, entre chaves: `{nomePaciente}`. */
export type MessageVariables = {
  nomePaciente: string;
  responsavel: string;
  data: string;
  hora: string;
  valor: string;
};

export type MessageTemplateKind = "reminder" | "return-invite" | "payment-reminder";

/** Modelos iniciais; cada psicóloga poderá editar os seus. */
export const DEFAULT_MESSAGE_TEMPLATES: Record<MessageTemplateKind, string> = {
  reminder:
    "Olá, {responsavel}! Tudo bem? Passando para lembrar da consulta de {nomePaciente} no dia {data}, às {hora}. Se surgir algum imprevisto, é só me avisar por aqui. Até lá!",
  "return-invite":
    "Olá, {responsavel}! Tudo bem? Como {nomePaciente} tem passado? Gostaria de saber se vocês querem marcar a próxima consulta. Tenho alguns horários nas próximas semanas.",
  "payment-reminder":
    "Olá, {responsavel}! Tudo bem? Passando para lembrar do pagamento da consulta de {nomePaciente} do dia {data}, no valor de {valor}. Se já tiver feito, pode desconsiderar esta mensagem. Obrigada!",
};

/**
 * Troca cada `{variavel}` conhecida pelo valor informado. Variáveis
 * desconhecidas ou sem valor ficam como estão, para a psicóloga perceber o
 * que faltou antes de colar no WhatsApp (em vez de sumirem em silêncio).
 */
export function renderMessageTemplate(template: string, variables: Partial<MessageVariables>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = variables[key as keyof MessageVariables];
    return value ? value : match;
  });
}

/** Link que abre o WhatsApp já com a mensagem escrita para o telefone informado (só dígitos, com DDI). */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
