
export enum Lifetime {
  Singleton = "singleton",
  Transient = "transient",
  Scoped = "scoped",
}

/** Container builder options. */
export class BuilderOptions {
  public constructor(public lifetime: Lifetime = Lifetime.Singleton) {}

  /** Creates a component with the scoped lifetime. */
  public scoped<T>(factory: () => T) {
    this.lifetime = Lifetime.Scoped;

    return factory();
  }

  /** Creates a component with the singleton lifetime. */
  public singleton<T>(factory: () => T) {
    this.lifetime = Lifetime.Singleton;

    return factory();
  }

  /** Creates a component with the transient lifetime. */
  public transient<T>(factory: () => T) {
    this.lifetime = Lifetime.Transient;

    return factory();
  }
}

export type ContainerBuilder<TContract, TOptions> = {
  [P in keyof TContract]: (args: { builder: BuilderOptions; container: TContract; options: TOptions}) =>
    TContract[P] extends (...args: any[]) => infer R ? R
    : never;
};

export type ScopedContainer<TContract> = {
  readonly [P in keyof TContract]: TContract[P];
};

export interface ScopeCreator<TContract> {
  scope(): ScopedContainer<TContract>;
}

export type RootContainer<TContract> = ScopedContainer<TContract> & ScopeCreator<TContract>;

export type ContainerFactory<TContract, TOptions> = (options?: TOptions) => RootContainer<TContract>;

const ROOT_CONTAINER_INSTANCES = "_instances";

// tslint:disable:no-string-literal
const buildContainer = <TContract, TOptions>(
  builder: ContainerBuilder<TContract, TOptions>,
  options?: TOptions,
  root?: RootContainer<TContract>): RootContainer<TContract> | ScopedContainer<TContract> => {
    const instances: Record<string, any> = {};
    const container = {};

    Object.keys(builder).forEach((builderKey) => {
      const componentBuilder = builder[builderKey];

      container[builderKey] = () => {
        if (instances[builderKey]) {
          return instances[builderKey];
        }

        if (root && root[ROOT_CONTAINER_INSTANCES] && root[ROOT_CONTAINER_INSTANCES][builderKey]) {
          return root[ROOT_CONTAINER_INSTANCES][builderKey];
        }

        const builderOptions = new BuilderOptions();

        const componentBuilderResult = componentBuilder({
          builder: builderOptions,
          container,
          options,
        });

        switch (builderOptions.lifetime) {
          case Lifetime.Singleton:
            if (root) {
              root[ROOT_CONTAINER_INSTANCES][builderKey] = componentBuilderResult;
            } else {
              instances[builderKey] = componentBuilderResult;
            }

            return componentBuilderResult;

          case Lifetime.Transient:
            return componentBuilderResult;

          case Lifetime.Scoped:
            if (!root) {
              throw new Error("Cannot instantiate scoped component in root container");
            }
            instances[builderKey] = componentBuilderResult;

            return componentBuilderResult;

            default:
              throw new Error(`Unknown lifetime ${builderOptions.lifetime}`);
        }
      };
    });

    if (!root) {
      // tslint:disable-next-line:no-string-literal
      container["scope"] = () =>
        buildContainer(builder, options, container as RootContainer<TContract>);

      // tslint:disable-next-line:no-string-literal
      container[ROOT_CONTAINER_INSTANCES] = instances;
    }

    return container as RootContainer<TContract> | ScopedContainer<TContract>;
  };
// tslint:enable:no-string-literal

/**
 * Creates a container factory that conforms to the
 * contract and follows instructions given by the builder.
 */
export const createContainerFactory = <TContract, TOptions = any>(
  builder: ContainerBuilder<TContract, TOptions>): ContainerFactory<TContract, TOptions> =>
    (options?: TOptions) =>
      buildContainer<TContract, TOptions>(builder, options) as RootContainer<TContract>;
