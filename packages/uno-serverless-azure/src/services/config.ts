import { KeyVaultClient } from "azure-keyvault";
import { SecretBundle, SecretListResult } from "azure-keyvault/lib/models";
import { loginWithAppServiceMSI, loginWithServicePrincipalSecret } from "ms-rest-azure";
import { ConfigService, configurationError } from "uno-serverless";

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
  ttl?: number;
}

export type KeyVaultConfigServiceOptions =
  (KeyVaultConfigServiceOptionsWithKeyVault | KeyVaultConfigServiceOptionsWithCredentials)
  & KeyVaultConfigServiceOptionsCommon;

export class KeyVaultConfigService implements ConfigService {

  private keyVaultClient: Promise<KeyVaultClient> | undefined;

  /** Cached promise */
  private cache: {
    parameters: Promise<Record<string, string>>;
    timestamp: number;
  } | undefined;

  public constructor(private readonly options: KeyVaultConfigServiceOptions) {}

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

  private async getClient() {
    if (!this.keyVaultClient) {
      const optionsWithKeyVaultClient = this.options as KeyVaultConfigServiceOptionsWithKeyVault;
      if (optionsWithKeyVaultClient.keyVaultClient) {
        this.keyVaultClient = Promise.resolve(optionsWithKeyVaultClient.keyVaultClient);
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

        this.keyVaultClient = Promise.resolve(new KeyVaultClient(credentials));
      }
    }

    return this.keyVaultClient;
  }

  private async getParameters(): Promise<Record<string, string>> {
    const client = await this.getClient() as any;
    const keyVaultUrl = await this.options.keyVaultUrl;
    const results = await client.getSecrets(
      keyVaultUrl,
      { maxresults: this.options.maxResults }) as SecretListResult;

    const secretBundles = await Promise.all(
      results.map<Promise<SecretBundle>>((item) => {
          return client.getSecret(keyVaultUrl, item.id) as Promise<SecretBundle>;
      }));

    const prefix = await this.options.prefix;
    const parameterMap = {};
    secretBundles.forEach((bundle) => {
      if (prefix) {
        if (bundle.id!.startsWith(prefix)) {
          parameterMap[bundle.id!.replace(prefix, "")] = bundle.value;
        }
      } else {
        parameterMap[bundle.id!] = bundle.value;
      }
    });

    return parameterMap;
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

    return (this.cache.timestamp + this.options.ttl!) <= now;
  }
}
