import { expect } from "chai";
import { describe, it } from "mocha";
import { configureContainer, inject, Lifetime } from "../src/container";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion
// tslint:disable:no-empty-interface
// tslint:disable:max-classes-per-file

interface IA {}

class A implements IA {}

interface IB {}

class B implements IB {}

class C {
  public constructor(public readonly arg: any) {}
}

describe("configureContainer", () => {

  it("should register singleton services", () => {

    const createContainer = configureContainer({
      a: () => new A() as IA,
      b: () => new B() as IB,
    });

    const container = createContainer({});

    expect(container.a()).to.be.instanceOf(A);
    expect(container.b()).to.be.instanceOf(B);
    expect(container.a()).to.equal(container.a());
  });

  it("singleton lifetime should be bound to the container.", () => {

    const createContainer = configureContainer({
      a: () => new A(),
    });

    const container1 = createContainer({});
    const a1 = container1.a();
    const a2 = container1.a();

    const container2 = createContainer({});
    const a3 = container2.a();

    expect(a1).to.equal(a2);
    expect(a2).to.not.equal(a3);
  });

  it("should register singleton and transient services", () => {

    const createContainer = configureContainer({
      a: () => new A(),
      b: { build: () => new B(), lifetime: Lifetime.Transient },
    });

    const container = createContainer({});

    expect(container.a()).to.be.instanceOf(A);
    expect(container.b()).to.be.instanceOf(B);
    expect(container.a()).to.equal(container.a());
    expect(container.b()).to.not.equal(container.b());
  });

  it("should pass options", () => {
    const createContainer = configureContainer({
      a: () => new A(),
      b: { build: () => new B(), lifetime: Lifetime.Transient },
      c: ({ options }) => new C(options.foo),
      c2: { build: ({ options }) => new C(options!.foo), lifetime: Lifetime.Transient },
    });

    const container = createContainer({ foo: "bar" });

    expect(container.c()).to.be.instanceOf(C);
    expect(container.c().arg).to.be.equal("bar");
  });

  it("should pass container", () => {
    const createContainer = configureContainer({
      a: () => new A(),
      c: (arg) => new C(arg.container.a()),
      c2: { build: (arg) => new C(arg.container.c()), lifetime: Lifetime.Transient },
    });

    const container = createContainer({});

    expect(container.a()).to.be.instanceOf(A);
    expect(container.c()).to.be.instanceOf(C);
    expect(container.c2()).to.be.instanceOf(C);

    expect(container.c().arg).to.be.equal(container.a());
    expect(container.c2().arg).to.be.equal(container.c());
  });

  it("scoped component should not resolve in the root container", () => {
    const createContainer = configureContainer({
      a: () => new A(),
      b: { build: () => new B(), lifetime: Lifetime.Scoped },
    });

    const container = createContainer({});

    expect(container.a()).to.be.instanceOf(A);
    expect(() => container.b()).to.throw;
  });

  it("should create scope and manage lifetime", () => {
    const createContainer = configureContainer({
      a: () => new A(),
      b: { build: () => new B(), lifetime: Lifetime.Scoped },
      c: { build: ({ container }) => new C(container), lifetime: Lifetime.Transient },
    });

    const rootContainer = createContainer({});
    const scopedContainer1 = rootContainer.scope();
    const scopedContainer2 = rootContainer.scope();

    expect(scopedContainer1.a()).to.equal(rootContainer.a());
    expect(scopedContainer2.a()).to.equal(rootContainer.a());

    expect(scopedContainer1.b()).to.equal(scopedContainer1.b());
    expect(scopedContainer2.b()).to.equal(scopedContainer2.b());
    expect(scopedContainer1.b()).to.not.equal(scopedContainer2.b());

    expect(rootContainer.c()).to.not.equal(rootContainer.c());
    expect(scopedContainer1.c()).to.not.equal(scopedContainer1.c());
    expect(scopedContainer2.c()).to.not.equal(scopedContainer2.c());

    expect(rootContainer.c().arg).to.equal(rootContainer);
    expect(scopedContainer1.c().arg).to.equal(scopedContainer1);
    expect(scopedContainer2.c().arg).to.equal(scopedContainer2);
  });

  it("should create scope when no scope components", () => {
    const createContainer = configureContainer({
      a: () => new A(),
      c: { build: ({ container }) => new C(container), lifetime: Lifetime.Transient },
    });

    const rootContainer = createContainer({});
    const scopedContainer1 = rootContainer.scope();
    const scopedContainer2 = rootContainer.scope();

    expect(scopedContainer1.a()).to.equal(rootContainer.a());
    expect(scopedContainer2.a()).to.equal(rootContainer.a());

    expect(rootContainer.c()).to.not.equal(rootContainer.c());
    expect(scopedContainer1.c()).to.not.equal(scopedContainer1.c());
    expect(scopedContainer2.c()).to.not.equal(scopedContainer2.c());

    expect(rootContainer.c().arg).to.equal(rootContainer);
    expect(scopedContainer1.c().arg).to.equal(scopedContainer1);
    expect(scopedContainer2.c().arg).to.equal(scopedContainer2);
  });

});

describe("inject", () => {

  it("should manage and inject the container", () => {
    interface Spec {
      a: IA;
      b: IB;
    }

    const createContainer = configureContainer({
      a: () => new A(),
      b: { build: () => new B(), lifetime: Lifetime.Scoped },
    });

    const injectedFunc = inject(
      (args, { a, b }) => ({ a: a(), b: b(), b2: b() }),
      () => createContainer({}));

    const execution1 = injectedFunc({});
    const execution2 = injectedFunc({});

    expect(execution1.a).to.equal(execution2.a);
    expect(execution1.b).to.equal(execution1.b2);
    expect(execution1.b).to.not.equal(execution2.b);
  });

});
