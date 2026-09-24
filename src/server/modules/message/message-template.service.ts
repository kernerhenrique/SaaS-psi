import { MessageTemplateKind } from "@/generated/prisma/enums";
import {
  DEFAULT_MESSAGE_TEMPLATES,
  findInvalidVariables,
  TEMPLATE_KINDS,
  type MessageTemplateKind as TemplateKey,
} from "@/lib/message-template";
import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";

const KIND_TO_KEY: Record<MessageTemplateKind, TemplateKey> = {
  [MessageTemplateKind.REMINDER]: "reminder",
  [MessageTemplateKind.RETURN_INVITE]: "return-invite",
  [MessageTemplateKind.PAYMENT_REMINDER]: "payment-reminder",
};

const KEY_TO_KIND = Object.fromEntries(
  Object.entries(KIND_TO_KEY).map(([kind, key]) => [key, kind]),
) as Record<TemplateKey, MessageTemplateKind>;

const MAX_TEMPLATE_LENGTH = 1500;

/** Modelos da psicóloga; o que ela ainda não personalizou usa o texto padrão do produto. */
export async function getMessageTemplates(businessId: string): Promise<Record<TemplateKey, string>> {
  const saved = await prisma.messageTemplate.findMany({ where: { businessId } });
  const templates = { ...DEFAULT_MESSAGE_TEMPLATES };
  for (const t of saved) templates[KIND_TO_KEY[t.kind]] = t.content;
  return templates;
}

export function parseTemplateKey(value: string): TemplateKey {
  if (!TEMPLATE_KINDS.includes(value as TemplateKey)) throw new ValidationError("Modelo de mensagem inválido.");
  return value as TemplateKey;
}

export function parseTemplateContent(body: unknown, key: TemplateKey): string {
  const content = typeof (body as { content?: unknown })?.content === "string" ? (body as { content: string }).content.trim() : "";
  if (!content) throw new ValidationError("Escreva o texto da mensagem.");
  if (content.length > MAX_TEMPLATE_LENGTH) throw new ValidationError("A mensagem está muito longa.");
  const invalid = findInvalidVariables(content, key);
  if (invalid.length) {
    const list = invalid.map((name) => `{${name}}`).join(", ");
    throw new ValidationError(
      `${list} não ${invalid.length === 1 ? "é uma variável válida" : "são variáveis válidas"} para esta mensagem. Use os botões abaixo do texto para inserir as variáveis.`,
    );
  }
  return content;
}

export async function saveMessageTemplate(businessId: string, key: TemplateKey, content: string) {
  const kind = KEY_TO_KIND[key];
  await prisma.messageTemplate.upsert({
    where: { businessId_kind: { businessId, kind } },
    create: { businessId, kind, content },
    update: { content },
  });
}

/** Volta ao texto padrão do produto (apaga a versão personalizada). */
export async function resetMessageTemplate(businessId: string, key: TemplateKey) {
  await prisma.messageTemplate.deleteMany({ where: { businessId, kind: KEY_TO_KIND[key] } });
}

export async function setPaymentReminderDays(businessId: string, days: unknown) {
  if (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > 30) {
    throw new ValidationError("Escolha entre 1 e 30 dias.");
  }
  await prisma.business.update({ where: { id: businessId }, data: { paymentReminderDays: days } });
}
