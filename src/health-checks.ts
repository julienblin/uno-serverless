// tslint:disable-next-line:no-implicit-dependencies
import { APIGatewayProxyResult } from "aws-lambda";
import * as HttpStatusCodes from "http-status-codes";
import { APIGatewayProxyResultProvider, BodySerializer } from "./results";
import { convertHrtimeToMs, defaultConfidentialityReplacer, safeJSONStringify } from "./utils";

/** Possible statuses for health check results. */
export enum HealthCheckStatus {
  Inconclusive = "Inconclusive",
  Ok = "Ok",
  Warning = "Warning",
  Error = "Error",
}

/** Result of a health check. */
export class HealthCheckResult implements APIGatewayProxyResultProvider {

  /** The health checks children */
  public readonly children: HealthCheckResult[] | undefined;

  /** Elapsed time in ms. */
  public readonly elapsed: number | undefined;

  /** The error, if any */
  public readonly error: any;

  /** The name of the health check */
  public readonly name: string;

  /** The status */
  public readonly status: HealthCheckStatus | undefined;

  /** Additional info about the checked target */
  public target: string | undefined;

  public constructor(
    args: {
      children?: HealthCheckResult[];
      elapsed?: number;
      error?: any;
      name: string;
      status?: HealthCheckStatus;
      target?: string;
    },
    private readonly confidentialityReplacer = defaultConfidentialityReplacer) {

    this.children = args.children;
    this.elapsed = args.elapsed;
    this.error = args.error;
    this.name = args.name;
    this.status = args.status
      ? args.status
      : HealthCheckStatus.Inconclusive;
    this.target = args.target;

    if (this.children && this.children.length > 0) {
      this.status = this.evaluateChildrenStatuses();
    }
  }

  public getAPIGatewayProxyResult(serializer: BodySerializer): APIGatewayProxyResult {
    let statusCode: number;

    switch (this.status) {
      case HealthCheckStatus.Error:
        statusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR;
        break;
      case HealthCheckStatus.Warning:
        statusCode = HttpStatusCodes.BAD_REQUEST;
        break;
      default:
        statusCode = HttpStatusCodes.OK;
    }

    return {
      // tslint:disable-next-line:no-magic-numbers
      body: safeJSONStringify(this, this.confidentialityReplacer, 2),
      statusCode,
    };
  }

  /** Evaluate status based on children statuses. */
  private evaluateChildrenStatuses(): HealthCheckStatus {
    if (!this.children) {
      return HealthCheckStatus.Inconclusive;
    }

    if (this.children.some((x) => x.status === HealthCheckStatus.Error)) {
      return HealthCheckStatus.Error;
    }

    if (this.children.some((x) => x.status === HealthCheckStatus.Warning)) {
      return HealthCheckStatus.Warning;
    }

    if (this.children.some((x) => x.status === HealthCheckStatus.Inconclusive)) {
      return HealthCheckStatus.Inconclusive;
    }

    return HealthCheckStatus.Ok;
  }
}

/** Describes a component that can perform health checks. */
export interface ICheckHealth {
  checkHealth(): Promise<HealthCheckResult>;
}

/** Helper methods for running health checks */
export const checkHealth = async (
  name: string,
  target: string | undefined,
  check: () => Promise<{} | void | undefined>,
): Promise<HealthCheckResult> => {
  const start = process.hrtime();
  try {
    await check();

    return new HealthCheckResult({
      elapsed: convertHrtimeToMs(process.hrtime(start)),
      name,
      status: HealthCheckStatus.Ok,
      target,
    });
  } catch (error) {
    return new HealthCheckResult({
      elapsed: convertHrtimeToMs(process.hrtime(start)),
      error,
      name,
      status: HealthCheckStatus.Error,
      target,
    });
  }
};

/** Options for the HealthService */
export interface IHealthServiceOptions {
  includeTargets: boolean;
  name: string;
  confidentialityReplacer?(key: string, value: any): any;
}

/** Performs and aggregates checks for a set of ICheckHealth. */
// tslint:disable-next-line:max-classes-per-file
export class HealthChecker implements ICheckHealth {

  public constructor(
    private readonly options: IHealthServiceOptions,
    private readonly checks: ICheckHealth[]) {
      if (!options.confidentialityReplacer) {
        options.confidentialityReplacer = defaultConfidentialityReplacer;
      }
  }

  /** Performs health checks. */
  public async checkHealth(): Promise<HealthCheckResult> {
    const start = process.hrtime();
    try {
      const children = await Promise.all(this.checks.map(async (x) => x.checkHealth()));

      if (!this.options.includeTargets) {
        children.forEach((child) => { child.target = undefined; });
      }

      return new HealthCheckResult(
        {
          children,
          elapsed: convertHrtimeToMs(process.hrtime(start)),
          name: this.options.name,
        },
        // tslint:disable-next-line:no-non-null-assertion
        (key, value) => this.options.confidentialityReplacer!(key, value));
    } catch (error) {
      return new HealthCheckResult(
        {
          elapsed: convertHrtimeToMs(process.hrtime(start)),
          error,
          name: this.options.name,
          status: HealthCheckStatus.Error,
        },
        // tslint:disable-next-line:no-non-null-assertion
        (key, value) => this.options.confidentialityReplacer!(key, value));
    }
  }
}
