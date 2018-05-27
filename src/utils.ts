
import * as stringify from "json-stringify-safe";

// tslint:disable:no-magic-numbers

/**
 * Converts the result of process.hrtime into milliseconds.
 */
export const convertHrtimeToMs = (hrtime: [number, number]) => Math.ceil((((hrtime[0] * 1e9) + hrtime[1]) / 1e6));

/** List of properties that are blacklisted in the confidentialityReplacer.  */
export const DEFAULT_CONFIDENTIALITY_BLACKLIST = new Set([
  "authorization",
  "key",
  "password",
  "secret",
]);

/** The default value for createConfidentialityReplace.replaceBy */
export const DEFAULT_CONFIDENTIALITY_REPLACE_BY = "******";

/**
 * Creates a JSON.stringify replacer function to mask specific property values
 * (for sensitive password and authorizations, for example)
 * @param blacklist - The list of property names to blacklist.
 * @param replaceBy - The value to replace it with.
 */
export const createConfidentialityReplacer =
  (blacklist: Set<string> = DEFAULT_CONFIDENTIALITY_BLACKLIST, replaceBy: any = DEFAULT_CONFIDENTIALITY_REPLACE_BY) =>
    (key: string, value: {}) => blacklist.has(key.toLowerCase()) ? replaceBy : value;

/** Singleton default confidentiality replacer. */
export const defaultConfidentialityReplacer = createConfidentialityReplacer();

/** Safe JSON.stringify */
export const safeJSONStringify = stringify;

/** Very simple memoization function. */
export const memoize = <T>(func: () => T) => {
  let cache: T | undefined;

  return () => {
    if (!cache) {
      cache = func();
    }

    return cache;
  };
};
