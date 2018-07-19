import { expect } from "chai";
import { randomStr } from "../../../src/core/utils";
import { BcryptHashService } from "../../../src/services/hash-service";

describe("BcryptHashService", () => {

  it("should hash and compare passwords.", async () => {
    const hashService = new BcryptHashService();
    const password = randomStr(24);
    const hash = await hashService.hash(password);
    expect(await hashService.compare(password, hash)).to.be.true;
    expect(await hashService.compare(password, hash + randomStr())).to.be.false;
    expect(await hashService.compare(randomStr(), hash)).to.be.false;
  });

  it("should examine support", async () => {
    const hashService = new BcryptHashService();
    const password = randomStr(24);
    const hash = await hashService.hash(password);

    expect(await hashService.supports(hash)).to.be.true;
    expect(await hashService.supports(randomStr())).to.be.false;
  });

});
