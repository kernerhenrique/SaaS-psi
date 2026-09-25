// Contrato de qualquer serviço de transcrição (voz → texto).
// Hoje: reconhecimento de voz do navegador (web-speech.ts). Para trocar por
// uma API paga (ex.: gravar o áudio e enviar a /api/transcribe), basta criar
// outro provider com esta mesma interface — a tela de ditado não muda.

export type TranscriptionCallbacks = {
  /** Trecho já confirmado, para acrescentar ao texto. */
  onFinal: (text: string) => void;
  /** Prévia do que está sendo falado agora (substitui a anterior). */
  onInterim: (text: string) => void;
  /** Erro em linguagem simples, para mostrar à psicóloga. */
  onError: (message: string) => void;
  /** A escuta terminou de vez (pela psicóloga ou por erro). */
  onEnd: () => void;
};

export type TranscriptionHandle = { stop: () => void };

export interface TranscriptionProvider {
  /** Nome exibido na tela (ex.: "Reconhecimento de voz do navegador"). */
  readonly label: string;
  /** Aviso de privacidade: para onde vai a voz durante a transcrição. */
  readonly privacyNote: string;
  isSupported(): boolean;
  start(callbacks: TranscriptionCallbacks): TranscriptionHandle;
}
