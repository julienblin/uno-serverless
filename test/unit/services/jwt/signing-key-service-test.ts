import { expect } from "chai";
import { readFileSync } from "fs";
import * as nock from "nock";
import { randomStr } from "../../../../src/core";
import { httpClientFactory } from "../../../../src/services/http-client";
import { JWKSigningKeyService, SigningKeyService } from "../../../../src/services/jwt/signing-key-service";

describe("JWKSigningKeyService", () => {

  let provider: SigningKeyService;

  beforeEach(() => {
    const jwkBasePath = "https://login.microsoftonline.com";
    const jwkUrl = "/common/discovery/v2.0/keys";

    const jwkResponse = readFileSync("./test/unit/services/jwt/jwk-response.json");
    nock(jwkBasePath)
      .get(jwkUrl)
      .reply(200, jwkResponse);

    provider = new JWKSigningKeyService(
      { jwkUrl },
      httpClientFactory({ baseURL: jwkBasePath }));
  });

  it("should retrieve JWK and convert to PEM format", async () => {
    const result = await provider.getSecretOrPublicKey("TioGywwlhvdFbXZ813WpPay9AlU");
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

});
