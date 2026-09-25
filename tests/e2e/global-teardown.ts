import { execSync } from "node:child_process";

/**
 * Ao terminar os testes E2E, remove do banco LOCAL os dados que eles criaram
 * (pacientes "João Teste…", consultas canceladas de teste). Ver scripts/limpar-dados-e2e.sql.
 */
export default function globalTeardown() {
  if (process.env.CI) return; // em CI o banco é descartável
  try {
    execSync("npm run db:limpar-testes", { stdio: "ignore" });
  } catch {
    console.warn("Não foi possível limpar os dados de teste. Rode: npm run db:limpar-testes");
  }
}
