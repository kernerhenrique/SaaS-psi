import { expect, test } from "@playwright/test";

// Já começa logado (sessão salva por auth.setup.ts). Restaura o modelo no final.
test("sugere mensagens e permite editar e restaurar um modelo", async ({ page }) => {
  await page.goto("/admin/mensagens");

  // A cobrança da Sofia (pendente há 6 dias no seed) abre o WhatsApp da mãe com o texto pronto.
  const sofia = page.getByRole("listitem").filter({ hasText: "Sofia Martins" }).filter({ hasText: "R$ 200,00" });
  const whatsapp = sofia.getByRole("link", { name: "Abrir no WhatsApp" });
  await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/5527999110005\?text=Ol%C3%A1%2C%20Renata/);

  const editor = page.getByLabel("Convite para retorno");
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
