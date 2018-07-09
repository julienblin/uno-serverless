import { BlobService, createBlobService } from "azure-storage";
import * as HttpStatusCodes from "http-status-codes";
import { checkHealth, CheckHealth, KeyValueRepository, lazyAsync, randomStr } from "uno-serverless";

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

export class BlobStorageKeyValueRepository implements KeyValueRepository, CheckHealth {

  private readonly options: BlobStorageKeyValueRepositoryOptions;
  private readonly blobService = lazyAsync(() => this.buildBlobService());

  public constructor(options: BlobStorageKeyValueRepositoryOptions) {
    this.options = {
      blobService: (options as any).blobService,
      connectionString: (options as any).connectionString,
      container: options.container,
      contentType: options.contentType || "application/json",
      deserialize: options.deserialize || (<T>(text: string) => JSON.parse(text)),
      serialize: options.serialize || (<T>(value: T) => JSON.stringify(value)),
    };
  }

  public async checkHealth() {
    return checkHealth(
      "BlobStorageKeyValueRepository",
      `${await this.options.container}/${this.options.path}`,
      async () => {
        await this.createContainerIfNotExists();
        const testKey = randomStr();
        await this.set(testKey, { testKey });
        await this.delete(testKey);
      });
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
          if (response && response.statusCode === HttpStatusCodes.NOT_FOUND) {
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

  private getKey(key: string) { return `${this.options.path ? `${this.options.path}/` : "" }${key}`; }

  private async buildBlobService(): Promise<BlobService> {
    if ((this.options as any).blobService) {
      return (this.options as any).blobService;
    }

    return createBlobService(await (this.options as any).connectionString);
  }
}
