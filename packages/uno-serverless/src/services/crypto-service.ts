import { compare, genSalt, hash } from "bcryptjs";

export interface CryptoService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hashedPassword: string): Promise<boolean>;
}

export interface DefaultCryptoServiceOptions {
  /** Number of rounds to use for bcrypt salt, defaults to 12 if omitted */
  bcryptSaltRounds?: number;
}

export class DefaultCryptoService implements CryptoService {

  private readonly options: DefaultCryptoServiceOptions;

  public constructor(options: DefaultCryptoServiceOptions) {
    this.options = {
      bcryptSaltRounds: 12,
      ...options,
    };
  }

  public async hashPassword(password: string): Promise<string> {
    return hash(password, await genSalt(this.options.bcryptSaltRounds));
  }

  public async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword);
  }
}
