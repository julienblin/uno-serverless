import { UnoContext, UnoEvent } from "./schemas";
import { randomStr } from "./utils";

export interface FunctionArg<TEvent extends UnoEvent, TServices> {
  event: TEvent;
  context: UnoContext;
  services: TServices;
}

export type FunctionExecution<TEvent extends UnoEvent, TServices> =
  (arg: FunctionArg<TEvent, TServices>) => Promise<any>;
export type Middleware<TEvent extends UnoEvent, TServices> =
  (arg: FunctionArg<TEvent, TServices>, next: FunctionExecution<TEvent, TServices>) => Promise<any>;

export interface FunctionBuilder {
  handler<TEvent extends UnoEvent, TServices>(func: FunctionExecution<TEvent, TServices>): any;
  use<TEvent extends UnoEvent, TServices>(
    middleware: Middleware<TEvent, TServices> | Array<Middleware<TEvent, TServices>>): FunctionBuilder;
}

export type ProviderAdapter = () => FunctionBuilder;

export const uno = (adapter: ProviderAdapter): FunctionBuilder => adapter();

export class GenericFunctionBuilder implements FunctionBuilder {
  private readonly middlewares: Array<Middleware<any, any>> = [];

  public constructor(private readonly adapterBuilder: (invocation: (arg: FunctionArg<any, any>) => any) => any) {}

  public use<TEvent extends UnoEvent, TServices>(
    middleware: Middleware<TEvent, TServices> | Array<Middleware<TEvent, TServices>>)
    : FunctionBuilder {
      if (Array.isArray(middleware)) {
        middleware.forEach((x) => this.middlewares.push(x));
      } else {
        this.middlewares.push(middleware);
      }
      return this;
  }

  public handler<TEvent extends UnoEvent, TServices>(func: FunctionExecution<TEvent, TServices>) {

    const innerCircle = async (arg: FunctionArg<TEvent, TServices>) => {
      return await func(arg);
    };

    let outerCircle = async (arg: FunctionArg<TEvent, TServices>) => {
      return innerCircle(arg);
    };

    this.middlewares.reverse().forEach((middleware) => {
      const currentOuterCircle = outerCircle;
      outerCircle = async (arg: FunctionArg<TEvent, TServices>) => {
        return middleware(
          arg,
          (nextArg) => currentOuterCircle(nextArg));
      };
    });

    return this.adapterBuilder(outerCircle);
  }
}

/**
 * The test adapter is useful for unit testing.
 * It returns a handler that takes a UnoEvent and a UnoContext,
 * and return the results without any transformation.
 */
export const testAdapter = (): ProviderAdapter => {
  return () =>  {
    return new GenericFunctionBuilder((outerCircle) => {
      const defaultEvent: UnoEvent = {
        unoEventType: "any",
      };

      const defaultContext: UnoContext = {
        invocationId: randomStr(),
        log: console.log,
        original: {},
        provider: "Test",
      };

      return async (event: UnoEvent, context: UnoContext) => {
        return outerCircle({ event: event || defaultEvent, context: context || defaultContext, services: {} });
      };
    });
  };
};
