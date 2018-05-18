// tslint:disable-next-line:no-implicit-dependencies
import { APIGatewayProxyResult } from "aws-lambda";
import * as HttpStatusCodes from "http-status-codes";
import { APIGatewayProxyResultProvider } from "./results";
import { convertHrtimeToMs, defaultConfidentialityReplacer } from "./utils";

/** Possible statuses for health check results. */
export enum HealthCheckStatus {
  Inconclusive = "Inconclusive",
  Ok = "Ok",
  Warning = "Warning",
  Error = "Error",
}

/** Result of a health check. */
export class HealthCheckResult implements APIGatewayProxyResultProvider {

  public constructor(
    private readonly value: {
      children?: HealthCheckResult[];
      elapsed?: number;
      error?: any;
      name: string;
      status?: HealthCheckStatus;
      target?: string;
    },
    private readonly confidentialityReplacer = defaultConfidentialityReplacer) {

    if (!this.value.status) {
      this.value.status = HealthCheckStatus.Inconclusive;
    }

    if (this.value.children && this.value.children.length > 0) {
      this.value.status = this.evaluateChildrenStatuses();
    }
  }

  /** Gets the name */
  public get name() { return this.value.name; }

  /** Gets the target */
  public get target() { return this.value.target; }

  /** Sets the target */
  public set target(value) { this.value.target = value; }

  /** Gets the status */
  public get status() { return this.value.status; }

  /** Gets the elapsed time */
  public get elapsed() { return this.value.elapsed; }

  /** Gets the children */
  public get children() { return this.value.children; }

  /** Gets the error */
  public get error() { return this.value.error; }

  public getAPIGatewayProxyResult(): APIGatewayProxyResult {
    let statusCode: number;

    switch (this.value.status) {
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
      body: JSON.stringify(this.value, this.confidentialityReplacer),
      statusCode,
    };
  }

  /** Evaluate status based on children statuses. */
  private evaluateChildrenStatuses(): HealthCheckStatus {
    if (!this.value.children) {
      return HealthCheckStatus.Inconclusive;
    }

    if (this.value.children.some((x) => x.value.status === HealthCheckStatus.Error)) {
      return HealthCheckStatus.Error;
    }

    if (this.value.children.some((x) => x.value.status === HealthCheckStatus.Warning)) {
      return HealthCheckStatus.Warning;
    }

    if (this.value.children.some((x) => x.value.status === HealthCheckStatus.Inconclusive)) {
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
