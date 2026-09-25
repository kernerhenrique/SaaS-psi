import { describe, expect, it } from "vitest";

import { appendTranscript } from "@/lib/transcription";
import { parseTranscripts } from "@/server/modules/dictation/organize.service";

describe("appendTranscript", () => {
  it("começa com maiúscula", () => {
    expect(appendTranscript("", "a mãe contou que")).toBe("A mãe contou que");
  });

  it("separa trechos ditados com ponto e maiúscula", () => {
    expect(appendTranscript("A mãe contou que ele dorme mal", "também está mais irritado")).toBe(
      "A mãe contou que ele dorme mal. Também está mais irritado",
    );
  });

  it("não duplica pontuação e ignora trecho vazio", () => {
    expect(appendTranscript("Dormiu bem.", "brincou")).toBe("Dormiu bem. Brincou");
    expect(appendTranscript("Motivo:", "sono")).toBe("Motivo: sono");
    expect(appendTranscript("Texto", "   ")).toBe("Texto");
  });
});

describe("parseTranscripts", () => {
  it("exige ao menos um dos dois blocos", () => {
    expect(() => parseTranscripts({ parentTranscript: " ", patientTranscript: "" })).toThrow(/pelo menos um/);
    expect(parseTranscripts({ parentTranscript: " Oi ", patientTranscript: null })).toEqual({
      parentTranscript: "Oi",
      patientTranscript: "",
    });
  });
});
