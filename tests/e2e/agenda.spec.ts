import { expect, test } from "@playwright/test";

// Já começa logado (sessão salva por auth.setup.ts).

/** Data futura aleatória (evita conflito de horário entre execuções do teste). */
function randomFutureDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 60 + Math.floor(Math.random() * 300));
  return date.toISOString().slice(0, 10);
}

test("marca, conclui com pagamento e cancela uma consulta", async ({ page }) => {
  const date = randomFutureDate();
  const hour = String(7 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const time = `${hour}:${Math.random() < 0.5 ? "00" : "05"}`;

  await page.goto(`/admin/agenda?nova=1&data=${date}`);
  await page.getByPlaceholder("Digite o nome do paciente").fill("laura");
  await page.getByRole("option", { name: /Laura Nunes/ }).click();
  await expect(page.getByRole("radio", { name: /Retorno/ })).toHaveAttribute("aria-checked", "true");
  await page.getByLabel("Horário").fill(time);
  await page.getByRole("button", { name: "Marcar consulta" }).click();
  await expect(page.getByText("Consulta marcada")).toBeVisible();

  // Tentar marcar outra no mesmo horário mostra o conflito.
  await page.goto(`/admin/agenda?nova=1&data=${date}`);
  await page.getByPlaceholder("Digite o nome do paciente").fill("helena");
  await page.getByRole("option", { name: /Helena Costa/ }).click();
  await page.getByLabel("Horário").fill(time);
  await page.getByRole("button", { name: "Marcar consulta" }).click();
  await expect(page.getByRole("alert")).toContainText("Já existe uma consulta nesse horário");
  await page.getByRole("button", { name: "Cancelar" }).click();

  // Conclui com pagamento via PIX.
  await page.getByRole("button", { name: /Laura Nunes/ }).first().click();
  await page.getByRole("button", { name: "Marcar como realizada" }).click();
  await page.getByRole("radio", { name: "Já recebi" }).click();
  await page.getByRole("button", { name: "Concluir consulta" }).click();
  await expect(page.getByText("Consulta concluída")).toBeVisible();

  // Reabre e cancela para liberar o horário.
  await page.getByRole("button", { name: /Laura Nunes/ }).first().click();
  await page.getByRole("button", { name: "Voltar para agendada" }).click();
  await expect(page.getByText("Consulta reaberta como agendada")).toBeVisible();
  await page.getByRole("button", { name: /Laura Nunes/ }).first().click();
  await page.getByRole("button", { name: "Cancelar consulta" }).click();
  await page.getByRole("button", { name: "Confirmar?" }).click();
  await expect(page.getByText("Consulta cancelada")).toBeVisible();
  await expect(page.getByRole("button", { name: /Laura Nunes/ })).toHaveCount(0);
});
