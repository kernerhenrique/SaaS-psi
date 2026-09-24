import { expect, test as setup } from "@playwright/test";

import { AUTH_STATE } from "../../playwright.config";

// Faz login uma vez (conta do seed de desenvolvimento) e salva a sessão para os demais testes.
setup("login da psicóloga", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill("amanda@consultorio.dev");
  await page.getByLabel("Senha").fill("consultorio123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Amanda");
  await page.context().storageState({ path: AUTH_STATE });
});
