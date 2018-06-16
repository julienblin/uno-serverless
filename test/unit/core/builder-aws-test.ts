import { expect } from "chai";
import { describe, it } from "mocha";
import { uno } from "../../../src/core/builder";
import { UnoEvent } from "../../../src/core/schemas";
import { awsLambdaAdapter } from "../../../src/providers/aws";
import { createLambdaContext } from "../lambda-helper-test";

describe("builder AWS", () => {

  it("should run a simple handler.", async () => {

    const handler = uno(awsLambdaAdapter())
      .handler(async () => {});

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result).to.be.undefined;
  });

  it("should return the handler value.", async () => {

    const handler = uno(awsLambdaAdapter())
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

    const handler = uno(awsLambdaAdapter())
      .use([
        async (arg, next) => {
          order.push(1);
          expect(arg.event.original.foo).to.equal("bar");
          arg.event = {
            ...arg.event,
            original: alteredInput,
          } as UnoEvent;
          const response = await next(arg);
          order.push(5);
          return response;
        },
        async (arg, next) => {
          order.push(2);
          expect(arg.event.original.bar).to.equal("foo");
          const response = await next(arg);
          order.push(4);
          expect(response).to.equal("hello");
          return "world";
        }])
      .handler(async () => {
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
