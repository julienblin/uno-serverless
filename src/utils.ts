
// tslint:disable:no-magic-numbers

/**
 * Converts the result of process.hrtime into milliseconds.
 */
export const convertHrtimeToMs = (hrtime: [number, number]) => (((hrtime[0] * 1e9) + hrtime[1]) / 1e6);
