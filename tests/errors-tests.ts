import { expect } from "chai";
import { describe, it } from "mocha";
import { dependency, dependencyErrorProxy, internalServerError } from "../src/errors";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion
// tslint:disable:max-classes-per-file

describe("dependencyErrorProxy", () => {

  const RESULT = 42;

  class TestTarget {

    public promiseInvoked = false;
    public standardInvoked = false;

    public managedError = () => {
      throw internalServerError("This is a managed error");
    }

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
    const proxy = dependencyErrorProxy(target, TestTarget.name);

    const result = proxy.standardFunc();

    expect(result).to.equal(RESULT);
    expect(proxy.standardInvoked).to.be.true;
  });

  it("should keep field access", () => {
    const target = new TestTarget();
    const proxy = dependencyErrorProxy(target, TestTarget.name);
    expect(proxy.standardInvoked).to.be.false;
  });

  it("should encapsulate no-promise calls errors", () => {
    const target = new TestTarget();
    const proxy = dependencyErrorProxy(target, TestTarget.name);

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
    const proxy = dependencyErrorProxy(target, TestTarget.name);

    const result = await proxy.promiseFunc();

    expect(result).to.equal(RESULT);
    expect(proxy.promiseInvoked).to.be.true;
  });

  it("should encapsulate promise calls errors", async () => {
    const target = new TestTarget();
    const proxy = dependencyErrorProxy(target, TestTarget.name);

    try {
      await proxy.promiseFunc(true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("dependencyError");
      expect(error.target).to.equal("TestTarget");
    }
  });

  it("should not encapsulate managed errors", async () => {
    const target = new TestTarget();
    const proxy = dependencyErrorProxy(target, TestTarget.name);

    try {
      proxy.managedError();
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("internalServerError");
    }
  });

});

describe("@dependency", () => {

  @dependency
  class TestDecoratorProxy {
    public constructor(private readonly arg: string) {}

    public getArg(thro?: boolean) {
      if (thro) {
        throw new Error(this.arg);
      }

      return this.arg;
    }

  }

  it("should wrap target in dependencyErrorProxy", () => {
    const arg = "foo";
    const target = new TestDecoratorProxy(arg);
    expect(target.getArg()).to.equal(arg);

    try {
      target.getArg(true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("dependencyError");
      expect(error.target).to.equal("TestDecoratorProxy");
    }
  });

});