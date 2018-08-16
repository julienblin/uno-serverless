import {
  common,
  createTableService,
  ServiceResponse,
  TableQuery,
  TableService,
} from "azure-storage";
import {
  CheckHealth,
  checkHealth,
  HealthCheckResult,
  lazyAsync,
} from "uno-serverless";

export class TableStorage implements CheckHealth {

  private readonly lazyTableService = lazyAsync<TableService>(async () => {
    return createTableService(await this.connectionString);
  });

  constructor(
    private readonly tableName: string | Promise<string>,
    private readonly connectionString: string | Promise<string>,
    private readonly defaultPartitionKey?: string | Promise<string>) {
  }

  public async checkHealth(): Promise<HealthCheckResult> {
    const tableName = await this.tableName;
    return checkHealth(
      "TableStorageService",
      tableName,
      async () => this.createTableIfNotExists(tableName),
    );
  }

  public async insertEntity<T extends TableEntity>(entity: T, options: InsertRequestOptions = {})
    : Promise<T> {
    const tableService = await this.lazyTableService();
    const tableName = options.tableName || await this.tableName;

    if (options.tableName && options.createTableIfNotExists) {
      await this.createTableIfNotExists(options.tableName);
    }

    return new Promise<T>((resolve, reject) =>
      tableService.insertEntity<T>(
        tableName,
        entity,
        options || {},
        this.insertionCallback<T>(entity, resolve, reject)));
  }

  public async replaceEntity<T extends TableEntity>(entity: T, options: ReplaceRequestOptions = {})
    : Promise<T> {
    const tableService = await this.lazyTableService();
    const tableName = options.tableName || await this.tableName;

    return new Promise<T>((resolve, reject) =>
      tableService.replaceEntity<T>(
        tableName,
        entity,
        options || {},
        this.insertionCallback<T>(entity, resolve, reject)));
  }

  public async mergeEntity<T extends TableEntity>(entity: T, options: MergeRequestOptions = {})
    : Promise<T> {
    const tableService = await this.lazyTableService();
    const tableName = options.tableName || await this.tableName;

    return new Promise<T>((resolve, reject) =>
      tableService.mergeEntity<T>(
        tableName,
        entity,
        options || {},
        this.insertionCallback<T>(entity, resolve, reject)));
  }

  public async insertOrReplaceEntity<T extends TableEntity>(entity: T, options: InsertRequestOptions = {})
    : Promise<T> {
    const tableService = await this.lazyTableService();
    const tableName = options.tableName || await this.tableName;

    if (options.tableName && options.createTableIfNotExists) {
      await this.createTableIfNotExists(options.tableName);
    }

    return new Promise<T>((resolve, reject) =>
      tableService.insertOrReplaceEntity<T>(
        tableName,
        entity,
        options,
        this.insertionCallback<T>(entity, resolve, reject)));
  }

  public async insertOrMergeEntity<T extends TableEntity>(entity: T, options: InsertRequestOptions = {})
    : Promise<T> {
    const tableService = await this.lazyTableService();
    const tableName = options.tableName || await this.tableName;

    if (options.tableName && options.createTableIfNotExists) {
      await this.createTableIfNotExists(options.tableName);
    }

    return new Promise<T>((resolve, reject) =>
      tableService.insertOrMergeEntity<T>(
        tableName,
        entity,
        options,
        this.insertionCallback<T>(entity, resolve, reject)));
  }

  public async deleteEntity(rowKey: string, partitionKey?: string, options: TableOptions = {})
    : Promise<ServiceResponse> {
    const tableService = await this.lazyTableService();
    const tableName = options.tableName || await this.tableName;
    partitionKey = partitionKey || await this.defaultPartitionKey || rowKey;
    return new Promise<ServiceResponse>((resolve, reject) =>
      tableService.deleteEntity<{ RowKey: string, PartitionKey: string }>(
        tableName,
        {
          PartitionKey: partitionKey!,
          RowKey: rowKey,
        },
        this.defaultCallback<ServiceResponse>(resolve, reject)));
  }

  public async retrieveEntity<T extends TableEntity>(
    rowKey: string,
    partitionKey?: string,
    options?: TableService.TableEntityRequestOptions)
    : Promise<T | undefined> {
    const tableService = await this.lazyTableService();
    const tableName = await this.tableName;
    partitionKey = partitionKey || await this.defaultPartitionKey;
    return new Promise<T | undefined>((resolve, reject) =>
      tableService.retrieveEntity<T>(
        tableName,
        partitionKey!,
        rowKey,
        options || {},
        this.defaultCallback<T | undefined>(resolve, reject)));
  }

  public async queryEntities<T extends TableEntity>(options: QueryEntitiesOptions = {})
    : Promise<TableService.QueryEntitiesResult<T>> {
    const tableService = await this.lazyTableService();
    const tableName = options.tableName || await this.tableName;
    return new Promise<TableService.QueryEntitiesResult<T>>((resolve, reject) =>
      tableService.queryEntities<T>(
        tableName!,
        // We have to ignore nullity of the tableQuery parameter because the typescript binding
        // does not allow us to pass undefined here.
        options.tableQuery!,
        // We have to ignore nullity of the nextToken parameter because the typescript binding
        // does not allow us to pass undefined here.
        options.nextToken!,
        options,
        this.defaultCallback<TableService.QueryEntitiesResult<T>>(resolve, reject)));
  }

  public async createTable(
    tableName: string,
    options: common.RequestOptions = {}):
    Promise<TableService.TableResult> {
    const tableService = await this.lazyTableService();
    return new Promise<TableService.TableResult>((resolve, reject) =>
      tableService.createTable(
        tableName,
        options,
        this.defaultCallback<TableService.TableResult>(resolve, reject)));
  }

  public async createTableIfNotExists(
    tableName: string,
    options: common.RequestOptions = {}):
    Promise<TableService.TableResult> {
    const tableService = await this.lazyTableService();
    return new Promise<TableService.TableResult>((resolve, reject) =>
      tableService.createTableIfNotExists(
        tableName,
        options,
        this.defaultCallback<TableService.TableResult>(resolve, reject)));
  }

  private insertionCallback<T extends TableEntity>(
    entity: T,
    resolve: (value?: T | PromiseLike<T> | undefined) => void,
    reject: (reason?: any) => void)
    : (error: Error, result: TableService.EntityMetadata) => void {
    return (error: Error, result: TableService.EntityMetadata) => {
      if (error) {
        reject(error);
      }

      resolve({
        ...(entity as any),
        ...result,
      });
    };
  }

  private defaultCallback<T>(
    resolve: () => void,
    reject: (reason?: any) => void)
    : (error: Error, result: T) => void {
      return (error: Error, result: T) => {
        if (error) {
          reject(error);
        }

        resolve();
      };
  }
}

export interface TableEntity {
  RowKey: string;
  PartitionKey: string;
  ".metadata"?: {
    etag: string;
  };
}

export interface TableOptions {
  tableName?: string;
}

export type InsertRequestOptions = TableOptions & common.RequestOptions & { createTableIfNotExists?: boolean };
export type MergeRequestOptions = TableOptions & common.RequestOptions;
export type ReplaceRequestOptions = TableOptions & common.RequestOptions;

export interface QueryEntitiesOptions extends TableOptions, TableService.TableEntityRequestOptions {
  nextToken?: TableService.TableContinuationToken;
  tableQuery?: TableQuery;
}
