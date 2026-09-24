import { defineConfig, devices } from "@playwright/test";

// Sessão logada salva pela etapa "setup" e reaproveitada pelos testes: um único
// login por execução (o login tem limite de tentativas contra força bruta).
export const AUTH_STATE = "playwright/.auth/amanda.json";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Localmente, poucos navegadores em paralelo: o servidor de dev e o Docker dividem a mesma máquina.
  workers: process.env.CI ? undefined : 2,
  retries: process.env.CI ? 1 : 0,
  // Em desenvolvimento o Next compila cada página no primeiro acesso (pode levar ~20s).
  timeout: 90_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
