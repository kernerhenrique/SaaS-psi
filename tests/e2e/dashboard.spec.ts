import { expect, test } from "@playwright/test";

// Usa os dados do seed de desenvolvimento (npx prisma db seed).
test("psicóloga faz login e vê o resumo do dia", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.getByLabel("E-mail").fill("amanda@consultorio.dev");
  await page.getByLabel("Senha").fill("consultorio123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Amanda");
  await expect(page.getByText("Consultas de hoje")).toBeVisible();
  await expect(page.getByText("Pagamentos pendentes")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar cobrança" }).first()).toBeVisible();
});
