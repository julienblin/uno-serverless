import { KeyVaultClient } from "azure-keyvault";
import { SecretBundle, SecretListResult } from "azure-keyvault/lib/models";
import { loginWithAppServiceMSI, loginWithServicePrincipalSecret } from "ms-rest-azure";
import { checkHealth, CheckHealth, ConfigService, configurationError, duration } from "uno-serverless";

export interface KeyVaultConfigServiceOptionsWithKeyVault {
  keyVaultClient: KeyVaultClient;
}

export interface KeyVaultConfigServiceOptionsWithCredentials {
  clientId?: string | Promise<string>;
  domain?: string | Promise<string>;
  secret?: string | Promise<string>;
}

export interface KeyVaultConfigServiceOptionsCommon {
  prefix?: string | Promise<string>;
  keyVaultUrl: string | Promise<string>;
  maxResults?: number;
  ttl?: number | string;
}

export type KeyVaultConfigServiceOptions =
  (KeyVaultConfigServiceOptionsWithKeyVault | KeyVaultConfigServiceOptionsWithCredentials)
  & KeyVaultConfigServiceOptionsCommon;

export class KeyVaultConfigService implements ConfigService, CheckHealth {

  /** Cached promise */
  private cache: {
    parameters: Promise<Record<string, string>>;
    timestamp: number;
  } | undefined;

  public constructor(private readonly options: KeyVaultConfigServiceOptions) { }

  public async checkHealth() {
    return checkHealth(
      "KeyVaultConfigService",
      await this.options.keyVaultUrl,
      async () => {
        this.cache = {
          parameters: this.getParameters(),
          timestamp: new Date().getTime(),
        };

        await this.cache.parameters;
      });
  }

  public async get(key: string): Promise<string>;
  public async get(key: string, required = true): Promise<string | undefined> {
    const now = new Date().getTime();

    if (this.isCachePerished(now)) {
      this.cache = {
        parameters: this.getParameters(),
        timestamp: now,
      };
    }

    const resolvedParameters = await this.cache!.parameters;

    if (resolvedParameters[key]) {
      return resolvedParameters[key];
    }

    if (required) {
      throw configurationError({ key, provider: "KeyVaultConfigService" }, `Missing configuration value for ${key}`);
    }

    return undefined;
  }

  private async getParameters(): Promise<Record<string, string>> {
    const client = await this.getClient() as any;
    let keyVaultUrl = await this.options.keyVaultUrl;
    if (keyVaultUrl.endsWith("/")) {
      keyVaultUrl = keyVaultUrl.slice(0, -1);
    }
    const results = await client.getSecrets(
      keyVaultUrl,
      { maxresults: this.options.maxResults }) as SecretListResult;

    const secretBundles = await Promise.all(
      results
        .filter((x) => !!x.id)
        .map((item) => {
          return client.getSecret(keyVaultUrl, this.secretName(keyVaultUrl, item.id), "") as Promise<SecretBundle>;
        }));

    const prefix = await this.options.prefix;
    const parameterMap = {};
    secretBundles.forEach((bundle) => {
      const secretName = this.secretName(keyVaultUrl, bundle.id, true);
      if (prefix) {
        if (secretName.startsWith(prefix)) {
          parameterMap[secretName.replace(prefix, "")] = bundle.value;
        }
      } else {
        parameterMap[secretName] = bundle.value;
      }
    });

    return parameterMap;
  }

  private async getClient() {
    const optionsWithKeyVaultClient = this.options as KeyVaultConfigServiceOptionsWithKeyVault;
    if (optionsWithKeyVaultClient.keyVaultClient) {
      return optionsWithKeyVaultClient.keyVaultClient;
    } else {
      let credentials;
      if (process.env.APPSETTING_WEBSITE_SITE_NAME) {
        credentials = await loginWithAppServiceMSI({ resource: "https://vault.azure.net" } as any);
      } else {
        const optionsWithCredentials = this.options as KeyVaultConfigServiceOptionsWithCredentials;
        credentials = await loginWithServicePrincipalSecret(
          await optionsWithCredentials.clientId!,
          await optionsWithCredentials.secret!,
          await optionsWithCredentials.domain!);
      }

      return new KeyVaultClient(credentials);
    }
  }

  private secretName(keyVaultUrl: string, secretId: string | undefined, hasVersion = false) {
    const base = secretId!.slice(`${keyVaultUrl}/secrets/`.length);
    if (!hasVersion) {
      return base;
    }

    return base.slice(0, base.indexOf("/"));
  }

  /** Indicates whether to refresh the cache or not. */
  private isCachePerished(now: number) {
    const cachedDisabled = ((this.options.ttl === undefined) || (this.options.ttl === null));

    if (!this.cache) {
      return true;
    }

    if (cachedDisabled) {
      return false;
    }

    const exp = typeof this.options.ttl! === "number"
      ? this.options.ttl as number
      : duration(this.options.ttl! as string);

    return (this.cache.timestamp + exp) <= now;
  }
}
