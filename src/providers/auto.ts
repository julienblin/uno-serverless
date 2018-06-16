import { ProviderAdapter } from "../core/builder";
import { awsLambdaAdapter } from "./aws";

export type AdapterDetection = Record<string, () => ProviderAdapter>;

const defaultDetection: AdapterDetection = {
  AWS_EXECUTION_ENV: awsLambdaAdapter,
  IS_OFFLINE: awsLambdaAdapter, // serverless-offline plugin
};

/**
 * Detects environment and return the most probable adapter, based on the presence
 * of process.env variables.
 */
export const autoAdapter = (detection: AdapterDetection = defaultDetection): ProviderAdapter => {
  Object.keys(detection).forEach((potential) => {
    if (process.env[potential]) {
      return detection[potential];
    }
  });

  throw new Error("Unable to detect appropriate provider adapter based on configuration.");
};
