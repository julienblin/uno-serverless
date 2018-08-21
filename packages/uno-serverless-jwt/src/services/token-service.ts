import { decode, sign, verify } from "jsonwebtoken";
import { duration, unauthorizedError } from "uno-serverless";
import { SigningKeyService } from "./signing-key-service";

/**
 * Complementary claims added by the signing process.
 */
export interface TokenClaims {
  aud?: string;
  exp?: number;
  iat?: number;
  iss?: string;
}

export interface SignResult {
  /** The signed token. */
  token: string;
  /** The number of seconds before expiration of the token. */
  expiresIn: number;
}

/**
 * Defines a component that takes a token, verify its validity
 * and returns the associated identity information.
 */
export interface TokenService {
  decode<T extends object>(token: string): Promise<T | undefined>;
  sign<T extends object>(payload: T): Promise<SignResult>;
  verify<T extends object>(token: string): Promise<T>;
}

export interface JWTTokenServiceOptions {
  audience?: string | Promise<string>;
  issuer?: string | Promise<string>;
  /**
   * The token expiration in milliseconds or using ms format/duration function.
   * Defaults to 1h.
   */
  expiration?: string | number | Promise<string | number>;
}

/**
 * TokenService implementation that verify & sign JSON Web Token
 * using a SigningKeyService.
 */
export class JWTTokenService implements TokenService {

  public constructor(
    private readonly options: JWTTokenServiceOptions,
    private readonly keyService: SigningKeyService) {}

  public async decode<T extends object>(token: string): Promise<T | undefined> {
    const decoded = decode(token, { complete: true }) as any;
    return decoded
      ? decoded.payload as T
      : undefined;
  }

  public async sign<T extends object>(payload: T): Promise<SignResult> {
    const finalPayload = {
      aud: await this.options.audience,
      iss: await this.options.issuer,
      ... payload as object,
    };

    const privateKey = await this.keyService.getSecretOrPrivateKey();
    const expiration = await this.options.expiration || "1h";
    const token = sign(
      finalPayload,
      privateKey.key,
      {
        algorithm: privateKey.alg,
        expiresIn: expiration,
        keyid: privateKey.kid,
      });

    return {
      expiresIn: (typeof expiration === "number" ? expiration : duration(expiration)) / 1000,
      token,
    };
  }

  public async verify<T>(token: string): Promise<T> {
    const decodedToken = decode(token, { complete: true }) as any;
    const keyId = decodedToken && decodedToken.header && decodedToken.header.kid
      ? decodedToken.header.kid
      : undefined;

    const publicKey = await this.keyService.getSecretOrPublicKey(keyId);

    try {
      return verify(token, publicKey) as any;
    } catch (error) {
      throw unauthorizedError("token", error.message);
    }
  }
}
