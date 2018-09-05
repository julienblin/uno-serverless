import Axios, * as axios from "axios";
import * as chalk from "chalk";
import { isStatusCodeProvider, lazyAsync, safeJSONStringify } from "../core";

export type PossiblePromise<T> = T | Promise<T>;

export interface Interceptor {
  request?: {
    onFulfilled?: (request: axios.AxiosRequestConfig) => (axios.AxiosRequestConfig | Promise<axios.AxiosRequestConfig>);
    onRejected?: (error: any) => any;
  };
  response?: {
    onFulfilled?: (response: axios.AxiosResponse) => (axios.AxiosResponse | Promise<axios.AxiosResponse>);
    onRejected?: (error: any) => any;
  };
}

export interface HttpClientConfig {
  adapter?: axios.AxiosAdapter;
  auth?: PossiblePromise<axios.AxiosBasicCredentials | undefined>;
  cancelToken?: axios.CancelToken;
  debug?: PossiblePromise<boolean | undefined>;
  baseURL?: PossiblePromise<string | undefined>;
  headers?: PossiblePromise<Record<string, string>>;
  httpAgent?: any;
  httpsAgent?: any;
  interceptors?: PossiblePromise<Interceptor[] | undefined>;
  maxContentLength?: PossiblePromise<number | undefined>;
  maxRedirects?: PossiblePromise<number | undefined>;
  onDownloadProgress?: (progressEvent: any) => void;
  onUploadProgress?: (progressEvent: any) => void;
  params?: PossiblePromise<any | undefined>;
  paramsSerializer?: (params: any) => string;
  proxy?: PossiblePromise<axios.AxiosProxyConfig | undefined> | false;
  responseType?: PossiblePromise<string | undefined>;
  timeout?: PossiblePromise<number | undefined>;
  transformRequest?: axios.AxiosTransformer | axios.AxiosTransformer[];
  transformResponse?: axios.AxiosTransformer | axios.AxiosTransformer[];
  validateStatus?: (status: number) => boolean;
  withCredentials?: PossiblePromise<boolean | undefined>;
}

export interface HttpClient {
  axios(): Promise<axios.AxiosInstance>;
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

  private readonly lazyClient = lazyAsync(async () => this.clientBuilder());

  public constructor(private readonly clientBuilder: () => Promise<axios.AxiosInstance>) { }

  public async axios(): Promise<axios.AxiosInstance> {
    return this.lazyClient();
  }

  public async delete(url: string, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<any>> {
    try {
      return await (await this.lazyClient()).delete(url, config);
    } catch (error) {
      throw httpClientError(error);
    }
  }

  public async get<T = any>(url: string, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<T>> {
    try {
      return await (await this.lazyClient()).get<T>(url, config);
    } catch (error) {
      throw httpClientError(error);
    }
  }

  public async head(url: string, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<any>> {
    try {
      return await (await this.lazyClient()).head(url, config);
    } catch (error) {
      throw httpClientError(error);
    }
  }

  public async patch<T = any>(url: string, data?: any, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<T>> {
    try {
      return await (await this.lazyClient()).patch<T>(url, data, config);
    } catch (error) {
      throw httpClientError(error);
    }
  }

  public async post<T = any>(url: string, data?: any, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<T>> {
    try {
      return await (await this.lazyClient()).post<T>(url, data, config);
    } catch (error) {
      throw httpClientError(error);
    }
  }

  public async put<T = any>(url: string, data?: any, config?: axios.AxiosRequestConfig | undefined)
    : Promise<axios.AxiosResponse<T>> {
    try {
      return await (await this.lazyClient()).put<T>(url, data, config);
    } catch (error) {
      throw httpClientError(error);
    }
  }

  public async request<T = any>(config: axios.AxiosRequestConfig)
    : Promise<axios.AxiosResponse<T>> {
    try {
      return await (await this.lazyClient()).request<T>(config);
    } catch (error) {
      throw httpClientError(error);
    }
  }
}

export const httpClientFactory = (config: HttpClientConfig = {}): HttpClient =>
  new AxiosHttpClient(async () => {
    const axiosInstance = Axios.create({
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
    });

    if (await config.debug) {
      const debug = (content, color) => {
        console.log(chalk[color](
          typeof content === "string" ? content : safeJSONStringify(content, undefined, 2)));
      };

      const curateRequest = (c) => {
        if (typeof c === "string") {
          return c;
        }

        return {
          baseURL: c.baseURL,
          data: c.data,
          headers: {
            ...(c.headers && c.headers.common),
            ...(c.headers && c.headers[c.method]),
          },
          method: c.method,
          url: c.url,
        };
      };

      const curateResponse = (response) => {
        if (typeof response === "string") {
          return response;
        }

        return {
          data: response.data,
          headers: response.headers || {},
          status: response.status,
        };
      };

      axiosInstance.interceptors.request.use(
        (c) => { debug(curateRequest(c), "cyan"); return c; },
        (error) => { debug(error, "red"); return Promise.reject(error); });
      axiosInstance.interceptors.response.use(
        (response) => { debug(curateResponse(response), "green"); return response; },
        (error) => { debug(error, "red"); return Promise.reject(error); });
    }

    const interceptors = await config.interceptors;
    if (interceptors && interceptors.length > 0) {
      for (const interceptor of interceptors) {
        if (interceptor.request) {
          axiosInstance.interceptors.request.use(interceptor.request.onFulfilled, interceptor.request.onRejected);
        }

        if (interceptor.response) {
          axiosInstance.interceptors.response.use(interceptor.response.onFulfilled, interceptor.response.onRejected);
        }
      }
    }

    return axiosInstance;
  });
