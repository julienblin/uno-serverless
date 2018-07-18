import { expect } from "chai";
import { randomStr } from "../../../src/core/utils";
import { DefaultCryptoService } from "../../../src/services/crypto-service";

describe("DefaultCryptoService", () => {

  it("should hash and compare passwords.", async () => {
    const cryptoService = new DefaultCryptoService();
    const password = randomStr(24);
    const hash = await cryptoService.hashPassword(password);
    expect(await cryptoService.comparePassword(password, hash)).to.be.true;
    expect(await cryptoService.comparePassword(password, hash + randomStr())).to.be.false;
    expect(await cryptoService.comparePassword(randomStr(), hash)).to.be.false;
  });

  it("should encrypt/decrypt", async () => {
    const value = randomStr(64);
    const key = randomStr();
    const cryptoService = new DefaultCryptoService({
      key,
    });
    const encrypted = await cryptoService.encrypt(value);
    expect(await cryptoService.decrypt(encrypted)).to.equal(value);
  });

});
