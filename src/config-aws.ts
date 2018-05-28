// tslint:disable:no-implicit-dependencies
import { AWSError, SSM } from "aws-sdk";
// tslint:disable:no-submodule-imports
import { GetParametersByPathResult } from "aws-sdk/clients/ssm";
import { PromiseResult } from "aws-sdk/lib/request";
import { ConfigService } from "./config";
import { configurationError } from "./errors";
import { checkHealth, HealthCheckResult, ICheckHealth } from "./health-checks";

export interface SSMParameterStoreClient {
  getParametersByPath(params: SSM.Types.GetParametersByPathRequest)
      : { promise(): Promise<PromiseResult<SSM.Types.GetParametersByPathResult, AWSError>> };
}

export interface SSMParameterStoreConfigServiceOptions {
  numberOfIterations?: number;
  path: string;
  ssm?: SSMParameterStoreClient;

  /** TTL before expiration of the cache, in milliseconds. */
  ttl?: number;
}

/**
 * ConfigService implementation that uses
 * AWS Systems Manager Parameter Store.
 */
export class SSMParameterStoreConfigService implements ConfigService, ICheckHealth {

  /** Cached promise */
  private cache: {
    parameters: Promise<Record<string, string>>;
    timestamp: number;
  } | undefined;

  /** The AWS SSM client. */
  private readonly ssm: SSMParameterStoreClient;

  public constructor(
    private readonly options: SSMParameterStoreConfigServiceOptions,
    private readonly name = SSMParameterStoreConfigService.name) {
    this.ssm = options.ssm
      ? options.ssm
      : new SSM({
        maxRetries: 3,
      });

    if (!this.options.path.endsWith("/")) {
      this.options.path = `${this.options.path}/`;
    }

    if (!this.options.numberOfIterations) {
      // tslint:disable-next-line:no-magic-numbers
      this.options.numberOfIterations = 10;
    }
  }

  /** Performs a health check. */
  public async checkHealth(): Promise<HealthCheckResult> {
    return checkHealth(
      SSMParameterStoreConfigService.name,
      this.options.path,
      async () => this.getParameters());
  }

  public async get(key: string): Promise<string>;
  public async get(key: string, required = true): Promise<string | undefined> {
    const now = new Date().getTime();

    // tslint:disable-next-line:no-magic-numbers no-non-null-assertion
    if (this.isCachePerished(now)) {
      this.cache = {
        parameters: this.getParameters(),
        timestamp: now,
      };
    }

    // tslint:disable-next-line:no-non-null-assertion
    const resolvedParameters = await this.cache!.parameters;

    if (resolvedParameters[key]) {
      return resolvedParameters[key];
    }

    if (required) {
      throw configurationError({ key, provider: this.name }, `Missing configuration value for ${key}`);
    }

    return undefined;
  }

  /** Retrieves all parameters under the key prefix. */
  private async getParameters(): Promise<Record<string, string>> {
    const parameterMap = {};
    let partialResult: GetParametersByPathResult | undefined;
    let iteration = 0;

    do {
      partialResult = await this.ssm.getParametersByPath({
        NextToken: partialResult ? partialResult.NextToken : undefined,
        Path: this.options.path,
        Recursive: true,
      })
      .promise();

      if (!partialResult.Parameters) {
        break;
      }

      partialResult.Parameters.forEach((p) => {
        if (p.Name && p.Value) {
          parameterMap[p.Name.replace(this.options.path, "")] = p.Value;
        }
      });
      ++iteration;

      // Safeguard for unbounded results
      // tslint:disable-next-line:no-non-null-assertion
      if (iteration > this.options.numberOfIterations!) {
        throw configurationError(
          { provider: this.name },
          `Too many parameters defined under the path ${this.options.path}. ` +
          `Number of round-trips executed: ${iteration}.`);
      }

    } while (!partialResult || partialResult.NextToken);

    return parameterMap;
  }

  /** Indicates whether to refresh the cache or not. */
  private isCachePerished(now: number) {
    // tslint:disable-next-line:strict-type-predicates
    const cachedDisabled = ((this.options.ttl === undefined) || (this.options.ttl === null));

    if (!this.cache) {
      return true;
    }

    if (cachedDisabled) {
      return false;
    }

    // tslint:disable-next-line:no-non-null-assertion
    return (this.cache.timestamp + this.options.ttl!) <= now;
  }
}
