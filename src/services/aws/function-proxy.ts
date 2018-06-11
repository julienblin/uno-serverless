import { AWSError, Lambda } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";

export interface LambdaClient {
  invoke(params: Lambda.Types.InvocationRequest)
  : { promise(): Promise<PromiseResult<Lambda.Types.InvocationResponse, AWSError>> };
}

export interface FunctionProxyOptions {
  lambda?: LambdaClient;
  name: string;
}

/**
 * Create a function proxy to call a lambda function in asynchronous fashion.
 * (invocation type = Event).
 */
export const asyncFunctionProxy = <TEvent extends object>(options: FunctionProxyOptions) => {
  const lambda = options.lambda || new Lambda();

  return async (event: TEvent, clientContext?: string) => {
    await lambda.invoke({
      ClientContext: clientContext,
      FunctionName: options.name,
      InvocationType: "Event",
      Payload: event ? JSON.stringify(event) : undefined})
      .promise();
  };
};

/**
 * Create a function proxy to call a lambda function in synchronous fashion.
 * (invocation type = RequestResponse).
 */
export const functionProxy =
  <TEvent extends object, TResult extends object>(options: FunctionProxyOptions) => {
  const lambda = options.lambda || new Lambda();

  return async (event: TEvent, clientContext?: string): Promise<TResult> => {
    const result = await lambda.invoke({
      ClientContext: clientContext,
      FunctionName: options.name,
      InvocationType: "RequestResponse",
      Payload: event ? JSON.stringify(event) : undefined})
      .promise();

    if (!result.Payload) {
      return undefined as any as TResult;
    }

    return JSON.parse(result.Payload as string) as TResult;
  };
};
