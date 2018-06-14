import * as NodeCache from "node-cache";

/** Defines an interface for a cache system. */
export interface Cache {
  delete(key: string): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  getOrFetch<T>(key: string, fetch: () => Promise<T>, useCache?: boolean, ttl?: number): Promise<T>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

/** Options for InMemoryCache */
export interface InMemoryCacheOptions {
  /** The default TTL in seconds. Set to 0 to disable cache. */
  defaultTtl: number | Promise<number>;
  /** If true you'll get a copy of the cached variable. If false you'll save and get just the reference. */
  useClones?: boolean;
}

/** In-memory implementation of ICache */
export class InMemoryCache implements Cache {

  /** The underlying NodeCache */
  private nodeCachePromise?: Promise<NodeCache>;

  public constructor(private readonly options: InMemoryCacheOptions) {}

  /** Deletes a specific key in the cache. */
  public async delete(key: string) {
    (await this.getNodeCache()).del(key);
  }

  /** Gets an item from the cache. */
  public async get<T>(key: string) {
    return (await this.getNodeCache()).get<T>(key);
  }

  /** Get a value from the cache or execute and cache value if not found. */
  public async getOrFetch<T>(key: string, fetch: () => Promise<T>, useCache = true, ttl?: number) {
    const nodeCache = await this.getNodeCache();

    if (useCache) {
      const cachedValue = nodeCache.get(key) as T;
      if (cachedValue !== undefined) { return cachedValue; }
    }

    const value = await fetch();
    if (ttl) {
      nodeCache.set(key, value, ttl);
    } else {
      nodeCache.set(key, value);
    }

    return value;
  }

  /** Set a value associated with a key. */
  public async set<T>(key: string, value: T, ttl?: number) {
    if (ttl) {
      (await this.getNodeCache()).set(key, value, ttl);
    } else {
      (await this.getNodeCache()).set(key, value);
    }
  }

  private async getNodeCache() {
    if (!this.nodeCachePromise) {
      this.nodeCachePromise = this.buildNodeCache();
    }

    return this.nodeCachePromise;
  }

  private async buildNodeCache() {
    const ttl = this.options.defaultTtl ? await this.options.defaultTtl : undefined;

    return new NodeCache({
      stdTTL: ttl,
      useClones: this.options.useClones,
    });
  }
}
