import type { TranscriptionCallbacks, TranscriptionHandle, TranscriptionProvider } from "./types";

// Tipos mínimos da Web Speech API (não fazem parte do lib.dom do TypeScript).
type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = { isFinal: boolean; 0: SpeechRecognitionAlternative };
type SpeechRecognitionEvent = { resultIndex: number; results: ArrayLike<SpeechRecognitionResult> };
type SpeechRecognitionErrorEvent = { error: string };
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "O navegador não deixou usar o microfone. Toque no cadeado ao lado do endereço e permita o microfone.",
  "service-not-allowed": "O reconhecimento de voz está bloqueado neste navegador.",
  "audio-capture": "Nenhum microfone encontrado. Confira se ele está conectado.",
  network: "O reconhecimento de voz precisa de internet. Verifique a conexão.",
};

// O Chrome encerra a escuta sozinho após alguns segundos de silêncio; religamos
// automaticamente até a psicóloga tocar em "Parar" (com um limite de segurança).
const MAX_AUTO_RESTARTS = 50;

export const webSpeechProvider: TranscriptionProvider = {
  label: "Reconhecimento de voz do navegador",
  privacyNote:
    "A voz é convertida em texto pelo próprio navegador (no Chrome, pelo serviço de voz do Google). O áudio não é gravado nem guardado pelo sistema — só o texto.",

  isSupported() {
    return getRecognitionConstructor() !== null;
  },

  start(callbacks: TranscriptionCallbacks): TranscriptionHandle {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      callbacks.onError("Este navegador não tem reconhecimento de voz. Use o Chrome, ou digite o texto.");
      callbacks.onEnd();
      return { stop: () => {} };
    }

    let stoppedByUser = false;
    let finished = false;
    let restarts = 0;
    let recognition: SpeechRecognitionInstance;

    const finish = () => {
      if (finished) return;
      finished = true;
      callbacks.onInterim("");
      callbacks.onEnd();
    };

    const listen = () => {
      recognition = new Recognition();
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) callbacks.onFinal(text.trim());
          else interim += text;
        }
        callbacks.onInterim(interim.trim());
      };

      recognition.onerror = (event) => {
        // "no-speech" (silêncio) e "aborted" (parada normal) não são problemas.
        if (event.error === "no-speech" || event.error === "aborted") return;
        stoppedByUser = true;
        callbacks.onError(ERROR_MESSAGES[event.error] ?? "O reconhecimento de voz parou. Tente de novo.");
      };

      recognition.onend = () => {
        if (!stoppedByUser && restarts < MAX_AUTO_RESTARTS) {
          restarts += 1;
          try {
            listen();
            return;
          } catch {
            // se não conseguir religar, encerra abaixo
          }
        }
        finish();
      };

      recognition.start();
    };

    try {
      listen();
    } catch {
      callbacks.onError("Não foi possível iniciar o microfone. Tente de novo.");
      finish();
    }

    return {
      stop: () => {
        stoppedByUser = true;
        try {
          recognition?.stop();
        } catch {
          finish();
        }
      },
    };
  },
};
