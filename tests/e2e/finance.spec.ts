import { expect, test } from "@playwright/test";

// Já começa logado (sessão salva por auth.setup.ts). Usa a pendência da Sofia do seed
// e devolve para "pendente" no final, para não mudar os dados de desenvolvimento.
test("registra um pagamento pendente, baixa a planilha e desfaz", async ({ page }) => {
  await page.goto("/admin/financeiro");
  const sofia = page.getByRole("listitem").filter({ hasText: "Sofia Martins" });
  await expect(sofia).toBeVisible();

  await sofia.getByRole("button", { name: "Registrar pagamento" }).click();
  await page.getByRole("radio", { name: "Dinheiro" }).click();
  await page.getByLabel("Valor (R$)").fill("180");
  await page.getByRole("button", { name: "Salvar pagamento" }).click();
  await expect(page.getByText("Pagamento registrado")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Sofia Martins" })).toHaveCount(0);

  // Aparece nos recebidos do mês, com o valor combinado, e entra na planilha.
  await page.getByRole("tab", { name: "Recebidos" }).click();
  const received = page.getByRole("listitem").filter({ hasText: "Sofia Martins" }).filter({ hasText: "Dinheiro" });
  await expect(received).toContainText("R$ 180,00");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Baixar planilha/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^recebimentos-\d{4}-\d{2}\.csv$/);

  // Desfaz: volta para "ainda não recebi" com o valor original.
  await received.getByRole("button", { name: /Alterar pagamento/ }).click();
  await page.getByRole("radio", { name: "Ainda não recebi" }).click();
  await page.getByLabel("Valor (R$)").fill("200");
  await page.getByRole("button", { name: "Salvar pagamento" }).click();
  await expect(page.getByText("Pagamento atualizado")).toBeVisible();
  await page.getByRole("tab", { name: /A receber/ }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Sofia Martins" })).toBeVisible();
});
