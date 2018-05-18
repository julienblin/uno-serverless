import { expect } from "chai";
import { describe, it } from "mocha";
import { createConfidentialityReplacer, DEFAULT_CONFIDENTIALITY_REPLACEBY } from "../src/utils";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion
// tslint:disable:no-unsafe-any

describe("createConfidentialityReplacer", () => {

  it("should replace property values", async () => {
    const obj = {
      a: "a",
      password: "thepassword",
    };

    const result = JSON.parse(JSON.stringify(obj, createConfidentialityReplacer()));

    expect(result.a).equal(obj.a);
    expect(result.password).equal(DEFAULT_CONFIDENTIALITY_REPLACEBY);
  });

});
