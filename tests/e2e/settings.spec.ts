import { expect, test } from "@playwright/test";

// Já começa logado (sessão salva por auth.setup.ts). Restaura o valor original no final.
test("altera o valor do retorno e a nova consulta já vem com ele", async ({ page }) => {
  await page.goto("/admin/configuracoes");
  const row = page.getByRole("listitem").filter({ has: page.getByLabel("Nome").and(page.locator('[value="Retorno"]')) });
  const price = row.getByLabel("Valor (R$)");
  const original = await price.inputValue();

  await price.fill("215");
  await row.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Tipo de consulta atualizado")).toBeVisible();

  // A sugestão de valor na nova consulta usa o preço novo.
  await page.goto("/admin/agenda?nova=1");
  await page.getByPlaceholder("Digite o nome do paciente").fill("laura");
  await page.getByRole("option", { name: /Laura Nunes/ }).click();
  await expect(page.getByLabel("Valor (R$)")).toHaveValue("215,00");
  await page.getByRole("button", { name: "Cancelar" }).click();

  // Restaura.
  await page.goto("/admin/configuracoes");
  await row.getByLabel("Valor (R$)").fill(original);
  await row.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Tipo de consulta atualizado")).toBeVisible();
});

test("tela de erro amigável para página inexistente", async ({ page }) => {
  await page.goto("/admin/pacientes/nao-existe");
  await expect(page.getByText("Página não encontrada")).toBeVisible();
  await expect(page).toHaveTitle(/Consultório/);
});
