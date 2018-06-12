import * as jwt from "jsonwebtoken";
import { SigningKeyService } from "./signing-key-service";

/**
 * Defines a component that takes a token, verify its validity
 * and returns the associated identity information.
 */
export interface TokenService {
  verify<T>(bearerToken: string): Promise<T>;
}

/**
 * TokenService implementation that takes in JSON Web Token
 * and uses a KeyProvider to get the secret or key to decode
 * and verify the token.
 */
export class JWTTokenService implements TokenService {

  public constructor(private readonly keyService: SigningKeyService) {}

  public async verify<T>(bearerToken: string): Promise<T> {
    const decodedToken = jwt.decode(bearerToken, { complete: true }) as any;
    if (! (decodedToken && decodedToken.header && decodedToken.header.kid)) {
      throw new Error("The token appears to be incomplete. Missing header/kid.");
    }

    const publicKey = await this.keyService.getSecretOrPublicKey(decodedToken.header.kid as string);

    return jwt.verify(bearerToken, publicKey) as any as T;
  }
}
