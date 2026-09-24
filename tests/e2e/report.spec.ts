import { expect, test } from "@playwright/test";

// Já começa logado (sessão salva por auth.setup.ts).
test("gera o relatório a partir das anotações, salva e manda imprimir", async ({ page }) => {
  // A janela de impressão do sistema não pode abrir no teste: só registra a chamada.
  await page.addInitScript(() => {
    (window as unknown as { __printed: number }).__printed = 0;
    window.print = () => {
      (window as unknown as { __printed: number }).__printed += 1;
    };
  });

  // Entra pela ficha: a consulta anotada do Pedro tem o botão "Relatório".
  await page.goto("/admin/pacientes");
  await page.getByText("Pedro Henrique Lima").click();
  await page.getByRole("tab", { name: /Retornos/ }).click();
  await page.getByRole("link", { name: "Relatório", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Relatório", exact: true, level: 1 })).toBeVisible();

  // Rascunho (ou relatório já salvo) contém as anotações da consulta.
  const editorText = page.getByLabel("Texto do relatório");
  if (!(await editorText.isVisible())) await page.getByRole("radio", { name: "Editar texto" }).click();
  await expect(editorText).toHaveValue(/Mãe relata que ele tem acordado/);

  const extra = `Observação do teste ${Date.now()}.`;
  await editorText.fill(`${await editorText.inputValue()}\n${extra}`);
  await page.getByRole("button", { name: "Salvar relatório" }).click();
  await expect(page.getByText("Relatório salvo")).toBeVisible();

  // Depois de salvar mostra o documento, com cabeçalho e o texto novo.
  await expect(page.getByText("Relatório de atendimento")).toBeVisible();
  await expect(page.getByText(extra)).toBeVisible();
  await expect(page.getByText(/salvo em/)).toBeVisible();

  await page.getByRole("button", { name: "Imprimir / salvar PDF" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);

  // Aparece entre os salvos.
  await page.goto("/admin/relatorios");
  await expect(page.getByRole("link", { name: /Pedro Henrique Lima.*Abrir/ })).toBeVisible();
});
