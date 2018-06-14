import { S3 } from "aws-sdk";
import * as HttpStatusCodes from "http-status-codes";
import { randomStr } from "../../core/utils";
import { Cache } from "../cache";
import { checkHealth, CheckHealth } from "../health-check";
import { S3Client } from "./s3-client";

/** Options fro S3Cache */
export interface S3CacheOptions {
  /** S3 bucket name. */
  bucket: string | Promise<string>;

  /** The content type for the files. */
  contentType?: string;

  /** Base path to use in the bucket. */
  path?: string;

  /** S3 client to use. */
  s3?: S3Client;

  /** The server side encryption to use */
  serverSideEncryption?: string;

  /** Custom deserializer. */
  deserialize?<T>(text: string): CacheItem<T>;

  /** Custom serializer. */
  serialize?<T>(value: CacheItem<T>): string;
}

/**
 * Cache that uses S3 as a backing store.
 */
export class S3Cache implements Cache, CheckHealth {

  /** Options resolved with default values. */
  private readonly options: Required<S3CacheOptions>;

  public constructor(
    {
      bucket,
      contentType = "application/json",
      path = "",
      s3 = new S3({ maxRetries: 3 }),
      serverSideEncryption = "",
      deserialize = <T>(text: string) => JSON.parse(text),
      serialize = <T>(value: T) => JSON.stringify(value),
    }: S3CacheOptions) {
    this.options = {
      bucket,
      contentType,
      deserialize,
      path: path.endsWith("/") ? path.slice(0, -1) : path,
      s3,
      serialize,
      serverSideEncryption,
    };
  }

  public async checkHealth() {
    return checkHealth(
      "S3CacheOptions",
      `${await this.options.bucket}/${this.options.path}`,
      async () => {
        const testKey = randomStr();
        await this.set(testKey, { testKey });
        await this.delete(testKey);
      });
  }

  /** Delete the value associated with the key */
  public async delete(key: string): Promise<void> {
    await this.options.s3.deleteObject({
      Bucket: await this.options.bucket,
      Key: this.getKey(key),
    }).promise();
  }

  /** Get the value associated with the key */
  public async get<T>(key: string): Promise<T | undefined> {
    try {
      const response = await this.options.s3.getObject({
        Bucket: await this.options.bucket,
        Key: this.getKey(key),
      }).promise();
      if (!response.Body) {
        return undefined;
      }

      const cacheItem = this.options.deserialize<T>(response.Body.toString());
      if (cacheItem.expiresAt && cacheItem.expiresAt < (new Date().getTime() / 1000)) {
        await this.delete(key);
        return undefined;
      }

      return cacheItem.item;

    } catch (error) {
      if (error.statusCode === HttpStatusCodes.NOT_FOUND) {
        return undefined;
      }

      throw error;
    }
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

  /** Set the value associated with the key */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const item: CacheItem<T> = {
      expiresAt: ttl ? (new Date().getTime() / 1000) + ttl : undefined,
      item: value,
    };
    await this.options.s3.putObject({
      Body: this.options.serialize(item),
      Bucket: await this.options.bucket,
      ContentType: this.options.contentType,
      Key: this.getKey(key),
      ServerSideEncryption: this.options.serverSideEncryption ? this.options.serverSideEncryption : undefined,
    }).promise();
  }

  /** Computes the path + key. */
  private getKey(key: string) { return `${this.options.path}/${key}`; }
}

export interface CacheItem<T> {
  expiresAt?: number;
  item: T;
}
