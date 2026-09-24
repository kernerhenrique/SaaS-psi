import { expect, test } from "@playwright/test";

test.describe("sem sessão", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("quem não entrou é levado ao login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test("psicóloga vê o resumo do dia", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Amanda");
  await expect(page.getByText("Consultas de hoje")).toBeVisible();
  await expect(page.getByText("Pagamentos pendentes")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar cobrança" }).first()).toBeVisible();
});
