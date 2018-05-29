import { configurationError } from "./errors";

// tslint:disable:max-classes-per-file

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
