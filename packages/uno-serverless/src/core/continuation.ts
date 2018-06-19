import * as base58 from "base-58";
import { decode, encode } from "msgpack-lite";

export interface WithContinuation {
  /** The next continuation token. */
  nextToken?: string;
}

export interface ContinuationArray<T> extends WithContinuation {
  items: T[];
}

export const encodeNextToken = <T extends object>(value?: T): string | undefined => {
  if (!value) {
    return undefined;
  }

  return base58.encode(Buffer.from(encode(value)));
};

export const decodeNextToken = <T extends object>(nextToken?: string): T | undefined => {
  if (!nextToken) {
    return undefined;
  }

  return decode(base58.decode(nextToken)) as T;
};
