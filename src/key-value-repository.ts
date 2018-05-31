
/** A repository to store and retrieve objects by keys. */
export interface KeyValueRepository {
  delete(key: string): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

/**
 * KeyValueRepository in-memory.
 * Useful for unit-testing.
 */
export class InMemoryKeyValueRepository implements KeyValueRepository {

  /** The storage. */
  private readonly storage = new Map<string, string>();

  // tslint:disable:no-unbound-method
  public constructor(
    private readonly serialize: (value: any) => string = JSON.stringify,
    private readonly deserialize: (text: string) => any = JSON.parse) {}

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
      ? this.deserialize(retrieved) as T
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
