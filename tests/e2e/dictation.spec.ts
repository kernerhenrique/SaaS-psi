import { expect, test } from "@playwright/test";

// Já começa logado (sessão salva por auth.setup.ts).
// O navegador de teste não tem microfone: simulamos o reconhecimento de voz
// com frases prontas, no mesmo formato de eventos da Web Speech API.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const phrases = ["a mãe contou que ele está dormindo melhor", "brincou com massinha e falou da escola"];
    let call = 0;
    class FakeRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      private stopped = false;
      start() {
        const text = phrases[call++ % phrases.length];
        setTimeout(() => {
          this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: text.slice(0, 10) } }] });
        }, 50);
        setTimeout(() => {
          this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] });
        }, 150);
      }
      stop() {
        if (this.stopped) return;
        this.stopped = true;
        setTimeout(() => this.onend?.(), 20);
      }
    }
    // Substitui as duas versões: o Chromium novo tem a API sem prefixo.
    const w = window as unknown as { webkitSpeechRecognition: unknown; SpeechRecognition: unknown };
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
  });
});

function randomPastDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (30 + Math.floor(Math.random() * 300)));
  return date.toISOString().slice(0, 10);
}

test("dita os dois resumos, usa sem IA e salva no prontuário", async ({ page }) => {
  // Paciente e consulta passada criados pela API (dados de teste, removidos depois).
  const name = `João Teste Ditado ${Date.now()}`;
  const created = await page.request.post("/api/admin/patients", { data: { fullName: name } });
  const patientId = (await created.json()).patient.id as string;
  // Marca a consulta (no passado) pela própria agenda, já com o paciente escolhido.
  const date = randomPastDate();
  await page.goto(`/admin/agenda?nova=1&paciente=${patientId}&data=${date}`);
  await page.getByLabel("Horário").fill("07:15");
  await page.getByRole("button", { name: "Marcar consulta" }).click();
  await expect(page.getByText("Consulta marcada")).toBeVisible();
  const record = await (await page.request.get(`/api/admin/patients/${patientId}`)).json();
  const sessionId = record.patient.sessions[0].id as string;

  // Sem chave da Anthropic, a organização por IA responde com mensagem clara.
  const organize = await page.request.post(`/api/admin/sessions/${sessionId}/organize`, {
    data: { parentTranscript: "teste" },
  });
  expect(organize.status()).toBe(503);
  expect((await organize.json()).error).toContain("chave da Anthropic");

  await page.goto(`/admin/pacientes/${patientId}`);
  await page.getByRole("tab", { name: "Primeira consulta" }).click();
  await page.getByRole("button", { name: "Ditar anotações" }).click();

  // Bloco 1: dita e para.
  const parentBlock = page.locator("section").filter({ hasText: "1. O que os pais" });
  await parentBlock.getByRole("button", { name: "Ditar" }).click();
  await expect(parentBlock.getByRole("textbox")).toHaveValue("A mãe contou que ele está dormindo melhor");
  await parentBlock.getByRole("button", { name: "Parar" }).click();
  await expect(parentBlock.getByRole("button", { name: "Ditar" })).toBeVisible();

  // Bloco 2.
  const patientBlock = page.locator("section").filter({ hasText: "2. Como foi a sessão" });
  await patientBlock.getByRole("button", { name: "Ditar" }).click();
  await expect(patientBlock.getByRole("textbox")).toHaveValue("Brincou com massinha e falou da escola");
  await patientBlock.getByRole("button", { name: "Parar" }).click();

  await expect(page.getByRole("button", { name: "Organizar com IA" })).toBeDisabled();
  await page.getByRole("button", { name: "Usar o texto sem IA" }).click();

  // Revisão: edita e salva.
  await expect(page.getByText("nada foi salvo ainda")).toBeVisible();
  const review = page.getByLabel("Como foi a sessão com o paciente");
  await review.fill(`${await review.inputValue()}. Demonstrou interesse por desenhar.`);
  await page.getByRole("button", { name: "Salvar no prontuário" }).click();
  await expect(page.getByText("Anotações salvas no prontuário")).toBeVisible();
  await expect(page.getByText("A mãe contou que ele está dormindo melhor")).toBeVisible();
  await expect(page.getByText(/Demonstrou interesse por desenhar/)).toBeVisible();
});
