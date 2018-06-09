import { convertHrtimeToMs } from "../core/utils";

/** Possible statuses for health check results. */
export enum HealthCheckStatus {
  Inconclusive = "Inconclusive",
  Ok = "Ok",
  Warning = "Warning",
  Error = "Error",
}

export interface HealthCheckResult {
  children?: HealthCheckResult[];
  elapsed?: number;
  error?: any;
  name: string;
  status: HealthCheckStatus;
  target?: string;
}

export const isHealthCheckResult = (value: any): value is HealthCheckResult =>
  (typeof value === "object" &&  "name" in value && "status" in value);

export type HealthCheckRun = () => Promise<HealthCheckResult | any>;

const runCheck = async (
  name: string,
  target: string | undefined,
  check: HealthCheckRun): Promise<HealthCheckResult> => {
    const start = process.hrtime();
    try {
      const result = await check();
      if (isHealthCheckResult(result)) {
        return result;
      }

      return {
        elapsed: convertHrtimeToMs(process.hrtime(start)),
        name,
        status: HealthCheckStatus.Ok,
        target,
      };

    } catch (error) {
      return {
        elapsed: convertHrtimeToMs(process.hrtime(start)),
        error,
        name,
        status: HealthCheckStatus.Error,
        target,
      };
    }
  };

const evaluateStatus = (children: HealthCheckResult[]): HealthCheckStatus => {
  if (children.some((x) => x.status === HealthCheckStatus.Error)) {
    return HealthCheckStatus.Error;
  }

  if (children.some((x) => x.status === HealthCheckStatus.Warning)) {
    return HealthCheckStatus.Warning;
  }

  if (children.some((x) => x.status === HealthCheckStatus.Inconclusive)) {
    return HealthCheckStatus.Inconclusive;
  }

  return HealthCheckStatus.Ok;
};

export const checkHealth =
  async (
    name: string,
    target: string | undefined,
    checks: HealthCheckRun | HealthCheckRun[]): Promise<HealthCheckResult> => {
    if (!Array.isArray(checks)) {
      return await runCheck(name, target, checks);
    }

    const start = process.hrtime();
    try {
      const children = await Promise.all(checks.map(async (x) => runCheck(name, target, x)));
      return {
        children,
        elapsed: convertHrtimeToMs(process.hrtime(start)),
        name,
        status: evaluateStatus(children),
        target,
      };
    } catch (error) {
      return {
        elapsed: convertHrtimeToMs(process.hrtime(start)),
        error,
        name,
        status: HealthCheckStatus.Error,
        target,
      };
    }
};
