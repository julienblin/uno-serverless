import Axios, * as axios from "axios";
import { isStatusCodeProvider } from "../core";

export type PossiblePromise<T> = T | Promise<T>;

export interface HttpClientConfig {
  adapter?: axios.AxiosAdapter;
  auth?: PossiblePromise<axios.AxiosBasicCredentials>;
  cancelToken?: axios.CancelToken;
  baseURL?: PossiblePromise<string>;
  headers?: PossiblePromise<Record<string, string>>;
  httpAgent?: any;
  httpsAgent?: any;
  maxContentLength?: PossiblePromise<number>;
  maxRedirects?: PossiblePromise<number>;
  onDownloadProgress?: (progressEvent: any) => void;
  onUploadProgress?: (progressEvent: any) => void;
  params?: PossiblePromise<any>;
  paramsSerializer?: (params: any) => string;
  proxy?: PossiblePromise<axios.AxiosProxyConfig> | false;
  responseType?: PossiblePromise<string>;
  timeout?: PossiblePromise<number>;
  transformRequest?: axios.AxiosTransformer | axios.AxiosTransformer[];
  transformResponse?: axios.AxiosTransformer | axios.AxiosTransformer[];
  validateStatus?: (status: number) => boolean;
  withCredentials?: PossiblePromise<boolean>;
}

export interface HttpClient {
  delete(url: string, config?: axios.AxiosRequestConfig | undefined): Promise<axios.AxiosResponse<any>>;
  get<T = any>(url: string, config?: axios.AxiosRequestConfig | undefined): Promise<axios.AxiosResponse<T>>;
  head(url: string, config?: axios.AxiosRequestConfig | undefined): Promise<axios.AxiosResponse<any>>;
  patch<T = any>(url: string, data?: any, config?: axios.AxiosRequestConfig | undefined);
  post<T = any>(url: string, data?: any, config?: axios.AxiosRequestConfig | undefined)
  : Promise<axios.AxiosResponse<T>>;
  put<T = any>(url: string, data?: any, config?: axios.AxiosRequestConfig | undefined)
  : Promise<axios.AxiosResponse<T>>;
  request<T = any>(config: axios.AxiosRequestConfig): Promise<axios.AxiosResponse<T>>;
}

export interface HttpClientError extends Error {
  code?: string;
  request?: {
    data?: any;
    headers: Record<string, string>;
    method?: string;
    url: string;
  };
  response?: {
    data: any;
    headers: Record<string, string>;
    status: number;
  };
}

const httpClientError = (axiosError: axios.AxiosError): HttpClientError => {
  if (isStatusCodeProvider(axiosError)) {
    return axiosError;
  }
  const error = new Error(axiosError.message) as HttpClientError;

  error.code = axiosError.code;
  if (axiosError.config) {
    error.request = {
      data: axiosError.config.data,
      headers: axiosError.config.headers || {},
      method: axiosError.config.method,
      url: axiosError.config.url ? axiosError.config.url : axiosError.request.path,
    };
  }
  if (axiosError.response) {
    error.response = {
      data: axiosError.response.data,
      headers: axiosError.response.headers || {},
      status: axiosError.response.status,
    };
  }

  return error;
};

class AxiosHttpClient implements HttpClient {

  private clientPromise: Promise<axios.AxiosInstance> | undefined;

  public constructor(private readonly clientBuilder: () => Promise<axios.AxiosInstance>) {}

  public async delete(url: string, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<any>> {
      try {
        return await (await this.client).delete(url, config);
      } catch (error) {
        throw httpClientError(error);
      }
  }

  public async get<T = any>(url: string, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<T>> {
      try {
        return await (await this.client).get<T>(url, config);
      } catch (error) {
        throw httpClientError(error);
      }
  }

  public async head(url: string, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<any>> {
      try {
        return await (await this.client).head(url, config);
      } catch (error) {
        throw httpClientError(error);
      }
  }

  public async patch<T = any>(url: string, data?: any, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<T>> {
      try {
        return await (await this.client).patch<T>(url, data, config);
      } catch (error) {
        throw httpClientError(error);
      }
  }

  public async post<T = any>(url: string, data?: any, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<T>> {
      try {
        return await (await this.client).post<T>(url, data, config);
      } catch (error) {
        throw httpClientError(error);
      }
  }

  public async put<T = any>(url: string, data?: any, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<T>> {
      try {
        return await (await this.client).put<T>(url, data, config);
      } catch (error) {
        throw httpClientError(error);
      }
  }

  public async request<T = any>(config: axios.AxiosRequestConfig)
    : Promise<axios.AxiosResponse<T>> {
      try {
        return await (await this.client).request<T>(config);
      } catch (error) {
        throw httpClientError(error);
      }
  }

  private get client() {
    if (!this.clientPromise) {
      this.clientPromise = this.clientBuilder();
    }

    return this.clientPromise;
  }
}

export const httpClientFactory = (config: HttpClientConfig = {}): HttpClient =>
  new AxiosHttpClient(async () =>
    Axios.create({
      adapter: config.adapter ? config.adapter : Axios.defaults.adapter,
      auth: config.auth ? await config.auth : Axios.defaults.auth,
      baseURL: config.baseURL ? await config.baseURL : Axios.defaults.baseURL,
      cancelToken: config.cancelToken ? config.cancelToken : Axios.defaults.cancelToken,
      headers: config.headers ? await config.headers : Axios.defaults.headers,
      httpAgent: config.httpAgent ? config.httpAgent : Axios.defaults.httpAgent,
      httpsAgent: config.httpsAgent ? config.httpsAgent : Axios.defaults.httpsAgent,
      maxContentLength: config.maxContentLength ? await config.maxContentLength : Axios.defaults.maxContentLength,
      maxRedirects: config.maxRedirects ? await config.maxRedirects : Axios.defaults.maxRedirects,
      onDownloadProgress: config.onDownloadProgress ? config.onDownloadProgress : Axios.defaults.onDownloadProgress,
      onUploadProgress: config.onUploadProgress ? config.onUploadProgress : Axios.defaults.onUploadProgress,
      params: config.params ? await config.params : Axios.defaults.params,
      paramsSerializer: config.paramsSerializer ? config.paramsSerializer : Axios.defaults.paramsSerializer,
      proxy: config.proxy ? await config.proxy : Axios.defaults.proxy,
      responseType: config.responseType ? await config.responseType : Axios.defaults.responseType,
      timeout: config.timeout ? await config.timeout : Axios.defaults.timeout,
      transformRequest: config.transformRequest ? config.transformRequest : Axios.defaults.transformRequest,
      transformResponse: config.transformResponse ? config.transformResponse : Axios.defaults.transformResponse,
      validateStatus: config.validateStatus ? config.validateStatus : Axios.defaults.validateStatus,
      withCredentials: config.withCredentials ? await config.withCredentials : Axios.defaults.withCredentials,
    }));
