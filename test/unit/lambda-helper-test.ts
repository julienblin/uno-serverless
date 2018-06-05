import { randomStr } from "@src/utils";
import { Context } from "aws-lambda";

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
