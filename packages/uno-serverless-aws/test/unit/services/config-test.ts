import { AWSError, Response, SSM } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
import { expect } from "chai";
import { describe, it } from "mocha";
import { ConfigService, HealthCheckStatus, StandardErrorCodes } from "uno-serverless";
import { SSMParameterStoreClient, SSMParameterStoreConfigService } from "../../../src/services/config";

const path = "/uno-serverless/tests";

class SSMParameterStoreClientStub implements SSMParameterStoreClient {

  public currentIteration = -1;

  public constructor(private readonly parameterCalls: SSM.Parameter[][]) {}

  public getParametersByPath(params: SSM.GetParametersByPathRequest):
    { promise(): Promise<PromiseResult<SSM.Types.GetParametersByPathResult, AWSError>> } {

    ++this.currentIteration;

    return {
      promise: async () =>
        ({
          $response: {} as Response<SSM.Types.GetParametersByPathResult, AWSError>,
          Parameters: this.parameterCalls[this.currentIteration],
        }),
    };
  }

  public putParameter(params: SSM.Types.PutParameterRequest):
    { promise(): Promise<PromiseResult<SSM.Types.PutParameterResult, AWSError>> } {
      return {
        promise: async () => ({
          $response: {} as Response<SSM.Types.PutParameterResult, AWSError>,
        }),
      };
  }
}

describe("SSMParameterStoreConfigService", () => {

  it("should return mandatory values", async () => {
    const values = { foo: "bar" };
    const ssmParameters: SSM.Parameter[] = [
      {
        Name: `${path}/foo`,
        Value: values.foo,
      },
    ];

    const config = new SSMParameterStoreConfigService({
      path,
      ssm: new SSMParameterStoreClientStub([ ssmParameters ]),
    }) as ConfigService;

    const result = await config.get("foo");
    expect(result).to.equal(values.foo);
  });

  it("should return optional values", async () => {
    const config = new SSMParameterStoreConfigService({
      path,
      ssm: new SSMParameterStoreClientStub([[]]),
    }) as ConfigService;

    const result = await config.get("foo", false);
    expect(result).to.be.undefined;
  });

  it("should throw on missing required values", async () => {
    const config = new SSMParameterStoreConfigService({
      path,
      ssm: new SSMParameterStoreClientStub([[]]),
    }) as ConfigService;

    try {
      await config.get("foo");
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("SSMParameterStoreConfigService");
    }

    try {
      await config.get("foo", true);
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("SSMParameterStoreConfigService");
    }
  });

  it("should return cached values", async () => {
    const values = { foo: "bar" };
    const ssmParameters: SSM.Parameter[] = [
      {
        Name: `${path}/foo`,
        Value: values.foo,
      },
    ];

    const stub = new SSMParameterStoreClientStub([ ssmParameters ]);
    const config = new SSMParameterStoreConfigService({
      path,
      ssm: stub,
    }) as ConfigService;

    await config.get("foo");

    // Testing cache
    await config.get("foo");
    expect(stub.currentIteration).to.equal(0);
  });

  it("should disable cache", async () => {
    const values = { foo: "bar" };
    const ssmParameters: SSM.Parameter[] = [
      {
        Name: `${path}/foo`,
        Value: values.foo,
      },
    ];

    const stub = new SSMParameterStoreClientStub([ ssmParameters, ssmParameters ]);
    const config = new SSMParameterStoreConfigService({
      path,
      ssm: stub,
      ttl: 0,
    }) as ConfigService;

    await config.get("foo");

    // Testing cache
    await config.get("foo");
    expect(stub.currentIteration).to.equal(1);
  });

  it("should refresh cache", async () => {
    const values = { foo: "bar" };
    const ssmParameters: SSM.Parameter[] = [
      {
        Name: `${path}/foo`,
        Value: values.foo,
      },
    ];

    const stub = new SSMParameterStoreClientStub([ ssmParameters, ssmParameters ]);
    const config = new SSMParameterStoreConfigService({
      path,
      ssm: stub,
      ttl: 10,
    }) as ConfigService;

    await config.get("foo");

    // Testing cache
    await config.get("foo");
    expect(stub.currentIteration).to.equal(0);

    await new Promise((r) => setTimeout(r, 10));

    await config.get("foo");
    expect(stub.currentIteration).to.equal(1);
  });

  it("should check health", async () => {
    const config = new SSMParameterStoreConfigService({
      path,
      ssm: new SSMParameterStoreClientStub([[]]),
    });

    const result = await config.checkHealth();
    expect(result.name).to.equal("SSMParameterStoreConfigService");
    expect(result.target).to.equal(path);
    expect(result.status).to.equal(HealthCheckStatus.Ok);
  });

});
