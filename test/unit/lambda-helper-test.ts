import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { randomStr } from "../../src/core/utils";

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

export const createAPIGatewayProxyEvent =
    (args: {
      body?: {};
      headers?:
      { [name: string]: string };
      method?: string;
      path?: string,
      pathParameters?: { [name: string]: string };
      queryStringParameters?: { [name: string]: string }; } = {}): APIGatewayProxyEvent => ({
      body: args.body
        ? (typeof args.body === "string") ? args.body : JSON.stringify(args.body)
        : null,
      headers: args.headers ? args.headers : {},
      httpMethod: args.method ? args.method : "GET",
      isBase64Encoded: false,
      path: args.path || "/unit-tests",
      pathParameters: args.pathParameters ? args.pathParameters : null,
      queryStringParameters: args.queryStringParameters ? args.queryStringParameters : null,
      requestContext: {
        accountId: randomStr(),
        apiId: randomStr(),
        httpMethod: "GET",
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          sourceIp: "127.0.0.1",
          user: null,
          userAgent: null,
          userArn: null,
        },
        path: "/unit-tests",
        requestId: randomStr(),
        requestTimeEpoch: new Date().getTime(),
        resourceId: randomStr(),
        resourcePath: randomStr(),
        stage: randomStr(),
      },
      resource: randomStr(),
      stageVariables: {},
    });
