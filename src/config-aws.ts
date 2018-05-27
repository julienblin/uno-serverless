// tslint:disable:no-implicit-dependencies
import { SSM } from "aws-sdk";
// tslint:disable-next-line:no-submodule-imports
import { GetParametersByPathResult } from "aws-sdk/clients/ssm";
import { ConfigService } from "./config";
import { configurationError } from "./errors";

export interface SSMParameterStoreConfigServiceOptions {
  numberOfIterations?: number;
  path: string;
  ssm?: SSM;

  /** TTL before expiration of the cache. */
  ttl?: number;
}

/**
 * ConfigService implementation that uses
 * AWS Systems Manager Parameter Store.
 */
export class SSMParameterStoreConfigService implements ConfigService {

  /** Cached promise */
  private cache: {
    parameters: Promise<Record<string, string>>;
    timestamp: number;
  } | undefined;

  /** The AWS SSM client. */
  private readonly ssm: SSM;

  public constructor(
    private readonly options: SSMParameterStoreConfigServiceOptions,
    private readonly name = SSMParameterStoreConfigService.name) {
      this.ssm = options.ssm
        ? options.ssm
        : new SSM({
          maxRetries: 3,
        });

      if (!this.options.path.endsWith("/")) {
        this.options.path = this.options.path.slice(0, -1);
      }

      if (!this.options.numberOfIterations) {
        // tslint:disable-next-line:no-magic-numbers
        this.options.numberOfIterations = 10;
      }

      if (!this.options.ttl) {
        this.options.ttl = Number.MAX_SAFE_INTEGER;
      }
    }

  public async get(key: string): Promise<string>;
  public async get(key: string, required = true): Promise<string | undefined> {
    if (!this.cache) {
      this.cache = {
        parameters: this.getParameters(),
        timestamp: new Date().getTime(),
      };
    }

    const resolvedParameters = await this.cache.parameters;

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
}
