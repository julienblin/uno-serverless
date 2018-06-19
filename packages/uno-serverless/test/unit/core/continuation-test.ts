import { expect } from "chai";
import { decodeNextToken, encodeNextToken } from "../../../src/core/continuation";
import { randomStr } from "../../../src/core/utils";

describe("Continuation", () => {

  it("should encode/decode", () => {
    const tokenParameters = {
      bar: randomStr(),
      foo: randomStr(),
    };

    const nextToken = encodeNextToken(tokenParameters);
    const decodedParameters = decodeNextToken<typeof tokenParameters>(nextToken);

    expect(decodedParameters).to.deep.equal(tokenParameters);
  });

});
