import * as fs from "fs";
import { tmpdir } from "os";
import { basename, join } from "path";
import { ContinuationArray, decodeNextToken, encodeNextToken, WithContinuation } from "../core/continuation";
import { randomStr } from "../core/utils";
import { checkHealth, CheckHealth } from "./health-check";

export interface ListOptions extends WithContinuation {
  max?: number;
  prefix?: string;
}

export interface ListResult<T> {
  id: string;
  item: T;
}

/** A repository to store and retrieve objects by keys. */
export interface KeyValueRepository {
  clear(): Promise<void>;
  delete(key: string): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  list<T>(options?: ListOptions): Promise<ContinuationArray<ListResult<T>>>;
  set<T>(key: string, value: T): Promise<void>;
}

/**
 * KeyValueRepository in-memory.
 * Useful for unit-testing.
 * Objects are serialized / deserialized to better catch error.
 */
export class InMemoryKeyValueRepository implements KeyValueRepository, CheckHealth {

  /** The storage. */
  private readonly storage = new Map<string, string>();

  public constructor(
    private readonly serialize: <T>(value: T) => string = JSON.stringify,
    private readonly deserialize: <T>(text: string) => T = JSON.parse) {}

  /** Clear the repository */
  public async clear() {
    this.storage.clear();
  }

  public async checkHealth() {
    return checkHealth(
      "InMemoryKeyValueRepository",
      "in-memory",
      async () => ({}));
  }

  /** Delete the value associated with the key */
  public async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /** Get the value associated with the key */
  public async get<T>(key: string): Promise<T | undefined> {
    const retrieved = this.storage.get(key);

    return retrieved
      ? this.deserialize(retrieved)
      : undefined;
  }

  public async list<T>(options: ListOptions = {}): Promise<ContinuationArray<ListResult<T>>> {
    let entries = [...this.storage.entries()];
    let offset = 0;

    if (options.nextToken) {
      const nextToken = decodeNextToken<{ max?: number; offset: number; prefix?: string }>(options.nextToken);
      if (nextToken) {
        offset = nextToken.offset;
        options.prefix = nextToken.prefix;
        options.max = nextToken.max;
      }
    }

    if (options.prefix) {
      entries = entries.filter((x) => x[0].startsWith(options.prefix!));
    }

    if (offset) {
      entries = entries.slice(offset);
    }

    const remainingCount = entries.length;
    if (options.max) {
      entries = entries.slice(0, options.max);
    }

    return {
      items: entries.map((x) => ({ id: x[0], item: this.deserialize(x[1]) as T })),
      nextToken: remainingCount !== entries.length
        ? encodeNextToken({ max: options.max, offset: offset + options.max!, prefix: options.prefix })
        : undefined,
    };
  }

  /** Set the value associated with the key */
  public async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, this.serialize(value));
  }

  /** Get the number of items. */
  public get size() {
    return this.storage.size;
  }
}

/**
 * Options for FileKeyValueRepository.
 */
export interface FileKeyValueRepositoryOptions {
  /** Base path for storing files */
  path?: string;

  /** Custom deserializer. */
  deserialize?<T>(text: string): T;

  /** Custom serializer. */
  serialize?<T>(value: T): string;
}

/**
 * KeyValueRepository implementation that uses a local file system.
 */
export class FileKeyValueRepository implements KeyValueRepository, CheckHealth {

  private readonly options: Required<FileKeyValueRepositoryOptions>;

  public constructor({
    path = join(tmpdir(), encodeURIComponent(randomStr(8))),
    deserialize = <T>(text: string) => JSON.parse(text),
    serialize = <T>(value: T) => JSON.stringify(value),
  }: FileKeyValueRepositoryOptions = {}) {
    this.options = {
      deserialize,
      path,
      serialize,
    };
  }

  public async checkHealth() {
    return checkHealth(
      "FileKeyValueRepository",
      this.options.path,
      async () => {
        const testKey = randomStr();
        await this.set(testKey, { testKey });
        await this.delete(testKey);
      });
  }

  public async clear(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.exists(this.options.path, (exists) => {
        if (!exists) {
          resolve();
        } else {
          fs.rmdir(this.options.path, (err) => {
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

  public async delete(key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.exists(this.filePath(key), (fileExists) => {
        if (fileExists) {
          fs.unlink(this.filePath(key), (unlinkErr) => {
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

  public async get<T>(key: string): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve, reject) => {
      fs.exists(this.filePath(key), (fileExists) => {
        if (!fileExists) {
          resolve(undefined);
        } else {
          fs.readFile(this.filePath(key), (fileReadError, data) => {
            if (fileReadError) {
              reject(fileReadError);
            } else {
              resolve(this.options.deserialize<T>(data.toString()));
            }
          });
        }
      });
    });
  }

  public async list<T>(options: ListOptions = {}): Promise<ContinuationArray<ListResult<T>>> {
    const ids = await this.listIds(options);
    const items = await Promise.all(ids.items.map((x) => this.get<T>(x)));

    return {
      items: ids.items.map((id, index) => ({
        id,
        item: items[index]!,
      })),
      nextToken: ids.nextToken,
    };
  }

  public async set<T>(key: string, value: T): Promise<void> {
    await new Promise((resolve, reject) => {
      fs.exists(this.options.path, (dirExists) => {
        if (!dirExists) {
          fs.mkdir(this.options.path, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });

    return new Promise<void>((resolve, reject) => {
      fs.writeFile(this.filePath(key), this.options.serialize(value), (writeFileError) => {
        if (writeFileError) {
          reject(writeFileError);
        } else {
          resolve();
        }
      });
    });
  }

  private async listIds(options: ListOptions = {}): Promise<ContinuationArray<string>> {
    let offset = 0;

    if (options.nextToken) {
      const nextToken = decodeNextToken<{ max?: number; offset: number; prefix?: string }>(options.nextToken);
      if (nextToken) {
        offset = nextToken.offset;
        options.prefix = nextToken.prefix;
        options.max = nextToken.max;
      }
    }

    return new Promise<ContinuationArray<string>>((resolve, reject) => {
      fs.readdir(this.options.path, (err, files) => {
        if (err) {
          reject(err);
        } else {
          files = files.map((x) => this.fileId(x));
          if (options.prefix) {
            files = files.filter((x) => x[0].startsWith(options.prefix!));
          }

          if (offset) {
            files = files.slice(offset);
          }

          const remainingCount = files.length;
          if (options.max) {
            files = files.slice(0, options.max);
          }

          return resolve({
            items: files,
            nextToken: remainingCount !== files.length
              ? encodeNextToken({ max: options.max, offset: offset + options.max!, prefix: options.prefix })
              : undefined,
          });
        }
      });
    });
  }

  private readonly filePath = (key: string) => join(this.options.path, `${encodeURIComponent(key)}.json`);

  private readonly fileId = (path: string) => decodeURIComponent(basename(path, ".json"));
}
