// O Prisma sempre procura o Query Engine também em node_modules/.prisma/client
// (é o caminho padrão dele), mesmo quando o client é gerado em outro lugar
// (aqui, src/generated/prisma). Copiamos o(s) binário(s) para lá como reforço,
// caso o rastreamento de arquivos do Next não inclua a pasta customizada no
// pacote da função serverless.
import { readdirSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(process.cwd(), "src", "generated", "prisma");
// Em produção (Vercel), o Prisma procura o engine em ".prisma/client" a
// partir da raiz do projeto (ex.: /var/task/.prisma/client) — sem o
// "node_modules" no meio. Copiamos para os dois lugares, para cobrir
// qualquer uma das estratégias de busca do Prisma.
const DEST_DIRS = [
  join(process.cwd(), "node_modules", ".prisma", "client"),
  join(process.cwd(), ".prisma", "client"),
];

if (!existsSync(SRC_DIR)) {
  console.log("[copy-prisma-engine] pasta gerada do Prisma não encontrada, pulando.");
  process.exit(0);
}

const engineFiles = readdirSync(SRC_DIR).filter(
  (name) => name.endsWith(".so.node") || name.endsWith(".dll.node"),
);

for (const destDir of DEST_DIRS) {
  mkdirSync(destDir, { recursive: true });
  for (const file of engineFiles) {
    copyFileSync(join(SRC_DIR, file), join(destDir, file));
    console.log(`[copy-prisma-engine] copiado ${file} -> ${destDir}`);
  }
}
