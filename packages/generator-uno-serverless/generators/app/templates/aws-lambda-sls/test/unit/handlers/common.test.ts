import { createContainer } from "@common";
import { expect } from "chai";

describe("container", () => {

  it("should instantiate container", async () => {
    const container = createContainer();

    expect(container.configService()).to.not.be.undefined;
  });

});
