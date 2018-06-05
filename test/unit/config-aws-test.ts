// tslint:disable-next-line:no-implicit-dependencies
import { AWSError, Response, SSM } from "aws-sdk";
// tslint:disable-next-line:no-submodule-imports no-implicit-dependencies
import { PromiseResult } from "aws-sdk/lib/request";
import { expect } from "chai";
import { describe, it } from "mocha";
import { ConfigService } from "../../src/config";
import { SSMParameterStoreClient, SSMParameterStoreConfigService } from "../../src/config-aws";
import { HealthCheckStatus } from "../../src/health-checks";

const path = "/opiniated-lambda/tests";

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
}

describe("SSMParameterStoreClient", () => {

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
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("SSMParameterStoreConfigService");
    }

    try {
      await config.get("foo", true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
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
      ttl: 100,
    }) as ConfigService;

    await config.get("foo");

    // Testing cache
    await config.get("foo");
    expect(stub.currentIteration).to.equal(0);

    await new Promise((r) => setTimeout(r, 100));

    await config.get("foo");
    expect(stub.currentIteration).to.equal(1);
  });

  it("should check health", async () => {
    const config = new SSMParameterStoreConfigService({
      path,
      ssm: new SSMParameterStoreClientStub([]),
    });

    const result = await config.checkHealth();
    expect(result.status).to.equal(HealthCheckStatus.Ok);
  });

});
