import { memoize } from "./utils";

export enum Lifetime {
  Singleton = "singleton",
  Transient = "transient",
  Scoped = "scoped",
}

export interface Registration<T, TArg> {
  lifetime: Lifetime;
  build(arg: TArg): T;
}

export type ContainerSpecification<T, TArg> = {
  [P in keyof T]: ((arg: TArg) => T[P]) | Registration<T[P], TArg>;
};

export type UnpackRegistration<T> =
  T extends Registration<infer S, T> ? S :
  T extends (args: any) => infer U ? U :
  never;

export type ScopedContainer<TSpec> = {
  readonly [P in keyof TSpec]: () => UnpackRegistration<TSpec[P]>;
};

export interface ScopeCreator<TSpec> {
  scope(): ScopedContainer<TSpec>;
}

export type RootContainer<TSpec> = ScopedContainer<TSpec> & ScopeCreator<TSpec>;

export type ContainerCreation<TOptions, TSpec> = (options: TOptions) => RootContainer<TSpec>;

export const configureContainer =
  <TOptions, TSpec>(registrations: TSpec): ContainerCreation<TOptions, TSpec> =>
  (options: TOptions) => {
    const rootContainer = {};
    const resolvedRegistrations = Object.keys(registrations).map((regKey) => {
      const reg = registrations[regKey];

      return typeof reg === "function"
        ? { key: regKey, build: reg, lifetime: Lifetime.Singleton }
        : { key: regKey, ...reg};
    });

    resolvedRegistrations.forEach((reg) => {

      switch (reg.lifetime) {
        case Lifetime.Singleton:
          rootContainer[reg.key] = memoize(() => reg.build({ container: rootContainer, options }));
          break;

        case Lifetime.Transient:
          rootContainer[reg.key] = () => reg.build({ container: rootContainer, options });
          break;

        case Lifetime.Scoped:
          rootContainer[reg.key] = () => { throw new Error("Cannot instantiate scoped component in root container"); };
          break;

        default:
          throw new Error(`Unknown lifetime ${reg.lifetime}`);
      }
    });

    if (!resolvedRegistrations.some((reg) => reg.lifetime === Lifetime.Scoped)) {
      // If there are no scoped registrations, we optimize the scope call by always returning the root container.
      // tslint:disable-next-line:no-string-literal
      rootContainer["scope"] = () => rootContainer;
    } else {
      // tslint:disable-next-line:no-string-literal
      rootContainer["scope"] = () => {
        const scopedContainer = {};

        resolvedRegistrations.forEach((reg) => {

          switch (reg.lifetime) {
            case Lifetime.Singleton:
              scopedContainer[reg.key] = rootContainer[reg.key];
              break;

            case Lifetime.Transient:
              scopedContainer[reg.key] = () => reg.build({ container: scopedContainer, options });
              break;

            case Lifetime.Scoped:
              scopedContainer[reg.key] = memoize(() => reg.build({ container: scopedContainer, options }));
              break;

            default:
              throw new Error(`Unknown lifetime ${reg.lifetime}`);
          }
        });

        return scopedContainer;
      };
    }

    return rootContainer as RootContainer<TSpec>;
  };

/** Manages the creation of a root container and handles scoped execution. */
export const inject = <TFunc, TSpec>(
  func: (args: any, scopedContainer: ScopedContainer<TSpec>) => TFunc,
  containerFactory: (args: any) => RootContainer<TSpec>): (args: any) => TFunc => {
    let rootContainer: RootContainer<TSpec>;

    return (a) => {

      if (!rootContainer) {
        rootContainer = containerFactory(a);
      }

      return func(a, rootContainer.scope());
    };
};
