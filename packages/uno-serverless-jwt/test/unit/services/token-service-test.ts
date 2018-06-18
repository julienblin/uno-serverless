import { expect } from "chai";
import { randomStr } from "uno-serverless";
import { RSSigningKeyService, SigningKeyService } from "../../../src/services/signing-key-service";
import {
  JWTTokenService, JWTTokenServiceOptions,
  TokenClaims, TokenService } from "../../../src/services/token-service";

describe("JWTTokenService", () => {

  let options: JWTTokenServiceOptions;
  let keyService: SigningKeyService;
  let service: TokenService;

  before(() => {
    options = {
      audience: randomStr(),
      expiration: "1h",
      issuer: randomStr(),
    };
    keyService = new RSSigningKeyService({
      privateKey: RSSigningKeyService.generatePrivateKey(),
    });
    service = new JWTTokenService(options, keyService);
  });

  it ("should sign tokens", async () => {
    const token = {
      claim1: randomStr(),
      sub: randomStr(),
    };

    const result = await service.sign(token);
    const splitResult = result.split(".");
    expect(splitResult.length).to.equal(3);
  });

  it ("should verify tokens", async () => {
    const payload = {
      claim1: randomStr(),
      sub: randomStr(),
    };

    const token = await service.sign(payload);

    const result = await service.verify<typeof payload & TokenClaims>(token);
    expect(result.claim1).to.equal(payload.claim1);
    expect(result.sub).to.equal(payload.sub);

    expect(result.exp).to.be.greaterThan(new Date().getTime() / 1000);
    expect(result.iat).to.be.lessThan(new Date().getTime() / 1000);
    expect(result.aud).to.equal(options.audience);
    expect(result.iss).to.equal(options.issuer);
  });

  it ("should decode tokens", async () => {
    const payload = {
      claim1: randomStr(),
      sub: randomStr(),
    };

    const token = await service.sign(payload);

    const result = await service.decode<typeof payload & TokenClaims>(token);
    expect(result!.claim1).to.equal(payload.claim1);
    expect(result!.sub).to.equal(payload.sub);

    expect(result!.exp).to.be.greaterThan(new Date().getTime() / 1000);
    expect(result!.iat).to.be.lessThan(new Date().getTime() / 1000);
    expect(result!.aud).to.equal(options.audience);
    expect(result!.iss).to.equal(options.issuer);
  });

  it ("should not verify altered tokens", async () => {
    const payload = {
      claim1: randomStr(),
      sub: randomStr(),
    };

    const token = (await service.sign(payload)).split(".");
    const signedPayload = JSON.parse(Buffer.from(token[1], "base64").toString());
    signedPayload.sub = randomStr();
    const alteredToken = `${token[0]}.${Buffer.from(JSON.stringify(signedPayload)).toString("base64")}.${token[2]}`;

    try {
      await service.verify<typeof payload & TokenClaims>(alteredToken);
      expect(false);
    } catch (error) {
      expect(error.message).to.contain("invalid token");
    }
  });

});
