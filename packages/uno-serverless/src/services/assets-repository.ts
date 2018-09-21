import * as computeEtag from "etag";
import * as fs from "fs-extra";
import { tmpdir } from "os";
import { dirname, join } from "path";
import * as streamToPromise from "stream-to-promise";
import { randomStr } from "../core/utils";
import { checkHealth, CheckHealth } from "./health-check";

export interface AssetMetadata {
  etag?: string;
  mediaType?: string;
  path: string;
}

export interface Asset extends AssetMetadata {
  data: Buffer;
}

export interface SetAssetRequest {
  path: string;
  source: Buffer | NodeJS.ReadableStream;
  mediaType: string;
}

/**
 * Allows manipulation of assets data (e.g. binaries, images, etc.)
 */
export interface AssetsRepository {
  delete(path: string): Promise<void>;
  exists(path: string): Promise<AssetMetadata | undefined>;
  get(path: string): Promise<Asset | undefined>;
  list(prefix: string): Promise<string[]>;
  set(request: SetAssetRequest): Promise<AssetMetadata>;
}

/**
 * AssetsRepository in-memory implementation.
 * Useful for unit-testing.
 */
export class InMemoryAssetsRepository implements AssetsRepository, CheckHealth {

  /** The storage. */
  private readonly storage = new Map<string, Asset>();

  public async clear() {
    this.storage.clear();
  }

  public async checkHealth() {
    return checkHealth(
      "InMemoryAssetsRepository",
      "in-memory",
      async () => ({}));
  }

  public async delete(path: string): Promise<void> {
    this.storage.delete(path);
  }

  public async exists(path: string): Promise<AssetMetadata | undefined> {
    const item = this.storage.get(path);
    if (!item) {
      return undefined;
    }

    const { data, ...metadata } = item;
    return metadata;
  }

  public async get(path: string): Promise<Asset | undefined> {
    return this.storage.get(path);
  }

  public async list(prefix: string): Promise<string[]> {
    const result: string[] = [];
    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        result.push(key);
      }
    }
    return result;
  }

  public async set(request: SetAssetRequest): Promise<AssetMetadata> {
    const data: Buffer = Buffer.isBuffer(request.source)
      ? request.source
      : await streamToPromise(request.source);

    const metadata: AssetMetadata = {
      etag: computeEtag(data),
      mediaType: request.mediaType,
      path: request.path,
    };

    this.storage.set(
      request.path,
      {
        data,
        ...metadata,
      });

    return metadata;
  }
}

/**
 * Options for FileKeyValueRepository.
 */
export interface FileKeyValueRepositoryOptions {
  /** Base path for storing files */
  path?: string;
}

/**
 * AssetsRepository file-based implementation.
 * Useful for unit-testing.
 */
export class FileAssetsRepository implements AssetsRepository, CheckHealth {

  private readonly options: Required<FileKeyValueRepositoryOptions>;

  public constructor({
    path = join(tmpdir(), encodeURIComponent(randomStr(8))),
  }: FileKeyValueRepositoryOptions = {}) {
    this.options = {
      path,
    };
  }

  public async checkHealth() {
    return checkHealth(
      "FileAssetsRepository",
      this.options.path,
      async () => {
        const testPath = randomStr();
        await this.set({ path: testPath, source: new Buffer(randomStr()), mediaType: "application/octet-stream" });
        await this.delete(testPath);
      });
  }

  public async clear(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.exists(this.options.path, (exists) => {
        if (!exists) {
          resolve();
        } else {
          fs.remove(this.options.path, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });
  }

  public async delete(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.exists(this.filePath(path), (fileExists) => {
        if (fileExists) {
          fs.unlink(this.filePath(path), (unlinkErr) => {
            if (unlinkErr) {
              reject(unlinkErr);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  }

  public async exists(path: string): Promise<AssetMetadata | undefined> {
    return new Promise<AssetMetadata | undefined>((resolve) => {
      fs.exists(this.filePath(path), (fileExists) => {
        resolve(fileExists ? { path } : undefined);
      });
    });
  }

  public async get(path: string): Promise<Asset | undefined> {
    return new Promise<Asset | undefined>((resolve, reject) => {
      fs.exists(this.filePath(path), (fileExists) => {
        if (!fileExists) {
          resolve(undefined);
        } else {
          fs.readFile(this.filePath(path), (fileReadError, data) => {
            if (fileReadError) {
              reject(fileReadError);
            } else {
              resolve({
                data,
                path,
              });
            }
          });
        }
      });
    });
  }

  public async list(prefix: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(this.filePath(prefix), (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files.map((x) => join(prefix, x).replace(/\\/g, "/")));
        }
      });
    });
  }

  public async set(request: SetAssetRequest): Promise<AssetMetadata> {
    await new Promise((resolve, reject) => {
      fs.ensureDir(dirname(this.filePath(request.path)), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return new Promise<AssetMetadata>((resolve, reject) => {
      const metadata: AssetMetadata = {
        path: request.path,
      };

      const filePath = this.filePath(request.path);
      if (Buffer.isBuffer(request.source)) {
        fs.writeFile(filePath, request.source, (writeFileError) => {
          if (writeFileError) {
            reject(writeFileError);
          } else {
            resolve(metadata);
          }
        });
      } else {
        request.source.on("error", (err) => reject(err));
        const writableStream = fs.createWriteStream(filePath);
        writableStream.on("error", (err) => reject(err));

        request.source.pipe(writableStream);
        writableStream.on("close", () => {
          resolve(metadata);
        });
      }
    });
  }

  private readonly filePath = (path: string) => join(this.options.path, path);

}
