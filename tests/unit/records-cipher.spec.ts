import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { decryptOptional, decryptText, encryptOptional, encryptText } from "@/server/crypto/records-cipher";

const key = randomBytes(32);

describe("records-cipher", () => {
  it("cifra e decifra de volta o mesmo texto (com acentos)", () => {
    const text = "Mãe relata que o sono melhorou após a rotina noturna.";
    const stored = encryptText(text, key);
    expect(stored).not.toContain("sono");
    expect(stored.startsWith("v1:")).toBe(true);
    expect(decryptText(stored, key)).toBe(text);
  });

  it("gera um texto cifrado diferente a cada vez (IV aleatório)", () => {
    expect(encryptText("igual", key)).not.toBe(encryptText("igual", key));
  });

  it("recusa texto adulterado", () => {
    const [version, iv, tag, data] = encryptText("original", key).split(":");
    const tampered = Buffer.from(data, "base64");
    tampered[0] ^= 0xff;
    expect(() => decryptText([version, iv, tag, tampered.toString("base64")].join(":"), key)).toThrow();
  });

  it("recusa decifrar com outra chave", () => {
    const stored = encryptText("segredo", key);
    expect(() => decryptText(stored, randomBytes(32))).toThrow();
  });

  it("mantém campos opcionais vazios como null", () => {
    expect(encryptOptional(null, key)).toBeNull();
    expect(encryptOptional("", key)).toBeNull();
    expect(decryptOptional(null, key)).toBeNull();
    expect(decryptOptional(encryptOptional("ok", key), key)).toBe("ok");
  });
});
