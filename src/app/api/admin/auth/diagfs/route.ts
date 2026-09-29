import { existsSync, readdirSync } from "node:fs";
import { NextResponse } from "next/server";

// Rota de diagnóstico TEMPORÁRIA para investigar o erro de engine do Prisma
// em produção. Sem dados sensíveis (só listagem de arquivos). Remover depois
// de resolver o deploy.
export async function GET() {
  const candidates = [
    process.cwd(),
    "/var/task",
    "/var/task/src/generated/prisma",
    "/var/task/.prisma/client",
    "/var/task/node_modules/.prisma/client",
    "/vercel/path0/src/generated/prisma",
  ];

  const result: Record<string, string[] | string> = {};

  for (const dir of candidates) {
    if (!existsSync(dir)) {
      result[dir] = "não existe";
      continue;
    }
    try {
      result[dir] = readdirSync(dir);
    } catch (error) {
      result[dir] = `erro: ${String(error)}`;
    }
  }

  return NextResponse.json({ cwd: process.cwd(), result });
}
