import * as awsLambda from "aws-lambda";
import { isAPIGatewayProxyResult, ServicesWithParseBody, ServicesWithParseParameters } from "../middlewares/proxy";

export interface LambdaArg<TEvent, TServices> {
  event: TEvent;
  context: awsLambda.Context;
  services: TServices;
}

export type LambdaExecution<TEvent, TServices> = (arg: LambdaArg<TEvent, TServices>) => Promise<any>;
export type Middleware<TEvent, TServices> =
  (arg: LambdaArg<TEvent, TServices>, next: LambdaExecution<TEvent, TServices>) => Promise<any>;

export interface LambdaBuilder {
  handler<TEvent, TResult, TServices>(func: LambdaExecution<TEvent, TServices>): awsLambda.Handler<TEvent, TResult>;
  use<TEvent, TServices>(middleware: Middleware<TEvent, TServices> | Array<Middleware<TEvent, TServices>>)
    : LambdaBuilder;
}

export class LambdaBuildImpl implements LambdaBuilder {

  private readonly middlewares: Array<Middleware<any, any>> = [];

  public use<TEvent, TServices>(middleware: Middleware<TEvent, TServices> | Array<Middleware<TEvent, TServices>>)
    : LambdaBuilder {
      if (Array.isArray(middleware)) {
        middleware.forEach((x) => this.middlewares.push(x));
      } else {
        this.middlewares.push(middleware);
      }
      return this;
  }

  public handler<TEvent, TResult, TServices>(func: LambdaExecution<TEvent, TServices>)
    : awsLambda.Handler<TEvent, TResult> {

    const innerCircle = async (arg: LambdaArg<TEvent, TServices>) => {
      return await func(arg);
    };

    let outerCircle = async (arg: LambdaArg<TEvent, TServices>) => {
      return innerCircle(arg);
    };

    this.middlewares.reverse().forEach((middleware) => {
      const currentOuterCircle = outerCircle;
      outerCircle = async (arg: LambdaArg<TEvent, TServices>) => {
        return middleware(
          arg,
          (nextArg) => currentOuterCircle(nextArg));
      };
    });

    return (event: TEvent, context: awsLambda.Context) => outerCircle({ event, context, services: {} as TServices });
  }
}

export const lambda = (): LambdaBuilder => new LambdaBuildImpl();
