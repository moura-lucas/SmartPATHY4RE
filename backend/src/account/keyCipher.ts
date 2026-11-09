import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface KeyCipher {
  encrypt(userId: string, apiKey: string): string;
  /** Throws when the value was tampered with or the secret changed. */
  decrypt(userId: string, encrypted: string): string;
}

const ALGORITHM = "aes-256-gcm";

/**
 * AES-256-GCM with a master key that exists only in the server's environment, so a
 * leaked database does not expose the keys. The user id is authenticated too, which
 * stops a value from working if it is copied to another account.
 */
export function createKeyCipher(secretHex: string): KeyCipher {
  const secret = Buffer.from(secretHex, "hex");

  return {
    encrypt(userId, apiKey) {
      const iv = randomBytes(12);
      const cipher = createCipheriv(ALGORITHM, secret, iv);
      cipher.setAAD(Buffer.from(userId));
      const content = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
      return [iv, cipher.getAuthTag(), content].map((part) => part.toString("base64")).join(".");
    },
    decrypt(userId, encrypted) {
      const [iv, tag, content] = encrypted.split(".").map((part) => Buffer.from(part, "base64"));
      const decipher = createDecipheriv(ALGORITHM, secret, iv!);
      decipher.setAAD(Buffer.from(userId));
      decipher.setAuthTag(tag!);
      return Buffer.concat([decipher.update(content!), decipher.final()]).toString("utf8");
    },
  };
}
