// tslint:disable-next-line:no-implicit-dependencies
import { Context } from "aws-lambda";
import { randomStr } from "../src/utils";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-magic-numbers
// tslint:disable:no-empty

export const createLambdaContext = (): Context => ({
  awsRequestId: randomStr(),
  callbackWaitsForEmptyEventLoop: true,
  done: () => {},
  fail: () => {},
  functionName: randomStr(),
  functionVersion: randomStr(),
  getRemainingTimeInMillis: () => 10,
  invokedFunctionArn: randomStr(),
  logGroupName: randomStr(),
  logStreamName: randomStr(),
  memoryLimitInMB: 512,
  succeed: () => {},
});
