import { compare, genSalt, hash  } from "bcryptjs";

/** Provides hashing services. */
export interface HashService {
  /** Create a hash based on value. */
  hash(value: string): Promise<string>;

  /** Compare value with a previously hashed value. */
  compare(value: string, hashed: string): Promise<boolean>;

  /** Returns whether value was probably hash by this service before. */
  supports(value: string): Promise<boolean>;
}

export interface BcryptHashServiceOptions {
  /** Number of rounds to use for bcrypt salt, defaults to 12 if omitted */
  saltRounds?: number;
}

/**
 * HashService implementation that uses bcrypt.
 * Ideal for passwords.
 */
export class BcryptHashService implements HashService {

  private readonly saltRounds: number;

  public constructor({ saltRounds }: BcryptHashServiceOptions = {}) {
    this.saltRounds = saltRounds || 12;
  }

  public async hash(value: string): Promise<string> {
    return hash(value, await genSalt(this.saltRounds));
  }

  public async compare(value: string, hashed: string): Promise<boolean> {
    return compare(value, hashed);
  }

  public async supports(value: string): Promise<boolean> {
    if (typeof value !== "string") {
      return false;
    }

    return /^\$\d.\$.{56}$/.test(value);
  }

}
