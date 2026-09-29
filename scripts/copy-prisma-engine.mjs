// O Prisma sempre procura o Query Engine também em node_modules/.prisma/client
// (é o caminho padrão dele), mesmo quando o client é gerado em outro lugar
// (aqui, src/generated/prisma). Copiamos o(s) binário(s) para lá como reforço,
// caso o rastreamento de arquivos do Next não inclua a pasta customizada no
// pacote da função serverless.
import { readdirSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(process.cwd(), "src", "generated", "prisma");
const DEST_DIR = join(process.cwd(), "node_modules", ".prisma", "client");

if (!existsSync(SRC_DIR)) {
  console.log("[copy-prisma-engine] pasta gerada do Prisma não encontrada, pulando.");
  process.exit(0);
}

mkdirSync(DEST_DIR, { recursive: true });

const engineFiles = readdirSync(SRC_DIR).filter(
  (name) => name.endsWith(".so.node") || name.endsWith(".dll.node"),
);

for (const file of engineFiles) {
  copyFileSync(join(SRC_DIR, file), join(DEST_DIR, file));
  console.log(`[copy-prisma-engine] copiado ${file} -> node_modules/.prisma/client/`);
}
