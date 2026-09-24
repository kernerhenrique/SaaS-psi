import { expect, test } from "@playwright/test";

// Já começa logado (sessão salva por auth.setup.ts).

test("cadastra paciente e registra o prontuário", async ({ page }) => {
  const name = `João Teste ${Date.now()}`;

  await page.goto("/admin/pacientes");
  await page.getByRole("button", { name: "Novo paciente" }).click();
  await page.getByLabel("Nome completo do paciente").fill(name);
  await page.getByLabel("Data de nascimento").fill("2017-04-12");
  await page.getByLabel("Informações importantes de saúde").fill("Alergia a amendoim");
  await page.getByLabel("Nome", { exact: true }).fill("Conceição Teste");
  await page.getByLabel("Parentesco").fill("Mãe");
  await page.getByLabel("WhatsApp").fill("27988887777");
  await page.getByRole("button", { name: "Salvar" }).click();

  // Vai direto para a ficha do paciente recém-criado.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText("Alergia a amendoim")).toBeVisible();
  await expect(page.getByText("Mãe:")).toBeVisible();

  await page.getByRole("tab", { name: "Contato com os pais" }).click();
  await page.getByLabel("O que os pais ou responsáveis contaram").fill("Mãe relata ansiedade na hora de dormir.");
  await page.getByRole("button", { name: "Salvar anotação" }).click();
  await expect(page.getByText("Mãe relata ansiedade na hora de dormir.")).toBeVisible();

  await page.getByRole("tab", { name: /Para acompanhar/ }).click();
  await page.getByLabel("Novo ponto para acompanhar").fill("Perguntar sobre a rotina do sono");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("button", { name: "Marcar como resolvido: Perguntar sobre a rotina do sono" }).click();
  await expect(page.getByText("Resolvidos (1)")).toBeVisible();

  // Aparece na lista e é encontrado pela busca sem acento.
  await page.goto("/admin/pacientes");
  await page.getByLabel("Buscar paciente").fill("joao teste");
  await expect(page.getByText(name)).toBeVisible();
});
