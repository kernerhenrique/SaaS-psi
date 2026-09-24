import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Criptografia dos campos de prontuário (AES-256-GCM). Mesmo quem tiver acesso
// direto ao banco (backup vazado, painel do provedor) só vê texto cifrado.
//
// Formato gravado: "v1:<iv>:<authTag>:<ciphertext>", tudo em base64. O prefixo
// de versão permite trocar de algoritmo/chave no futuro sem ambiguidade.

const VERSION = "v1";
const IV_BYTES = 12;

function loadKey(): Buffer {
  const hex = process.env.RECORDS_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error("RECORDS_ENCRYPTION_KEY ausente ou inválida (esperado: 64 caracteres hexadecimais).");
  }
  return Buffer.from(hex, "hex");
}

export function encryptText(plainText: string, key: Buffer = loadKey()): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

/** Lança erro se o texto foi adulterado ou cifrado com outra chave (o GCM verifica a integridade). */
export function decryptText(stored: string, key: Buffer = loadKey()): string {
  const [version, iv, authTag, ciphertext] = stored.split(":");
  if (version !== VERSION || !iv || !authTag || ciphertext === undefined) {
    throw new Error("Formato de texto cifrado desconhecido.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

/** Atalhos para campos opcionais: `null`/vazio continua `null`, sem cifrar string vazia. */
export function encryptOptional(plainText: string | null | undefined, key?: Buffer): string | null {
  return plainText ? encryptText(plainText, key) : null;
}

export function decryptOptional(stored: string | null | undefined, key?: Buffer): string | null {
  return stored ? decryptText(stored, key) : null;
}
