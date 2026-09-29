import "dotenv/config";

import {
  MessageTemplateKind,
  PrismaClient,
} from "../src/generated/prisma/client.js";
import { DEFAULT_MESSAGE_TEMPLATES } from "../src/lib/message-template.js";
import { hashPassword } from "../src/server/modules/auth/password.js";

// Provisiona a conta real de produção (Business + usuário OWNER). Ao
// contrário de prisma/seed.ts (desenvolvimento), este script:
// - não apaga nada;
// - não cria pacientes fictícios;
// - não roda automaticamente no deploy — é pensado para ser executado uma
//   única vez, manualmente, apontando para o banco de produção.
//
// Uso (a senha nunca deve ficar salva em arquivo ou aparecer em log):
//   DATABASE_URL="<url de produção>" PROD_OWNER_EMAIL="..." PROD_OWNER_PASSWORD="..." \
//     npx tsx prisma/seed-production.ts

const prisma = new PrismaClient();

async function main() {
  const email = requireEnv("PROD_OWNER_EMAIL").trim().toLowerCase();
  const password = requireEnv("PROD_OWNER_PASSWORD");

  if (password.length < 12) {
    throw new Error("PROD_OWNER_PASSWORD precisa ter pelo menos 12 caracteres.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(
      `Já existe um usuário com o e-mail ${email} (id: ${existing.id}). ` +
        "Este script só cria a conta uma vez; nada foi alterado.",
    );
  }

  const passwordHash = await hashPassword(password);

  const business = await prisma.business.create({
    data: {
      name: "Amanda Ribeiro",
      timezone: "America/Sao_Paulo",
      crp: "CRP 16/11644",
      whatsapp: "27998142609",
      logoUrl: "/brand/borboleta.svg",
      users: {
        create: {
          email,
          name: "Amanda Ribeiro",
          passwordHash,
        },
      },
      sessionTypes: {
        create: [
          { name: "Primeira consulta", priceCents: 25000, isFirstVisit: true, sortOrder: 0 },
          { name: "Retorno", priceCents: 20000, sortOrder: 1 },
        ],
      },
      messageTemplates: {
        create: [
          { kind: MessageTemplateKind.REMINDER, content: DEFAULT_MESSAGE_TEMPLATES.reminder },
          { kind: MessageTemplateKind.RETURN_INVITE, content: DEFAULT_MESSAGE_TEMPLATES["return-invite"] },
          { kind: MessageTemplateKind.PAYMENT_REMINDER, content: DEFAULT_MESSAGE_TEMPLATES["payment-reminder"] },
        ],
      },
    },
  });

  // Nunca logar a senha. Só confirmamos o que foi criado.
  console.log({
    ok: true,
    businessId: business.id,
    login: email,
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
