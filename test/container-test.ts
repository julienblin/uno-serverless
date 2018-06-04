import { expect } from "chai";
import { describe, it } from "mocha";
import { createContainerFactory, Lifetime } from "../src/container";

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

describe("createContainerFactory", () => {

  it("should register singleton services", () => {

    interface Contract {
      a(): IA;
      b(): IB;
    }

    const createContainer = createContainerFactory<Contract>({
      a: () => new A(),
      b: () => new B(),
    });

    const container = createContainer();

    expect(container.a()).to.be.instanceOf(A);
    expect(container.b()).to.be.instanceOf(B);
    expect(container.a()).to.equal(container.a());
  });

  it("singleton lifetime should be bound to the container.", () => {

    interface Contract {
      a(): IA;
    }

    const createContainer = createContainerFactory<Contract>({
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

  it("should register singleton and transient services", () => {

    interface Contract {
      a(): IA;
      b(): IB;
    }

    const createContainer = createContainerFactory<Contract>({
      a: () => new A(),
      b: ({ builder }) => builder.transient(new B()),
    });

    const container = createContainer();

    expect(container.a()).to.be.instanceOf(A);
    expect(container.b()).to.be.instanceOf(B);
    expect(container.a()).to.equal(container.a());
    expect(container.b()).to.not.equal(container.b());
  });

  it("should pass options", () => {

    interface Contract {
      c(): C;
      c2(): C;
    }

    interface Options {
      foo: string;
    }

    const createContainer = createContainerFactory<Contract, Options>({
      c: ({ options }) => new C(options.foo),
      c2: ({ builder, options }) => builder.transient(new C(options.foo)),
    });

    const container = createContainer({ foo: "bar" });

    expect(container.c()).to.be.instanceOf(C);
    expect(container.c().arg).to.be.equal("bar");
    expect(container.c2().arg).to.be.equal("bar");
  });

  it("should pass container", () => {
    interface Contract {
      a(): IA;
      c(): C;
      c2(): C;
    }

    const createContainer = createContainerFactory<Contract>({
      a: () => new A(),
      c: ({ container }) => new C(container.a()),
      c2: ({ builder, container }) => builder.transient(new C(container.c())),
    });

    const result = createContainer();

    expect(result.a()).to.be.instanceOf(A);
    expect(result.c()).to.be.instanceOf(C);
    expect(result.c2()).to.be.instanceOf(C);

    expect(result.c().arg).to.be.equal(result.a());
    expect(result.c2().arg).to.be.equal(result.c());
  });

  it("scoped component should not resolve in the root container", () => {
    interface Contract {
      a(): IA;
      b(): IB;
    }

    const createContainer = createContainerFactory<Contract>({
      a: () => new A(),
      b: ({ builder }) => builder.scoped(() => new B()),
    });

    const container = createContainer();

    expect(container.a()).to.be.instanceOf(A);
    expect(() => container.b()).to.throw;
  });

  it("should create scope and manage lifetime", () => {

    interface Contract {
      a(): IA;
      b(): IB;
      c(): C;
    }

    const createContainer = createContainerFactory<Contract>({
      a: () => new A(),
      b: ({ builder }) => builder.scoped(new B()),
      c: ({ builder, container }) => builder.transient(new C(container)),
    });

    const rootContainer = createContainer();
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

});
