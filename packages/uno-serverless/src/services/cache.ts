import * as base58 from "base-58";
import { encode } from "msgpack-lite";
import { ContinuationArray } from "../core";

/** Defines an interface for a cache system. */
export interface Cache {
  delete(key: string): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  getOrFetch<T>(key: string, fetch: () => Promise<T>, useCache?: boolean, ttl?: number): Promise<T>;
  listKeys(nextToken?: string): Promise<ContinuationArray<string>>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

/** Options for InMemoryCache */
export interface InMemoryCacheOptions {
  /** The default TTL in seconds. Set to 0 to disable cache. */
  defaultTtl: number | Promise<number>;
}

interface CacheItem {
  item: any;
  expiresAt?: number;
}

/** In-memory implementation of ICache */
export class InMemoryCache implements Cache {

  private readonly cache: Record<string, CacheItem> = {};

  public constructor(private readonly options: InMemoryCacheOptions) {}

  /** Deletes a specific key in the cache. */
  public async delete(key: string) {
    delete this.cache[key];
  }

  /** Gets an item from the cache. */
  public async get<T>(key: string) {
    const item = this.cache[key];
    if (!item) {
      return undefined;
    }
    if (item.expiresAt && item.expiresAt < new Date().getTime()) {
      delete this.cache[key];
      return undefined;
    }

    return item.item as T;
  }

  /** Get a value from the cache or execute and cache value if not found. */
  public async getOrFetch<T>(key: string, fetch: () => Promise<T>, useCache = true, ttl?: number) {
    if (useCache) {
      const cachedValue = await this.get<T>(key);
      if (cachedValue !== undefined) { return cachedValue; }
    }

    const value = await fetch();
    if (ttl) {
      await this.set(key, value, ttl);
    } else {
      await this.set(key, value);
    }

    return value;
  }

  public async listKeys(): Promise<ContinuationArray<string>> {
    const now = new Date().getTime();
    return {
      items: Object.keys(this.cache)
        .map((key) => ({ key, value: this.cache[key] }))
        .filter((x) => x.value.expiresAt ? x.value.expiresAt > now : true)
        .map((x) => x.key),
    };
  }

  /** Set a value associated with a key. */
  public async set<T>(key: string, value: T, ttl?: number) {
    let expiresAt: number | undefined;
    if (ttl) {
      expiresAt = new Date().getTime() + ttl;
    } else {
      const defaultTtl = await this.options.defaultTtl;
      if (defaultTtl) {
        expiresAt = new Date().getTime() + defaultTtl;
      }
    }

    this.cache[key] = {
      expiresAt,
      item: value,
    };
  }
}

/** Creates a unique cache key based on a value object. */
export const createCacheKey = <T extends object>(value?: T, prefix = ""): string => {
  if (!value) {
    return prefix;
  }

  return `${prefix}${base58.encode(Buffer.from(encode(value)))}`;
};
