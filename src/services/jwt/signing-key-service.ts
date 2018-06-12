import { jwk2pem } from "pem-jwk";
import { HttpClient } from "../http-client";

/**
 * A component that can manages signing keys for tokens.
 */
export interface SigningKeyService {
  getSecretOrPublicKey(keyId?: string): Promise<string>;
}

/**
 * Options for JWKSigningKeyService
 */
export interface JWKSigningKeyServiceOptions {
  /** The url to the JWK endpoint to retrieve the keys. */
  jwkUrl: string | Promise<string>;
}

export class JWKSigningKeyService implements SigningKeyService {

  private readonly cachedKeys: Record<string, string> = {};
  private jwkPromise: Promise<JWKResponse> | undefined;

  public constructor(
    private readonly options: JWKSigningKeyServiceOptions,
    private readonly httpClient: HttpClient) { }

  public async getSecretOrPublicKey(keyId?: string | undefined): Promise<string> {
    if (!keyId) {
      throw new Error(
        `JWKSigningKeyService: unable to get the key for unknown keyId. The token is probably missing the kid header.`);
    }

    if (this.cachedKeys[keyId]) {
      return this.cachedKeys[keyId];
    }

    if (!this.jwkPromise) {
      this.jwkPromise = this.getJWK();
    }

    try {
      const jwks = await this.jwkPromise;

      jwks.keys.forEach((key) => {
        this.cachedKeys[key.kid] = jwk2pem(key);
      });

      if (this.cachedKeys[keyId]) {
        return this.cachedKeys[keyId];
      }
    } finally {
      this.jwkPromise = undefined;
    }

    throw new Error(`JWKSigningKeyService: Unable to find key with id ${keyId}.`);
  }

  private async getJWK(): Promise<JWKResponse> {
    const response = await this.httpClient.get<JWKResponse>(await this.options.jwkUrl);

    return response.data;
  }
}

interface JWKResponse {
  keys: Array<{
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
  }>;
}
