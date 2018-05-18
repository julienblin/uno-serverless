// tslint:disable-next-line:no-implicit-dependencies
import { APIGatewayProxyResult } from "aws-lambda";
import * as HttpStatusCodes from "http-status-codes";
import { APIGatewayProxyResultProvider } from "./results";
import { convertHrtimeToMs } from "./utils";

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
    public readonly name: string,
    public target: string | undefined,
    public readonly elapsed: number,
    public readonly status: HealthCheckStatus = HealthCheckStatus.Inconclusive,
    public readonly error?: {},
    public readonly children?: HealthCheckResult[]) {
    if (this.children && this.children.length > 0) {
      this.status = this.evaluateChildrenStatuses();
    }
  }

  public getAPIGatewayProxyResult(): APIGatewayProxyResult {
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
      body: JSON.stringify(this),
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

    return new HealthCheckResult(
      name,
      target,
      convertHrtimeToMs(process.hrtime(start)),
      HealthCheckStatus.Ok);
  } catch (error) {
    // tslint:disable:no-unsafe-any
    return new HealthCheckResult(
      name,
      target,
      convertHrtimeToMs(process.hrtime(start)),
      HealthCheckStatus.Error,
      error);
    // tslint:enable:no-unsafe-any
  }
};

/** Options for the HealthService */
export interface IHealthServiceOptions {
  includeTargets: boolean;
  name: string;
}

/** Performs and aggregates checks for a set of ICheckHealth. */
// tslint:disable-next-line:max-classes-per-file
export class HealthChecker implements ICheckHealth {

  public constructor(
    private readonly options: IHealthServiceOptions,
    private readonly checks: ICheckHealth[]) {
  }

  /** Performs health checks. */
  public async checkHealth(): Promise<HealthCheckResult> {
    const start = new Date().getTime();
    try {
      const children = await Promise.all(this.checks.map(async (x) => x.checkHealth()));

      if (!this.options.includeTargets) {
        children.forEach((child) => { delete child.target; });
      }

      return new HealthCheckResult(
        this.options.name,
        undefined,
        new Date().getTime() - start,
        undefined,
        undefined,
        children);
    } catch (error) {
      return new HealthCheckResult(
        // tslint:disable:no-unsafe-any
        this.options.name,
        undefined,
        new Date().getTime() - start,
        HealthCheckStatus.Error,
        error);
        // tslint:enable:no-unsafe-any
    }
  }
}
