import * as microBenchmark from "micro-benchmark";
import { createContainerFactory } from "./src/container";

class A {}

interface Contract {
  scoped(): A;
  singleton(): A;
  transient(): A;
  scoped1(): A;
  singleton1(): A;
  transient1(): A;
  scoped2(): A;
  singleton2(): A;
  transient2(): A;
  scoped3(): A;
  singleton3(): A;
  transient3(): A;
  scoped4(): A;
  singleton4(): A;
  transient4(): A;
  scoped5(): A;
  singleton5(): A;
  transient5(): A;
  scoped6(): A;
  singleton6(): A;
  transient6(): A;
}

const createContainer = createContainerFactory<Contract>({
  scoped: ({ builder }) => builder.scoped(new A()),
  singleton: () => new A(),
  transient: ({ builder }) => builder.transient(new A()),
  scoped1: ({ builder }) => builder.scoped(new A()),
  singleton1: () => new A(),
  transient1: ({ builder }) => builder.transient(new A()),
  scoped2: ({ builder }) => builder.scoped(new A()),
  singleton2: () => new A(),
  transient2: ({ builder }) => builder.transient(new A()),
  scoped3: ({ builder }) => builder.scoped(new A()),
  singleton3: () => new A(),
  transient3: ({ builder }) => builder.transient(new A()),
  scoped4: ({ builder }) => builder.scoped(new A()),
  singleton4: () => new A(),
  transient4: ({ builder }) => builder.transient(new A()),
  scoped5: ({ builder }) => builder.scoped(new A()),
  singleton5: () => new A(),
  transient5: ({ builder }) => builder.transient(new A()),
  scoped6: ({ builder }) => builder.scoped(new A()),
  singleton6: () => new A(),
  transient6: ({ builder }) => builder.transient(new A()),
});

const container = createContainer();

const resultStandard = microBenchmark.suite({
  maxOperations: 1000000000,
  specs: [
    {
      fn: () => container.scope(),
      name: "scope()",
    },
    {
      fn: () => container.scope().singleton(),
      name: "resolve singleton",
    },
    {
      fn: () => container.scope().transient(),
      name: "resolve transient",
    },
    {
      fn: () => container.scope().scoped(),
      name: "resolve scoped",
    },
  ],
});

const report = microBenchmark.report(resultStandard);
console.log(report);
