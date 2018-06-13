import * as fs from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomStr } from "../core/utils";

/** A repository to store and retrieve objects by keys. */
export interface KeyValueRepository {
  delete(key: string): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

/**
 * KeyValueRepository in-memory.
 * Useful for unit-testing.
 * Objects are serialized / deserialized to better catch error.
 */
export class InMemoryKeyValueRepository implements KeyValueRepository {

  /** The storage. */
  private readonly storage = new Map<string, string>();

  public constructor(
    private readonly serialize: <T>(value: T) => string = JSON.stringify,
    private readonly deserialize: <T>(text: string) => T = JSON.parse) {}

  /** Clear the repository */
  public clear() {
    this.storage.clear();
  }

  /** Delete the value associated with the key */
  public async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /** Gets all the deserialized key/value pairs. */
  public *entries() {
    for (const entry of this.storage.entries()) {
      yield { key: entry["0"], value: this.deserialize(entry["1"]) };
    }
  }

  /** Get the value associated with the key */
  public async get<T>(key: string): Promise<T | undefined> {
    const retrieved = this.storage.get(key);

    return retrieved
      ? this.deserialize(retrieved)
      : undefined;
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

const filenameSanitation = (filename: string) => filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();

/**
 * KeyValueRepository implementation that uses a local file system.
 */
export class FileKeyValueRepository implements KeyValueRepository {

  private readonly options: Required<FileKeyValueRepositoryOptions>;

  public constructor({
    path = join(tmpdir(), filenameSanitation(randomStr(8))),
    deserialize = <T>(text: string) => JSON.parse(text),
    serialize = <T>(value: T) => JSON.stringify(value),
  }: FileKeyValueRepositoryOptions = {}) {
    this.options = {
      deserialize,
      path,
      serialize,
    };
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
          return;
        }

        fs.readFile(this.filePath(key), (fileReadError, data) => {
          if (fileReadError) {
            reject(fileReadError);
          } else {
            resolve(this.options.deserialize<T>(data.toString()));
          }
        });
      });
    });
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

  private readonly filePath = (key: string) => join(this.options.path, `${filenameSanitation(key)}.json`);
}
