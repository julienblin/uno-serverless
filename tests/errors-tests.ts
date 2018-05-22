import { expect } from "chai";
import { describe, it } from "mocha";
import { dependencyErrorProxy } from "../src/errors";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion

describe("dependencyErrorProxy", () => {

  const RESULT = 42;

  class TestTarget {

    public promiseInvoked = false;
    public standardInvoked = false;

    public async promiseFunc(thro?: boolean, timeout = 10) {
      return new Promise((resolve, reject) => {
        setTimeout(
          () => {
            this.promiseInvoked = true;

            if (thro) {
              reject(new Error("promiseFunc"));
            }

            resolve(RESULT);
          },
          timeout);
      });
    }

    public standardFunc(thro?: boolean) {
      this.standardInvoked = true;

      if (thro) {
        throw new Error("standardFunc");
      }

      return RESULT;
    }

  }

  it("should forward no-promise calls", () => {
    const target = new TestTarget();
    const proxy = dependencyErrorProxy(target, "TestTarget");

    const result = proxy.standardFunc();

    expect(result).to.equal(RESULT);
    expect(proxy.standardInvoked).to.be.true;
  });

  it("should keep field access", () => {
    const target = new TestTarget();
    const proxy = dependencyErrorProxy(target, "TestTarget");
    expect(proxy.standardInvoked).to.be.false;
  });

  it("should encapsulate no-promise calls errors", () => {
    const target = new TestTarget();
    const proxy = dependencyErrorProxy(target, "TestTarget");

    try {
      proxy.standardFunc(true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("dependencyError");
      expect(error.target).to.equal("TestTarget");
    }
  });

  it("should forward promise calls", async () => {
    const target = new TestTarget();
    const proxy = dependencyErrorProxy(target, "TestTarget");

    const result = await proxy.promiseFunc();

    expect(result).to.equal(RESULT);
    expect(proxy.promiseInvoked).to.be.true;
  });

  it("should encapsulate promise calls errors", async () => {
    const target = new TestTarget();
    const proxy = dependencyErrorProxy(target, "TestTarget");

    try {
      await proxy.promiseFunc(true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("dependencyError");
      expect(error.target).to.equal("TestTarget");
    }
  });

});
