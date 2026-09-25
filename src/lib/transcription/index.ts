import type { TranscriptionProvider } from "./types";
import { webSpeechProvider } from "./web-speech";

export type { TranscriptionProvider } from "./types";

/**
 * Provider de transcrição em uso. Para passar a usar uma API paga, troque
 * aqui por outro provider que implemente a mesma interface.
 */
export const transcriptionProvider: TranscriptionProvider = webSpeechProvider;

/** Junta um trecho novo ao texto já ditado, com espaço e ponto quando fizer sentido. */
export function appendTranscript(current: string, chunk: string): string {
  const text = chunk.trim();
  if (!text) return current;
  const base = current.trimEnd();
  if (!base) return text.charAt(0).toUpperCase() + text.slice(1);
  const needsPeriod = !/[.!?…:]$/.test(base);
  // Começa frase nova com maiúscula (o reconhecimento de voz devolve tudo em minúsculas).
  const startsSentence = needsPeriod || /[.!?…]$/.test(base);
  const next = startsSentence ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  return `${base}${needsPeriod ? "." : ""} ${next}`;
}
