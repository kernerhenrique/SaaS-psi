import { expect, test } from "@playwright/test";

// Já começa logado (sessão salva por auth.setup.ts). Restaura o modelo no final.
test("sugere mensagens e permite editar e restaurar um modelo", async ({ page }) => {
  await page.goto("/admin/mensagens");

  // A cobrança do Gabriel (pendente há 4 dias no seed) abre o WhatsApp do pai com o texto pronto.
  // (Não usa a da Sofia: o teste do Financeiro mexe nela em paralelo.)
  const gabriel = page.getByRole("listitem").filter({ hasText: "Gabriel Rocha" }).filter({ hasText: "R$ 250,00" });
  const whatsapp = gabriel.getByRole("link", { name: "Abrir no WhatsApp" });
  await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/5527999110006\?text=Ol%C3%A1%2C%20Andr%C3%A9/);

  const editor = page.getByLabel("Convite para retorno");
  // Se uma execução anterior deixou o modelo personalizado, começa do texto padrão.
  const restoreFirst = page
    .locator("section")
    .filter({ has: editor })
    .getByRole("button", { name: "Restaurar texto padrão" });
  if (await restoreFirst.isVisible()) {
    await restoreFirst.click();
    await expect(page.getByText("Texto padrão restaurado")).toBeVisible();
  }
  const original = await editor.inputValue();

  // Variável escrita errado: aviso e botão de salvar desabilitado.
  await editor.fill(`${original} {nome}`);
  await expect(page.getByText(/\{nome\} não é reconhecida/)).toBeVisible();
  const section = page.locator("section").filter({ has: editor });
  await expect(section.getByRole("button", { name: "Salvar modelo" })).toBeDisabled();

  // Edição válida aparece na prévia e é salva.
  await editor.fill(`${original} Um abraço!`);
  await expect(section.getByText(/Como Lucas tem passado\?.*Um abraço!/)).toBeVisible();
  await section.getByRole("button", { name: "Salvar modelo" }).click();
  await expect(page.getByText("Modelo salvo")).toBeVisible();

  await page.getByLabel("Convite para retorno").waitFor();
  await page.locator("section").filter({ has: page.getByLabel("Convite para retorno") })
    .getByRole("button", { name: "Restaurar texto padrão" })
    .click();
  await expect(page.getByText("Texto padrão restaurado")).toBeVisible();
  await expect(page.getByLabel("Convite para retorno")).toHaveValue(original);
});
