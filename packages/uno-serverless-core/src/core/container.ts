
export enum Lifetime {
  Singleton = "singleton",
  Transient = "transient",
  Scoped = "scoped",
}

/** Container builder options. */
export class BuilderOptions {
  public constructor(public lifetime: Lifetime = Lifetime.Singleton) {}

  /** Creates a component with the scoped lifetime. */
  public scoped<T>(value: T) {
    this.lifetime = Lifetime.Scoped;

    return value;
  }

  /** Creates a component with the singleton lifetime. */
  public singleton<T>(value: T) {
    this.lifetime = Lifetime.Singleton;

    return value;
  }

  /** Creates a component with the transient lifetime. */
  public transient<T>(value: T) {
    this.lifetime = Lifetime.Transient;

    return value;
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

/**
 * Creates a container factory that conforms to the
 * contract and follows instructions given by the builder.
 */
export const createContainerFactory = <TContract, TOptions = any>(
  builder: ContainerBuilder<TContract, TOptions>): ContainerFactory<TContract, TOptions> => {

    /** Dynamic container generation. */
    function Container(this: any, options?: TOptions, parent?: any) {
      this._options = options;
      this._parent = parent;
      this._instances = {};
    }

    Object.keys(builder).forEach((builderKey) => {
      Container.prototype[builderKey] = function(this: any) {
        if (this._instances[builderKey]) {
          return this._instances[builderKey];
        }

        if (this._parent && this._parent._instances[builderKey]) {
          return this._parent._instances[builderKey];
        }

        const componentBuilder = builder[builderKey];
        const builderOptions = new BuilderOptions();

        const componentBuilderResult = componentBuilder({
          builder: builderOptions,
          container: this,
          options: this._options,
        });

        switch (builderOptions.lifetime) {
          case Lifetime.Singleton:
            if (this._parent) {
              this._parent._instances[builderKey] = componentBuilderResult;
            } else {
              this._instances[builderKey] = componentBuilderResult;
            }

            return componentBuilderResult;

          case Lifetime.Transient:
            return componentBuilderResult;

          case Lifetime.Scoped:
            if (!this._parent) {
              throw new Error("Cannot instantiate scoped component in root container");
            }
            this._instances[builderKey] = componentBuilderResult;

            return componentBuilderResult;

            default:
              throw new Error(`Unknown lifetime ${builderOptions.lifetime}`);
        }
      };
    });

    Container.prototype.scope = function(this: any) {
      return new Container(this._options, this);
    };

    return (factoryOptions?: TOptions) => new Container(factoryOptions);
  };
