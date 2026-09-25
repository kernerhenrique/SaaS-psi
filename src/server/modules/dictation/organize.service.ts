import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/server/errors";

// Organiza o ditado da psicóloga (feito DEPOIS do atendimento) nos campos do
// prontuário usando o Claude. O resultado é só um rascunho: a psicóloga revisa
// e edita antes de salvar. Nenhum áudio chega aqui — só o texto transcrito.

const MODEL = "claude-opus-5";
const MAX_TRANSCRIPT_LENGTH = 20_000;

export const OrganizedNoteSchema = z.object({
  parentReport: z.string().describe("Resumo do que os pais/responsáveis relataram. Vazio se nada foi ditado."),
  patientSession: z.string().describe("Resumo da sessão com o paciente. Vazio se nada foi ditado."),
  followUps: z
    .array(z.string())
    .describe("Pontos curtos para verificar na próxima sessão, só os que foram mencionados."),
});

export type OrganizedNote = z.infer<typeof OrganizedNoteSchema>;

const SYSTEM_PROMPT = `Você ajuda uma psicóloga que atende crianças, adolescentes e jovens a organizar as anotações do prontuário.
Logo após o atendimento, ela dita dois resumos: o que os pais ou responsáveis relataram e como foi a sessão com o paciente.
O texto vem de reconhecimento de voz e pode ter erros de transcrição, repetições e marcas de fala.

Reescreva cada resumo em português do Brasil, em texto corrido, claro e objetivo, na terceira pessoa, no tom de um registro clínico.
- Mantenha somente o que foi ditado. Não invente fatos, não acrescente interpretações, hipóteses ou diagnósticos.
- Corrija erros evidentes de transcrição e remova hesitações e repetições, sem mudar o sentido.
- Se um dos blocos veio vazio, devolva esse campo como texto vazio.
- Em "followUps", liste apenas os pontos que a psicóloga indicou para acompanhar ou verificar depois
  (ex.: "Verificar se melhorou o sono"), em frases curtas começando com verbo. Se não houver, devolva lista vazia.`;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function cleanTranscript(value: unknown, label: string): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new ValidationError(`${label} inválido.`);
  const text = value.trim();
  if (text.length > MAX_TRANSCRIPT_LENGTH) throw new ValidationError(`${label} está muito longo.`);
  return text;
}

export function parseTranscripts(body: unknown): { parentTranscript: string; patientTranscript: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const parentTranscript = cleanTranscript(b.parentTranscript, "O relato dos pais");
  const patientTranscript = cleanTranscript(b.patientTranscript, "O relato da sessão");
  if (!parentTranscript && !patientTranscript) {
    throw new ValidationError("Dite ou escreva pelo menos um dos dois resumos antes de organizar.");
  }
  return { parentTranscript, patientTranscript };
}

export class AiUnavailableError extends Error {}

export async function organizeDictation(
  businessId: string,
  sessionId: string,
  transcripts: { parentTranscript: string; patientTranscript: string },
): Promise<OrganizedNote> {
  const session = await prisma.session.findFirst({ where: { id: sessionId, businessId }, select: { id: true } });
  if (!session) throw new NotFoundError("Consulta não encontrada");
  if (!isAiConfigured()) {
    throw new AiUnavailableError("A organização por IA ainda não foi configurada (falta a chave da Anthropic).");
  }

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // Se o modelo recusar, a API tenta automaticamente com um modelo de reserva.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(OrganizedNoteSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<relato_dos_pais>\n${transcripts.parentTranscript}\n</relato_dos_pais>\n\n<sessao_com_paciente>\n${transcripts.patientTranscript}\n</sessao_com_paciente>`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new ValidationError("A IA não conseguiu organizar este texto. Use o texto ditado sem IA e revise manualmente.");
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      throw new ValidationError("A resposta da IA veio incompleta. Tente de novo.");
    }
    return {
      parentReport: response.parsed_output.parentReport.trim(),
      patientSession: response.parsed_output.patientSession.trim(),
      followUps: response.parsed_output.followUps.map((item) => item.trim()).filter(Boolean).slice(0, 10),
    };
  } catch (error) {
    // Mensagens amigáveis; o texto clínico nunca vai para os logs.
    if (error instanceof ValidationError) throw error;
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new AiUnavailableError("A chave da Anthropic foi recusada. Confira a ANTHROPIC_API_KEY no .env.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiUnavailableError("Muitos pedidos à IA agora. Tente de novo em instantes.");
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new AiUnavailableError("Não foi possível falar com a IA. Verifique a internet e tente de novo.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[organize] Erro da API Anthropic: status ${error.status}`);
      throw new AiUnavailableError("A IA está indisponível no momento. Tente de novo mais tarde.");
    }
    throw error;
  }
}
