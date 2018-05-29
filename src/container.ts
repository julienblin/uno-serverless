export type Container<T> = {
  readonly [P in keyof T]: T[P];
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
  [P in keyof T]: (arg: TArg) => T[P] | Promise<T[P]> | Registration<T, TArg>;
};

export interface RegistrationArg<TContract, TOptions> {
  container: Container<TContract>;
  options?: TOptions;
}

export const buildContainer = <TContract, TOptions>(
  registrations: Registrations<TContract, RegistrationArg<TContract, TOptions>>,
  options?: TOptions): Container<TContract> => {
  throw new Error();
};

/* class A {}

class B {}

interface ContainerContract {
  a: A;
  b: B;
  configService: ConfigService;
}

const test = buildContainer<ContainerContract, any>({
  a: () => new A(),
  b: () => ({ build: () => new B(), lifetime: Lifetime.Transient }),
  configService: async () => new SSMParameterStoreConfigService({ path: "/ngl/lewtt-api/foo" }),
});*/
