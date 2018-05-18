// tslint:disable-next-line:no-implicit-dependencies
import { APIGatewayProxyResult } from "aws-lambda";
import * as HttpStatusCodes from "http-status-codes";
import { APIGatewayProxyResultProvider } from "./results";

/** Result of a health check. */
export class HealthCheckResult implements APIGatewayProxyResultProvider {

  public constructor(
    public readonly name: string,
    public target: string | undefined,
    public readonly elapsed: number,
    public readonly status: HealthCheckStatus = "Inconclusive",
    public readonly error?: {},
    public readonly children?: HealthCheckResult[]) {
    if (this.children && this.children.length > 0) {
      this.status = this.evaluateChildrenStatuses();
    }
  }

  public getAPIGatewayProxyResult(): APIGatewayProxyResult {
    let statusCode: number;

    switch (this.status) {
      case "Error":
        statusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR;
        break;
      case "Warning":
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
      return "Inconclusive";
    }

    if (this.children.some((x) => x.status === "Error")) {
      return "Error";
    }

    if (this.children.some((x) => x.status === "Warning")) {
      return "Warning";
    }

    if (this.children.some((x) => x.status === "Inconclusive")) {
      return "Inconclusive";
    }

    return "Ok";
  }
}

export type HealthCheckStatus = "Inconclusive" | "Ok" | "Warning" | "Error";

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
  const start = new Date().getTime();
  try {
    await check();

    return new HealthCheckResult(
      name,
      target,
      new Date().getTime() - start,
      "Ok");
  } catch (error) {
    // tslint:disable:no-unsafe-any
    return new HealthCheckResult(
      name,
      target,
      new Date().getTime() - start,
      "Error",
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
        "Error",
        error);
        // tslint:enable:no-unsafe-any
    }
  }
}
