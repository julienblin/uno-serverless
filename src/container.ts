
export type Container<T> = {
  readonly [P in keyof T]: () => T[P];
};

export enum Lifetime {
  Singleton = "singleton",
  Transient = "transient",
}

export interface Registration<T, TArg> {
  // tslint:disable-next-line:prefer-method-signature
  build: (arg: TArg) => T;
  lifetime: Lifetime;
}

export type Registrations<T, TArg> = {
  [P in keyof T]: ((arg: TArg) => T[P]) | Registration<T[P], TArg>;
};

export interface RegistrationArg<TContract, TOptions> {
  container: Container<TContract>;
  options?: TOptions;
}

export type ContainerCreation<TOptions, TContract> = (options?: TOptions) => Container<TContract>;

export const configureContainer = <TContract, TOptions = any>(
  registrations: Registrations<TContract, RegistrationArg<TContract, TOptions>>)
  : ContainerCreation<TOptions, TContract> =>

  (containerOptions?: TOptions) => {
    const resolvedRegistrations: Record<string, Registration<any, any>> = {};
    const singletonInstances: Record<string, any> = {};
    const container = {};

    for (const contractKey of Object.keys(registrations)) {

      container[contractKey] = () => {

        if (singletonInstances[contractKey]) {
          return singletonInstances[contractKey];
        }

        if (!resolvedRegistrations[contractKey]) {
          const registration = registrations[contractKey];
          resolvedRegistrations[contractKey] = (typeof registration === "function")
            ? { build: registration, lifetime: Lifetime.Singleton }
            : registration;
        }

        const resolvedRegistration = resolvedRegistrations[contractKey];
        switch (resolvedRegistration.lifetime) {
          case Lifetime.Transient:
            return resolvedRegistration.build({ container, options: containerOptions });
          case Lifetime.Singleton:
            singletonInstances[contractKey] =
              resolvedRegistration.build({ container, options: containerOptions });

            return singletonInstances[contractKey];
          default:
            throw new Error(`Unknown lifetime ${resolvedRegistration.lifetime}`);
        }
      };
    }

    return container as Container<TContract>;
  };
