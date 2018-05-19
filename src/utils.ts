
// tslint:disable:no-magic-numbers

/**
 * Converts the result of process.hrtime into milliseconds.
 */
export const convertHrtimeToMs = (hrtime: [number, number]) => Math.ceil((((hrtime[0] * 1e9) + hrtime[1]) / 1e6));

/** List of properties that are blacklisted in the confidentialityReplacer.  */
export const DEFAULT_CONFIDENTIALITY_BLACKLIST = [
  "authorization",
  "password",
];

/** The default value for createConfidentialityReplace.replaceBy */
export const DEFAULT_CONFIDENTIALITY_REPLACEBY = "******";

/**
 * Creates a JSON.stringify replacer function to mask specific property values
 * (for sensitive password and authorizations, for example)
 * @param blacklist - The list of property names to blacklist.
 * @param replaceBy - The value to replace it with.
 */
export const createConfidentialityReplacer =
  (blacklist: string[] = DEFAULT_CONFIDENTIALITY_BLACKLIST, replaceBy: any = DEFAULT_CONFIDENTIALITY_REPLACEBY) =>
    (key: string, value: {}) =>
    blacklist.indexOf(key.toLowerCase()) !== -1
      ? replaceBy
      : value;

/** Singleton default confidentiality replacer. */
export const defaultConfidentialityReplacer = createConfidentialityReplacer();

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
