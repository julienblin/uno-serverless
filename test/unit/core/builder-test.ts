import { expect } from "chai";
import { describe, it } from "mocha";
import { lambda } from "../../../src/core/builder";
import { createLambdaContext } from "../lambda-helper-test";

describe("builder", () => {

  it("should run a simple handler.", async () => {

    const handler = lambda()
      .handler(async () => {});

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result).to.be.undefined;
  });

  it("should return the handler value.", async () => {

    const handler = lambda()
      .handler(async () => ({ foo: "bar" }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result).to.deep.equal({ foo: "bar" });
  });

  it("should run middlewares in order", async () => {
    const originalInput = { foo: "bar" };
    const alteredInput = { bar: "foo" };

    const order: number[] = [];

    const handler = lambda()
      .use([
        async (arg, next) => {
          order.push(1);
          expect(arg.event).to.deep.equal(originalInput);
          arg.event = alteredInput;
          const response = await next(arg);
          order.push(5);
          return response;
        },
        async (arg, next) => {
          order.push(2);
          expect(arg.event).to.deep.equal(alteredInput);
          const response = await next(arg);
          order.push(4);
          expect(response).to.equal("hello");
          return "world";
        }])
      .handler(async (arg) => {
        order.push(3);

        return "hello";
      });

    const result = await handler(
      originalInput,
      createLambdaContext(),
      (e, r) => {});

    expect(result).to.equal("world");
    expect(order).to.deep.equal([1, 2, 3, 4, 5]);
  });

});
