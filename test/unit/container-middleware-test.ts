import { lambda } from "@src/builder";
import { createContainerFactory } from "@src/container";
import { container } from "@src/container-middleware";
import { randomStr } from "@src/utils";
import { expect } from "chai";
import { describe, it } from "mocha";
import { createLambdaContext } from "./lambda-helper-test";

describe("container middleware", () => {

  it("should create and maintain a container", async () => {

    interface ContainerContract {
      a(): string;
      b(): string;
      c(): string;
    }

    const createContainer = createContainerFactory<ContainerContract>({
      a: () => randomStr(),
      b: ({ builder }) => builder.transient(randomStr()),
      c: ({ builder }) => builder.scoped(randomStr()),
    });

    const handler = lambda()
      .use(container(() => createContainer()))
      .handler<any, any, ContainerContract>(async ({ services: { a, b, c } }) => ({
        scoped1: c(),
        scoped2: c(),
        singleton: a(),
        transient1: b(),
        transient2: b(),
      }));

    const result1 = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    const result2 = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result1.singleton).to.be.equal(result2.singleton);
    expect(result1.scoped1).to.not.equal(result2.scoped1);
    expect(result1.transient1).to.not.equal(result2.transient1);

    expect(result1.scoped1).to.be.equal(result1.scoped2);
    expect(result2.scoped1).to.be.equal(result2.scoped2);
    expect(result1.transient1).to.not.equal(result1.transient2);
  });

});
