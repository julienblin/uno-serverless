import { expect } from "chai";
import { describe, it } from "mocha";
import {
  convertHrtimeToMs, createConfidentialityReplacer,
  DEFAULT_CONFIDENTIALITY_REPLACE_BY, duration, lazyAsync,
  memoize, randomStr, safeJSONStringify, toRecord } from "../../../src/core/utils";

describe("convertHrtimeToMs", () => {

  it("should convert hrtime to ms", async () => {
    const start = process.hrtime();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = convertHrtimeToMs(process.hrtime(start));

    expect(result).to.be.greaterThan(0);
    expect(result % 1).to.equal(0);
  });

});

describe("createConfidentialityReplacer", () => {

  it("should replace property values", async () => {
    const obj = {
      _internal: "internal",
      a: "a",
      password: "password",
    };

    const result = JSON.parse(JSON.stringify(obj, createConfidentialityReplacer()));

    expect(result._internal).equal(DEFAULT_CONFIDENTIALITY_REPLACE_BY);
    expect(result.a).equal(obj.a);
    expect(result.password).equal(DEFAULT_CONFIDENTIALITY_REPLACE_BY);
  });

});

describe("safeJSONStringify", () => {

  it("should stringify", async () => {
    const obj = {
      a: "a",
    };

    const result = JSON.parse(safeJSONStringify(obj));

    expect(result.a).equal(obj.a);
  });

  it("break circular dependencies", async () => {
    const objA: any = {
      a: "a",
    };

    const objB = {
      a: objA,
      b: "b",
    };

    objA.b = objB;

    const result = JSON.parse(safeJSONStringify(objA));

    expect(result.a).equal(objA.a);
  });

});

describe("memoize", () => {

  it("should memoize calls", async () => {
    let invocationCount = 0;

    const memoizedFunc = memoize(() => {
      invocationCount++;

      return "foo";
    });

    let result = memoizedFunc();
    expect(result).to.equal("foo");
    expect(invocationCount).to.equal(1);

    result = memoizedFunc();
    expect(result).to.equal("foo");
    expect(invocationCount).to.equal(1);
  });

});

describe("randomStr", () => {

  it("should generate random strings", () => {
    const value1 = randomStr();
    const value2 = randomStr();
    expect(value1).to.not.equal(value2);

    expect(randomStr(1)).to.have.lengthOf(1);
    expect(randomStr(16)).to.have.lengthOf(16);
  });

});

describe("lazyAsync", () => {

  it("should initialize once", async () => {
    let executed = 0;
    const test = lazyAsync(async () => {
      ++executed;

      return new Object();
    });

    const result = await test();
    const result2 = await test();
    expect(result).to.equal(result2);
    expect(executed).to.equal(1);
  });

});

describe("duration", () => {

  it("should parse duration", () => {
    expect(duration(undefined)).to.equal(undefined);
    expect(duration("")).to.equal(undefined);
    expect(duration("1d")).to.equal(86400000);
  });

  it("should parse duration async", async () => {
    expect(await duration(Promise.resolve(undefined))).to.equal(undefined);
    expect(await duration(Promise.resolve(""))).to.equal(undefined);
    expect(await duration(Promise.resolve("1d"))).to.equal(86400000);
  });

});

describe("toRecord", () => {

  it("should convert with defautls", async () => {
    const test = [
      {
        id: randomStr(),
        name: randomStr(),
      },
      {
        id: randomStr(),
        name: randomStr(),
      },
    ];

    const result = toRecord(test);
    expect(result[test[0].id]).to.deep.equal(test[0]);
    expect(result[test[1].id]).to.deep.equal(test[1]);
  });

  it("should convert with valueFunc", async () => {
    const test = [
      {
        id: randomStr(),
        name: randomStr(),
      },
      {
        id: randomStr(),
        name: randomStr(),
      },
    ];

    const result = toRecord(test, (x) => ({ name: x.name }));
    expect(result[test[0].id]).to.deep.equal({ name: test[0].name });
    expect(result[test[1].id]).to.deep.equal({ name: test[1].name });
  });

  it("should convert with idFunc", async () => {
    const test = [
      {
        id: randomStr(),
        name: randomStr(),
      },
      {
        id: randomStr(),
        name: randomStr(),
      },
    ];

    const result = toRecord(test, (x) => x.id, (x) => x.name);
    expect(result[test[0].name]).to.equal(test[0].id);
    expect(result[test[1].name]).to.equal(test[1].id);
  });

});
