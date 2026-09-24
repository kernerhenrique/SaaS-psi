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

export type VariableKey = keyof MessageVariables;

/** Explicação de cada variável para a psicóloga, com um exemplo para a prévia. */
export const MESSAGE_VARIABLES: Record<VariableKey, { label: string; example: string }> = {
  responsavel: { label: "Nome do responsável", example: "Carla" },
  nomePaciente: { label: "Nome do paciente", example: "Lucas" },
  data: { label: "Data da consulta", example: "amanhã (25/09)" },
  hora: { label: "Horário", example: "14:00" },
  valor: { label: "Valor", example: "R$ 200,00" },
};

/** Para que serve cada modelo e quais variáveis fazem sentido nele. */
export const TEMPLATE_INFO: Record<MessageTemplateKind, { title: string; description: string; variables: VariableKey[] }> = {
  reminder: {
    title: "Lembrete de consulta",
    description: "Enviado aos pais antes da consulta.",
    variables: ["responsavel", "nomePaciente", "data", "hora"],
  },
  "return-invite": {
    title: "Convite para retorno",
    description: "Para perguntar se a família quer marcar a próxima consulta.",
    variables: ["responsavel", "nomePaciente"],
  },
  "payment-reminder": {
    title: "Lembrete de pagamento",
    description: "Sugerido quando uma consulta fica alguns dias sem pagamento.",
    variables: ["responsavel", "nomePaciente", "data", "valor"],
  },
};

export const TEMPLATE_KINDS = Object.keys(TEMPLATE_INFO) as MessageTemplateKind[];

/**
 * Variáveis escritas no modelo que não existem (ou não se aplicam a ele),
 * ex.: `{nome}` em vez de `{nomePaciente}`, ou `{valor}` num lembrete.
 */
export function findInvalidVariables(template: string, kind: MessageTemplateKind): string[] {
  const allowed = new Set<string>(TEMPLATE_INFO[kind].variables);
  const found = [...template.matchAll(/\{(\w*)\}/g)].map((m) => m[1]);
  return [...new Set(found.filter((name) => !allowed.has(name)))];
}

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
  const base = `https://wa.me/${withCountryCode}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
