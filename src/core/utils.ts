
import { randomBytes } from "crypto";
import * as stringify from "json-stringify-safe";

/**
 * Converts the result of process.hrtime into milliseconds.
 */
export const convertHrtimeToMs = (hrtime: [number, number]) => Math.ceil((((hrtime[0] * 1e9) + hrtime[1]) / 1e6));

/** List of properties prefixed that are blacklisted in the confidentialityReplacer.  */
export const DEFAULT_CONFIDENTIALITY_BLACKLIST = new Set([
  "_",
  "authorization",
  "password",
  "secret",
  "socket",
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
    (key: string, value: {}) => {
      const loweredCasedKey = key.toLowerCase();
      for (const blackListed of blacklist) {
        if (loweredCasedKey.startsWith(blackListed)) {
          return replaceBy;
        }
      }

      return value;
    };

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

/** Handler for proxy to support container method destructuring without losing the this context. */
const destructuringHandler = <T extends object>(target: any): ProxyHandler<T> => ({
  get: (proxyTarget, name, receiver) =>
    (...args) =>
      Reflect
      .get(proxyTarget, name, receiver)
      .apply(target, args),
});

/** Wraps target behind a proxy to support ES destructuring for methods. */
export const supportDestructuring = <T extends object>(target: T): T =>
  new Proxy(target, destructuringHandler(target));

/** Generates a random string of a given length using crypto.randomBytes. */
export const randomStr = (length = 12) => randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
