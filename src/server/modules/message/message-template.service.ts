import { MessageTemplateKind } from "@/generated/prisma/enums";
import { DEFAULT_MESSAGE_TEMPLATES, type MessageTemplateKind as TemplateKey } from "@/lib/message-template";
import { prisma } from "@/server/db/prisma";

const KIND_TO_KEY: Record<MessageTemplateKind, TemplateKey> = {
  [MessageTemplateKind.REMINDER]: "reminder",
  [MessageTemplateKind.RETURN_INVITE]: "return-invite",
  [MessageTemplateKind.PAYMENT_REMINDER]: "payment-reminder",
};

/** Modelos da psicóloga; o que ela ainda não personalizou usa o texto padrão do produto. */
export async function getMessageTemplates(businessId: string): Promise<Record<TemplateKey, string>> {
  const saved = await prisma.messageTemplate.findMany({ where: { businessId } });
  const templates = { ...DEFAULT_MESSAGE_TEMPLATES };
  for (const t of saved) templates[KIND_TO_KEY[t.kind]] = t.content;
  return templates;
}
