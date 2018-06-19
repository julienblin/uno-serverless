import { BlobService, common, createBlobService } from "azure-storage";
import * as HttpStatusCodes from "http-status-codes";
import {
  Cache, checkHealth, CheckHealth, ContinuationArray,
  decodeNextToken, encodeNextToken, randomStr } from "uno-serverless";

export interface BlobStorageCacheOptionsWithService {
  /** The Storage blob service instance */
  blobService: BlobService;
}

export interface BlobStorageCacheOptionsWithConnectionString {
  /** The Storage connection string */
  connectionString: string | Promise<string>;
}

export interface BlobStorageCacheCommonOptions {
  /** Blob storage container name. */
  container: string | Promise<string>;

  /** The content type for the files. */
  contentType?: string;

  /** Base path to use for all blobs. */
  path?: string;

  /** Custom deserializer. */
  deserialize?<T>(text: string): CacheItem<T>;

  /** Custom serializer. */
  serialize?<T>(value: CacheItem<T>): string;
}

/**
 * Options for BlobStorageCache.
 */
export type BlobStorageCacheOptions =
  (BlobStorageCacheOptionsWithService | BlobStorageCacheOptionsWithConnectionString) & BlobStorageCacheCommonOptions;

/**
 * Cache implementation using Azure Blob Storage.
 */
export class BlobStorageCache implements Cache, CheckHealth {

  private readonly options: BlobStorageCacheOptions;
  private readonly blobService: Promise<BlobService>;

  public constructor(options: BlobStorageCacheOptions) {
    this.options = {
      blobService: (options as any).blobService,
      connectionString: (options as any).connectionString,
      container: options.container,
      contentType: options.contentType || "application/json",
      deserialize: options.deserialize || (<T>(text: string) => JSON.parse(text)),
      serialize: options.serialize || (<T>(value: T) => JSON.stringify(value)),
    };
    this.blobService = this.buildBlobService();
  }

  public async checkHealth() {
    return checkHealth(
      "BlobStorageCache",
      `${await this.options.container}/${this.options.path}`,
      async () => {
        const testKey = randomStr();
        await this.set(testKey, { testKey });
        await this.delete(testKey);
      });
  }

  public async delete(key: string): Promise<void> {
    const svc = await this.blobService;
    const container = await this.options.container;
    return new Promise<void>((resolve, reject) => {
      svc.deleteBlobIfExists(
        container,
        this.getKey(key),
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(err);
          }
        });
    });
  }

  public async get<T>(key: string): Promise<T | undefined> {
    const svc = await this.blobService;
    const container = await this.options.container;
    return new Promise<T | undefined>((resolve, reject) => {
      svc.getBlobToText(
        container,
        this.getKey(key),
        (err, text, result, response) => {
          if (response && response.statusCode === HttpStatusCodes.NOT_FOUND) {
            resolve(undefined); return;
          }

          if (err) {
            reject(err); return;
          }

          if (!text) {
            resolve(undefined); return;
          }

          const cacheItem = this.options.deserialize!<T>(text);
          if (cacheItem.expiresAt && cacheItem.expiresAt < (new Date().getTime() / 1000)) {
            // TODO: Manage pruning.
            // await this.delete(key);
            return undefined;
          }

          resolve(cacheItem.item); return;
        });
    });
  }

  public async getOrFetch<T>(key: string, fetch: () => Promise<T>, useCache = true, ttl?: number): Promise<T> {
    if (ttl === 0) {
      return fetch();
    }

    if (useCache) {
      const cachedValue = await this.get<T>(key);
      if (cachedValue !== undefined) { return cachedValue; }
    }

    const value = await fetch();
    await this.set(key, value, ttl);

    return value;
  }

  public async listKeys(nextToken?: string): Promise<ContinuationArray<string>> {
    const svc = await this.blobService;
    const container = await this.options.container;
    const path = await this.options.path;
    return new Promise<ContinuationArray<string>>((resolve, reject) => {
      svc.listBlobsSegmentedWithPrefix(
        container,
        path || "",
        decodeNextToken<common.ContinuationToken>(nextToken)!,
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(({
              items: res.entries.map((x) => x.name),
              nextToken: encodeNextToken(res.continuationToken),
            }));
          }
        });
    });
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const item: CacheItem<T> = {
      expiresAt: ttl ? (new Date().getTime() / 1000) + ttl : undefined,
      item: value,
    };

    const svc = await this.blobService;
    const container = await this.options.container;
    return new Promise<void>((resolve, reject) => {
      svc.createBlockBlobFromText(
        container,
        this.getKey(key),
        this.options.serialize!(item),
        {
          contentSettings: {
            contentType: this.options.contentType!,
          },
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
    });
  }

  /** Computes the path + key. */
  private getKey(key: string) { return `${this.options.path ? `${this.options.path}/` : "" }${key}`; }

  private async buildBlobService(): Promise<BlobService> {
    if ((this.options as any).blobService) {
      return (this.options as any).blobService;
    }

    return createBlobService(await (this.options as any).connectionString);
  }
}

export interface CacheItem<T> {
  expiresAt?: number;
  item: T;
}
