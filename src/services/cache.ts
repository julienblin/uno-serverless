import * as NodeCache from "node-cache";

/** Defines an interface for a cache system. */
export interface Cache {
  delete(key: string);
  get<T>(key: string): T | undefined;
  getOrFetch<T>(key: string, fetch: () => Promise<T>, useCache?: boolean, ttl?: number): Promise<T>;
  set<T>(key: string, value: T, ttl?: number);
}

/** Options for InMemoryCache */
export interface InMemoryCacheOptions {
  /** The default TTL in seconds. Set to 0 to disable cache. */
  defaultTtl: number;
  /** If true you'll get a copy of the cached variable. If false you'll save and get just the reference. */
  useClones?: boolean;
}

/** In-memory implementation of ICache */
export class InMemoryCache implements Cache {

  /** The underlying NodeCache */
  private readonly nodeCache?: NodeCache;

  public constructor(private readonly options: InMemoryCacheOptions) {
    if (this.options.defaultTtl > 0) {
      this.nodeCache = new NodeCache({
        stdTTL: this.options.defaultTtl,
        useClones: this.options.useClones,
      });
    }
  }

  /** Deletes a specific key in the cache. */
  public delete(key: string) {
    if (!this.nodeCache) { return; }
    this.nodeCache.del(key);
  }

  /** Gets an item from the cache. */
  public get<T>(key: string): T | undefined {
    if (!this.nodeCache) { return undefined; }

    return this.nodeCache.get(key);
  }

  /** Get a value from the cache or execute and cache value if not found. */
  public async getOrFetch<T>(key: string, fetch: () => Promise<T>, useCache = true, ttl?: number): Promise<T> {
    if (!this.nodeCache) {
      return fetch();
    }

    if (useCache) {
      const cachedValue = this.nodeCache.get(key) as T;
      if (cachedValue !== undefined) { return cachedValue; }
    }

    const value = await fetch();
    this.nodeCache.set(key, value, ttl ? ttl : this.options.defaultTtl);

    return value;
  }

  /** Set a value associated with a key. */
  public set<T>(key: string, value: T, ttl?: number) {
    if (!this.nodeCache) { return; }
    this.nodeCache.set(key, value, ttl ? ttl : this.options.defaultTtl);
  }
}
