import { execSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, unlinkSync } from "fs";
import { getPublicKey } from "pem";
import { jwk2pem, pem2jwk } from "pem-jwk";
import { HttpClient, randomStr } from "uno-serverless";

/**
 * A component that can manages signing keys for tokens.
 */
export interface SigningKeyService {
  getSecretOrPrivateKey(): Promise<PrivateKeyInfo>;
  getSecretOrPublicKey(keyId?: string): Promise<string>;
  getJWK(): Promise<JWK>;
}

/**
 * Options for JWKSigningKeyService
 */
export interface JWKSigningKeyServiceOptions {
  /** The url to the JWK endpoint to retrieve the keys. */
  jwkUrl: string | Promise<string>;
}

/**
 * SigningKeyService that can retrieve public keys
 * from a JWK endpoint, to validate signatures.
 */
export class JWKSigningKeyService implements SigningKeyService {

  private readonly cachedKeys: Record<string, string> = {};
  private jwkPromise: Promise<JWK> | undefined;

  public constructor(
    private readonly options: JWKSigningKeyServiceOptions,
    private readonly httpClient: HttpClient) { }

  public async getSecretOrPrivateKey(): Promise<PrivateKeyInfo> {
    throw new Error("JWKSigningKeyService does not support getting private key.");
  }

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

  public async getJWK(): Promise<JWK> {
    const response = await this.httpClient.get<JWK>(await this.options.jwkUrl);

    return response.data;
  }
}

/**
 * Options for SelfContainedSigningKeyService.
 */
export interface RSSigningKeyServiceOptions {
  /**
   * The private key algorithm to use. Defaults to RS256.
   */
  alg?: string | Promise<string>;
  /**
   * Base64-encoded PEM private key.
   */
  privateKey: string | Promise<string>;
  /**
   * Base64-encoded PEM public key.
   */
  publicKey?: string | Promise<string>;
}

/**
 * SigningKeyService implementation that manages RS keys.
 */
export class RSSigningKeyService implements SigningKeyService {

  /**
   * Generates a new private key.
   * Needs access to file system and uses ssh-keygen (openssl) utility.
   */
  public static async generatePrivateKey(keySize = 2048): Promise<string> {
    const keyId = randomStr();
    execSync(`ssh-keygen -t rsa -b ${keySize} -f ${keyId}.key -N ""`);
    try {
      return new Buffer(readFileSync(`${keyId}.key`, "utf8")).toString("base64");
    } finally {
      unlinkSync(`${keyId}.key`);
      unlinkSync(`${keyId}.key.pub`);
    }
  }

  public static async getPublicKeyFromPrivateKey(privateKey: string, privateKeyPem = true) {
    return new Promise<string>((resolve, reject) => {
      getPublicKey(
        privateKeyPem
          ? new Buffer(privateKey, "base64").toString("utf8")
          : privateKey,
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(new Buffer(res.publicKey, "utf8").toString("base64"));
          }
      });
    });
  }

  private privateKey: PrivateKeyInfo | undefined;
  private jwk: JWK | undefined;
  private publicKey: string | undefined;

  public constructor(private readonly options: RSSigningKeyServiceOptions) { }

  public async getSecretOrPrivateKey(): Promise<PrivateKeyInfo> {
    if (!this.privateKey) {
      const privateKeyPem = new Buffer(await this.options.privateKey, "base64").toString("utf8");
      this.privateKey = {
        alg: await this.options.alg || "RS256",
        key: privateKeyPem,
        kid: createHash("md5").update(privateKeyPem).digest("hex"),
      };
    }

    return this.privateKey;
  }

  public async getSecretOrPublicKey(keyId?: string): Promise<string> {
    if (!this.publicKey) {
      if (this.options.publicKey) {
        this.publicKey = new Buffer(await this.options.publicKey, "base64").toString("utf8");
      } else {
        const privateKey = await this.getSecretOrPrivateKey();
        this.publicKey = new Buffer(
          await RSSigningKeyService.getPublicKeyFromPrivateKey(privateKey.key, false),
          "base64").toString("utf8");
      }
    }
    return this.publicKey;
  }

  public async getJWK(): Promise<JWK> {
    if (!this.jwk) {
      const privateKey = await this.getSecretOrPrivateKey();
      const publicKey = await this.getSecretOrPublicKey();

      this.jwk = {
        keys: [
          {
            ... pem2jwk(publicKey),
            kid: privateKey.kid,
            use: "sig",
          },
        ],
      };
    }

    return this.jwk;
  }
}

export interface PrivateKeyInfo {
  /** The signature algorithm */
  alg: string;

  /** The key id. */
  kid: string;

  /** The private key in PEM format. */
  key: string;
}

export interface JWK {
  keys: Array<{
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
  }>;
}
