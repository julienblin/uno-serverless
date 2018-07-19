import { expect } from "chai";
import { randomStr } from "../../../src/core/utils";
import { AES256GCMSymmetricEncryptionService } from "../../../src/services/symmetric-encryption-service";

describe("AES256GCMSymmetricEncryptionService", () => {

  it("should encrypt/decrypt", async () => {
    const value = randomStr(64);
    const masterKey = randomStr();
    const cryptoService = new AES256GCMSymmetricEncryptionService({
      masterKey,
    });
    const encrypted = await cryptoService.encrypt(value);
    expect(await cryptoService.decrypt(encrypted)).to.equal(value);

    try {
      await cryptoService.decrypt(randomStr());
      expect(false);
    } catch (error) {
      expect(error.message).to.not.be.undefined;
    }
  });

  it("should examine support", async () => {
    const value = randomStr(64);
    const masterKey = randomStr();
    const cryptoService = new AES256GCMSymmetricEncryptionService({
      masterKey,
    });

    const encrypted = await cryptoService.encrypt(value);
    expect(await cryptoService.supports(encrypted)).to.be.true;
    expect(await cryptoService.supports(randomStr())).to.be.false;
  });

});
