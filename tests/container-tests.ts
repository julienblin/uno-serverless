import { expect } from "chai";
import { describe, it } from "mocha";
import { configureContainer, Lifetime } from "../src/container";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion
// tslint:disable:no-empty-interface
// tslint:disable:max-classes-per-file

describe("configureContainer", () => {

  interface IA {}

  class A implements IA {}

  interface IB {}

  class B implements IB {}

  class C {
    public constructor(public readonly arg: any) {}
  }

  it("should register singleton services", async () => {

    const createContainer = configureContainer<{
      a: IA;
      b: IB;
    }>({
      a: () => new A(),
      b: () => new B(),
    });

    const container = createContainer();

    expect(container.a()).to.be.instanceOf(A);
    expect(container.b()).to.be.instanceOf(B);
    expect(container.a()).to.equal(container.a());
  });

  it("singleton lifetime should be bound to the container.", async () => {

    const createContainer = configureContainer<{
      a: IA;
    }>({
      a: () => new A(),
    });

    const container1 = createContainer();
    const a1 = container1.a();
    const a2 = container1.a();

    const container2 = createContainer();
    const a3 = container2.a();

    expect(a1).to.equal(a2);
    expect(a2).to.not.equal(a3);
  });

  it("should register singleton and transient services", async () => {

    const createContainer = configureContainer<{
      a: IA;
      b: IB;
    }>({
      a: () => new A(),
      b: { build: () => new B(), lifetime: Lifetime.Transient },
    });

    const container = createContainer();

    expect(container.a()).to.be.instanceOf(A);
    expect(container.b()).to.be.instanceOf(B);
    expect(container.a()).to.equal(container.a());
    expect(container.b()).to.not.equal(container.b());
  });

  it("should pass options", async () => {
    const createContainer = configureContainer<{
      a: IA;
      b: IB;
      c: C;
      c2: C;
    }, {
      foo: string;
    }>({
      a: () => new A(),
      b: { build: () => new B(), lifetime: Lifetime.Transient },
      c: ({ options }) => new C(options!.foo),
      c2: { build: ({ options }) => new C(options!.foo), lifetime: Lifetime.Transient },
    });

    const container = createContainer({ foo: "bar" });

    expect(container.c()).to.be.instanceOf(C);
    expect(container.c().arg).to.be.equal("bar");
  });

  it("should pass container", async () => {
    const createContainer = configureContainer<{
      a: IA;
      c: C;
      c2: C;
    }>({
      a: () => new A(),
      c: (arg) => new C(arg.container.a()),
      c2: { build: (arg) => new C(arg.container.c()), lifetime: Lifetime.Transient },
    });

    const container = createContainer();

    expect(container.a()).to.be.instanceOf(A);
    expect(container.c()).to.be.instanceOf(C);
    expect(container.c2()).to.be.instanceOf(C);

    expect(container.c().arg).to.be.equal(container.a());
    expect(container.c2().arg).to.be.equal(container.c());
  });

});
