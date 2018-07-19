import { createCipheriv, createDecipheriv, pbkdf2, randomBytes } from "crypto";

/** Provides features related to symmetric encryption. */
export interface SymmetricEncryptionService {
  encrypt(value: string): Promise<string>;
  decrypt(encrypted: string): Promise<string>;
  /** Returns whether value was probably encrypted by this service before. */
  supports(encrypted: string): Promise<boolean>;
}

export interface AES256GCMSymmetricEncryptionServiceOptions {
  /** The master key to use for symmetric encryption */
  masterKey: string | Promise<string>;
  /** The number of iterations to use for key derivation, defaults to 10,000 */
  derivedKeyRounds?: number;
}

/** SymmetricEncryptionService using AES 256 GCM with derived keys and IV. */
export class AES256GCMSymmetricEncryptionService implements SymmetricEncryptionService {

  private readonly masterKey: string | Promise<string>;
  private readonly derivedKeyRounds: number;

  public constructor({ masterKey, derivedKeyRounds }: AES256GCMSymmetricEncryptionServiceOptions) {
    this.masterKey = masterKey;
    this.derivedKeyRounds = derivedKeyRounds || 10000;
  }

  public async encrypt(value: string): Promise<string> {
    const iv = randomBytes(16);
    const salt = randomBytes(64);
    const derivedKey = await this.getDerivedKey(salt);
    const cipher = createCipheriv("aes-256-gcm", derivedKey, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = (cipher as any).getAuthTag();
    return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
  }

  public async decrypt(encrypted: string): Promise<string> {
    const { iv, salt, tag, text } = this.extract(encrypted);
    const key = await this.getDerivedKey(salt);

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    (decipher as any).setAuthTag(tag);

    return decipher.update(text, "binary", "utf8") + decipher.final("utf8");
  }

  public async supports(encrypted: string): Promise<boolean> {
    if (typeof encrypted !== "string") {
      return false;
    }

    const { iv, salt, tag } = this.extract(encrypted);
    return (iv.byteLength === 16)
      && (salt.byteLength === 64)
      && (tag.byteLength === 16);
  }

  private extract(encrypted: string) {
    const data = Buffer.from(encrypted, "base64");

    return {
      iv: data.slice(64, 80),
      salt: data.slice(0, 64),
      tag: data.slice(80, 96),
      text: data.slice(96),
    };
  }

  private async getDerivedKey(salt: Buffer) {
    const masterKey = await this.masterKey;
    return new Promise<Buffer>((resolve, reject) => {
      pbkdf2(masterKey, salt, this.derivedKeyRounds, 32, "sha512", (err, derivedKey) => {
        if (err) {
          return reject(err);
        }

        return resolve(derivedKey);
      });
    });
  }

}
