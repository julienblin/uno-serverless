import { AWSError, Lambda, Response } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
import { expect } from "chai";
import { randomStr } from "../../../../src/core/utils";
import {
  asyncFunctionProxy, functionProxy,
  LambdaClient } from "../../../../src/services/aws/function-proxy";

class LambdaClientStub implements LambdaClient {

  public constructor() {}

  public invoke(params: Lambda.Types.InvocationRequest)
  : { promise(): Promise<PromiseResult<Lambda.Types.InvocationResponse, AWSError>> } {

    return {
      promise: async () => ({
        $response: {} as Response<Lambda.Types.InvocationResponse, AWSError>,
        Payload: params.Payload,
      }),
    };
  }
}

describe("asyncFunctionProxy", () => {

  it("should create function proxy", async () => {
    interface MyEvent {
      foo: string;
    }

    const stub = new LambdaClientStub();

    const proxy = asyncFunctionProxy<MyEvent>({
      lambda: stub,
      name: randomStr(),
    });

    await proxy({ foo: "bar" });
    expect(true);
  });

});

describe("functionProxy", () => {

  it("should create function proxy", async () => {
    interface MyEvent {
      foo: string;
    }

    type MyResponse = MyEvent;

    const stub = new LambdaClientStub();

    const proxy = functionProxy<MyEvent, MyResponse>({
      lambda: stub,
      name: randomStr(),
    });

    const result = await proxy({ foo: "bar" });
    expect(result.foo).to.equal("bar");
  });

});
