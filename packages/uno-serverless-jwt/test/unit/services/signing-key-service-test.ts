import { expect } from "chai";
import { readFileSync } from "fs";
import * as nock from "nock";
import { httpClientFactory, randomStr } from "uno-serverless";
import {
  JWKSigningKeyService, RSSigningKeyService,
  SigningKeyService } from "../../../src/services/signing-key-service";

describe("JWKSigningKeyService", () => {

  let provider: SigningKeyService;

  beforeEach(() => {
    const jwkBasePath = "https://login.microsoftonline.com";
    const jwkUrl = "/common/discovery/v2.0/keys";

    const jwkResponse = readFileSync("./test/unit/services/jwk-response.json");
    nock(jwkBasePath)
      .get(jwkUrl)
      .reply(200, jwkResponse);

    provider = new JWKSigningKeyService(
      { jwkUrl },
      httpClientFactory({ baseURL: jwkBasePath }));
  });

  it("should retrieve JWK and convert to PEM format", async () => {
    let result = await provider.getSecretOrPublicKey("TioGywwlhvdFbXZ813WpPay9AlU");
    // Let's trigger the cache
    result = await provider.getSecretOrPublicKey("TioGywwlhvdFbXZ813WpPay9AlU");
    expect(result).to.not.be.undefined;
  });

  it("should throw if keyId is not provided.", async () => {
    try {
      await provider.getSecretOrPublicKey();
      expect(false);
    } catch (error) {
      expect(error.message).to.contain("keyId");
    }
  });

  it("should throw if key cannot be found.", async () => {
    try {
      await provider.getSecretOrPublicKey(randomStr());
      expect(false);
    } catch (error) {
      expect(error.message).to.contain("find key");
    }
  });

  it("should throw if asked for private key.", async () => {
    try {
      await provider.getSecretOrPrivateKey();
      expect(false);
    } catch (error) {
      expect(error.message).to.contain("private");
    }
  });

});

describe("RSSigningKeyService", () => {

  let privateKey: string;

  before(async () => {
    privateKey = await RSSigningKeyService.generatePrivateKey();
  });

  it("should generate private keys", async () => {
    const key = await RSSigningKeyService.generatePrivateKey();
    expect(key).to.not.be.undefined;
  });

  it("should return private key", async () => {
    const service = new RSSigningKeyService({ privateKey });

    const result = await service.getSecretOrPrivateKey();
    expect(result.kid).to.not.be.undefined;
    expect(result.key).to.not.be.undefined;
  });

  it("should return public key", async () => {
    const service = new RSSigningKeyService({ privateKey });

    const result = await service.getSecretOrPublicKey();
    expect(result).to.not.be.undefined;
  });

  it("should return JWK", async () => {
    const service = new RSSigningKeyService({ privateKey });

    const result = await service.getJWK();
    expect(result.keys.length).to.be.greaterThan(0);
    const key = result.keys[0]!;
    expect(key.kid).to.not.be.undefined;
    expect(key.e).to.not.be.undefined;
    expect(key.use).to.not.be.undefined;
  });

});
