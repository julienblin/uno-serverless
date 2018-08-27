import { BlobService, common, createBlobService } from "azure-storage";
import * as uno from "uno-serverless";
import { ContinuationArray, decodeNextToken, encodeNextToken, ListOptions, ListResult } from "uno-serverless";

export interface BlobStorageKeyValueRepositoryOptionsWithService {
  /** The Storage blob service instance */
  blobService: BlobService;
}

export interface BlobStorageKeyValueRepositoryOptionsWithConnectionString {
  /** The Storage connection string */
  connectionString: string | Promise<string>;
}

export interface BlobStorageKeyValueRepositoryCommonOptions {
  /** Blob storage container name. */
  container: string | Promise<string>;

  /** The content type for the files. */
  contentType?: string;

  /** Base path to use for all blobs. */
  path?: string;

  /** Custom deserializer. */
  deserialize?<T>(text: string): T;

  /** Custom serializer. */
  serialize?<T>(value: T): string;
}

/**
 * Options for BlobStorageCache.
 */
export type BlobStorageKeyValueRepositoryOptions =
  (BlobStorageKeyValueRepositoryOptionsWithService | BlobStorageKeyValueRepositoryOptionsWithConnectionString)
  & BlobStorageKeyValueRepositoryCommonOptions;

export class BlobStorageKeyValueRepository implements uno.KeyValueRepository, uno.CheckHealth {

  private readonly options: BlobStorageKeyValueRepositoryOptions;
  private readonly blobService = uno.lazyAsync(() => this.buildBlobService());

  public constructor(options: BlobStorageKeyValueRepositoryOptions) {
    this.options = {
      blobService: (options as any).blobService,
      connectionString: (options as any).connectionString,
      container: options.container,
      contentType: options.contentType || "application/json",
      deserialize: options.deserialize || (<T>(text: string) => JSON.parse(text)),
      path: options.path,
      serialize: options.serialize || (<T>(value: T) => JSON.stringify(value)),
    };
  }

  public async checkHealth() {
    return uno.checkHealth(
      "BlobStorageKeyValueRepository",
      `${await this.options.container}${this.options.path ? "/" + this.options.path : ""}`,
      async () => this.createContainerIfNotExists());
  }

  public async clear(): Promise<void> {
    let nextToken: string | undefined;
    do {
      const results = await this.listBlobs();
      nextToken = results.nextToken;
      for (const result of results.items) {
        await this.delete(result);
      }
    } while (nextToken);
  }

  public async delete(key: string): Promise<void> {
    const svc = await this.blobService();
    const container = await this.options.container;
    return new Promise<void>((resolve, reject) => {
      svc.deleteBlobIfExists(
        container,
        this.getKey(key),
        (err) => {
          if (err) {
            return reject(err);
          }

          return resolve(err);
        });
    });
  }

  public async get<T>(key: string): Promise<T | undefined> {
    const svc = await this.blobService();
    const container = await this.options.container;
    return new Promise<T | undefined>((resolve, reject) => {
      svc.getBlobToText(
        container,
        this.getKey(key),
        (err, text, result, response) => {
          if (response && response.statusCode === uno.HttpStatusCodes.NOT_FOUND) {
            return resolve(undefined);
          }

          if (err) {
            return reject(err);
          }

          if (!text) {
            return resolve(undefined);
          }

          try {
            const deserialized = this.options.deserialize!<T>(text);
            return resolve(deserialized);
          } catch (dezerializationError) {
            return reject(dezerializationError);
          }
        });
    });
  }

  public async list<T>(options: ListOptions = {}): Promise<ContinuationArray<ListResult<T>>> {
    const results = await this.listBlobs(options);
    const allItems = await Promise.all(results.items.map((x) => this.get<T>(x)));

    return {
      items: results.items.map((x, index) => ({
        id: x,
        item: allItems[index]!,
      })),
      nextToken: results.nextToken,
    };
  }

  public async set<T>(key: string, value: T): Promise<void> {
    const svc = await this.blobService();
    const container = await this.options.container;
    return new Promise<void>((resolve, reject) => {
      svc.createBlockBlobFromText(
        container,
        this.getKey(key),
        this.options.serialize!(value),
        {
          contentSettings: {
            contentType: this.options.contentType!,
          },
        },
        (err) => {
          if (err) {
            return reject(err);
          }

          return resolve();
        });
    });
  }

  public async createContainerIfNotExists() {
    const svc = await this.blobService();
    const container = await this.options.container;
    return new Promise<void>((resolve, reject) => {
      svc.createContainerIfNotExists(container, (err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }

  private getKey(key: string) { return `${this.options.path ? `${this.options.path}/` : ""}${key}`; }

  private async listBlobs(options: uno.ListOptions = {}): Promise<ContinuationArray<string>> {
    const continuationToken = decodeNextToken<common.ContinuationToken>(options.nextToken);
    const svc = await this.blobService();
    const container = await this.options.container;
    return new Promise<ContinuationArray<string>>((resolve, reject) => {
      if (options.prefix) {
        svc.listBlobsSegmentedWithPrefix(
          container,
          options.prefix,
          continuationToken as any,
          { maxResults: options.max },
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                items: result.entries.map((x) => x.name),
                nextToken: encodeNextToken(result.continuationToken),
              });
            }
          });
      } else {
        svc.listBlobsSegmented(
          container,
          continuationToken as any,
          { maxResults: options.max },
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                items: result.entries.map((x) => x.name),
                nextToken: encodeNextToken(result.continuationToken),
              });
            }
          });
      }
    });
  }

  private async buildBlobService(): Promise<BlobService> {
    if ((this.options as any).blobService) {
      return (this.options as any).blobService;
    }

    return createBlobService(await (this.options as any).connectionString);
  }
}
