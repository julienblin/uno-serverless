import { readFile } from "fs";
import { configurationError } from "../core/errors";
import { checkHealth, CheckHealth } from "./health-check";

/** Provides configuration values as string. */
export interface ConfigService {

  /**
   * Returns a configuration value associated with a key.
   * Throw if value not found.
   */
  get(key: string): Promise<string>;

  /**
   * Returns a configuration value associated with a key.
   * Returns undefined if no value is found and required is true.
   * Throw if value not found and required is true.
   */
  get(key: string, required?: boolean): Promise<string | undefined>;
}

/**
 * ConfigService implementation that returns static values
 * provided at service construction time.
 */
export class StaticConfigService implements ConfigService {

  public constructor(
    private readonly values: Record<string, string | undefined>,
    private readonly name = "StaticConfigService") {}

  public async get(key: string): Promise<string>;
  public async get(key: string, required = true): Promise<string | undefined> {
    const result = this.values[key];

    if (!result && required) {
      throw configurationError({ key, provider: this.name }, `Missing configuration value for ${key}`);
    }

    return result;
  }
}

/**
 * ConfigService implementation that returns values
 * defined in process.env.
 */
export class ProcessEnvConfigService extends StaticConfigService {

  public constructor(
    env = process.env,
    name = "ProcessEnvConfigService") {
    super(env, name);
  }

}

/** Options for JSONFileConfigService */
export interface JSONFileConfigServiceOptions {
  /** If true, the file is reloaded on each get. */
  debug?: boolean;

  /** The file path */
  path: string;
}

/**
 * ConfigService implementation that loads a JSON file
 * with key/value pairs.
 */
export class JSONFileConfigService implements ConfigService, CheckHealth {

  /** Cached promise for file content. */
  private fileContent: Promise<Record<string, string>> | undefined;

  public constructor(
    private readonly options: JSONFileConfigServiceOptions,
    private readonly name = "JSONFileConfigService") {}

  public async checkHealth() {
    return checkHealth(
      "JSONFileConfigService",
      this.options.path,
      async () => this.loadFile());
  }

  public async get(key: string): Promise<string>;
  public async get(key: string, required = true): Promise<string | undefined> {
    if (!this.fileContent || this.options.debug) {
      this.fileContent = this.loadFile();
    }

    const resolvedParameters = await this.fileContent;

    if (resolvedParameters[key]) {
      return resolvedParameters[key];
    }

    if (required) {
      throw configurationError({ key, provider: this.name }, `Missing configuration value for ${key}`);
    }

    return undefined;

  }

  /** Load the file from disk and parse as JSON. */
  private async loadFile(): Promise<Record<string, string>> {
    return new Promise<Record<string, string>>((resolve, reject) => {
      readFile(this.options.path, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(data.toString()));
        }
      });
    });
  }
}
