import { randomBytes } from "crypto";
import * as stringify from "json-stringify-safe";
import * as ms from "ms";

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

/** Allows lazy async initialization (the builder will only be called once). */
export const lazyAsync = <T>(builder: () => Promise<T>) => {
  let instancePromise: Promise<T> | undefined;

  return () => {
    if (!instancePromise) {
      instancePromise = builder();
    }

    return instancePromise;
  };
};

/**
 * Parses a string and returns a duration (e.g. '1 d', '1 h', etc.).
 * Uses the ms package under the cover, please refer to
 * https://github.com/zeit/ms for more info on formats.
 */
export function duration(value: string): number;
export function duration(value: string | undefined): number | undefined;
export function duration(value: Promise<string>): Promise<number>;
export function duration(value: Promise<string | undefined>): Promise<number | undefined>;
export function duration(value: any): any {
  if (!value) {
    return undefined;
  }

  if (typeof value.then === "function") {
    return value.then((x) => duration(x));
  }

  return ms(value);
}

/**
 * Converts an array of objects to a Record.
 */
export function toRecord<T extends { id: string, [x: string]: any }>(values: T[]): Record<string, T>;
export function toRecord<T extends { id: string, [x: string]: any }, U>(
  values: T[],
  valueFunc: (x: T) => U): Record<string, U>;
export function toRecord<U>(
  values: string[],
  valueFunc: (x: string) => U): Record<string, U>;
export function toRecord<T, U>(
  values: T[],
  valueFunc: (x: T) => U,
  idFunc: (x: T) => string): Record<string, U>;
export function toRecord(
  values: any[],
  valueFunc: (x) => any = (x) => x,
  idFunc: (x) => string = (x) => x.id ? x.id : x.toString()): any {
  return values.reduce(
    (acc, cur) => {
      acc[idFunc(cur)] = valueFunc(cur);
      return acc;
    },
    {});
}
