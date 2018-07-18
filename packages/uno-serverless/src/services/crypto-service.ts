import { compare, genSalt, hash } from "bcryptjs";
import { createCipheriv, createDecipheriv, pbkdf2, randomBytes } from "crypto";

export interface CryptoService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hashedPassword: string): Promise<boolean>;
  encrypt(value: string): Promise<string>;
  decrypt(encrypted: string): Promise<string>;
}

export interface DefaultCryptoServiceOptions {
  /** Number of rounds to use for bcrypt salt, defaults to 12 if omitted */
  bcryptSaltRounds?: number;
  /** The master key to use for symmetric encryption */
  key?: string | Promise<string | undefined>;
  /** The number of iterations to derive the key for symmetric encryption, defaults to 10,000 */
  derivedKeyRounds?: number;
}

/**
 * Default CryptoService implementation that uses:
 * - bcrypt with 12 rounds for password hashes
 * - aes-256-gcm for symmetric encryption
 * (Those are probably good default if you don't know what you're doing...)
 */
export class DefaultCryptoService implements CryptoService {

  private readonly options: DefaultCryptoServiceOptions;

  public constructor(options: DefaultCryptoServiceOptions = {}) {
    this.options = {
      bcryptSaltRounds: 12,
      derivedKeyRounds: 10000,
      ...options,
    };
  }

  public async hashPassword(password: string): Promise<string> {
    return hash(password, await genSalt(this.options.bcryptSaltRounds));
  }

  public async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword);
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
    const data = Buffer.from(encrypted, "base64");

    const salt = data.slice(0, 64);
    const iv = data.slice(64, 80);
    const tag = data.slice(80, 96);
    const text = data.slice(96);
    const key = await this.getDerivedKey(salt);

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    (decipher as any).setAuthTag(tag);

    return decipher.update(text, "binary", "utf8") + decipher.final("utf8");
  }

  private async getDerivedKey(salt: Buffer) {
    const symmetricKey = await this.options.key;
    if (!symmetricKey) {
      throw new Error("Symmetric Key has not been defined for DefaultCryptoService.");
    }
    return new Promise<Buffer>((resolve, reject) => {
      pbkdf2(symmetricKey, salt, this.options.derivedKeyRounds!, 32, "sha512", (err, derivedKey) => {
        if (err) {
          return reject(err);
        }

        return resolve(derivedKey);
      });
    });
  }
}
