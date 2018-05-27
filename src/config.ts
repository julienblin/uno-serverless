import { configurationError } from "./errors";

// tslint:disable:max-classes-per-file

/** Provides configuration values as string. */
export interface IConfigService {

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
 * IConfigService implementation that returns static values
 * provided at service construction time.
 */
export class StaticConfigService implements IConfigService {

  public constructor(private readonly values: Record<string, string>) {}

  public async get(key: string): Promise<string>;
  public async get(key: string, required = true): Promise<string | undefined> {
    const result = this.values[key];

    if (!result && required) {
      throw configurationError(key, StaticConfigService.name);
    }

    return result;
  }
}

/**
 * IConfigService implementation that returns values
 * defined in process.env.
 */
export class ProcessEnvConfigService implements IConfigService {

  public constructor(private readonly env = process.env) {}

  public async get(key: string): Promise<string>;
  public async get(key: string, required = true): Promise<string | undefined> {
    const result = this.env[key];

    if (!result && required) {
      throw configurationError(key, ProcessEnvConfigService.name);
    }

    return result;
  }

}
