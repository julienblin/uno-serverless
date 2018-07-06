import { DocumentQuery, FeedOptions, RetrievedDocument, UniqueId } from "documentdb";
import { CheckHealth, ContinuationArray, WithContinuation } from "uno-serverless";
import { DocumentQueryProducer } from "./documentdb-query";

export interface EntityDocument extends UniqueId {
  /** The entity type (e.g. products, users...) */
  _entity: string;
}

export interface DocumentDbOperationOptions {
  /** DocumentDb feed options */
  feedOptions?: FeedOptions;
}

export interface EntityOptions {
  /**
   * The entity type (e.g. products, users...).
   * If not provided, the id will need to include the entity type prefix.
   */
  entity?: string;
}

export interface StrippedOptions {
  /** True to strip all properties starting with _ (owned by DocumentDb) */
  stripped: true;
}

export interface DocumentDb extends CheckHealth {
  /** Delete a document by id. */
  delete(id: string, options?: EntityOptions & DocumentDbOperationOptions): Promise<void>;

  /** Get a document by id. */
  get<T>(id: string, options?: EntityOptions & DocumentDbOperationOptions)
    : Promise<T & RetrievedDocument & EntityDocument | undefined>;
  /** Get a document by id. */
  get<T>(id: string, options: EntityOptions & DocumentDbOperationOptions & StrippedOptions)
    : Promise<T | undefined>;

  /** Paginated query. */
  query<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options?: EntityOptions & WithContinuation & DocumentDbOperationOptions)
    : Promise<ContinuationArray<T & RetrievedDocument & EntityDocument>>;
  /** Paginated query. */
  query<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options: EntityOptions & WithContinuation & StrippedOptions & DocumentDbOperationOptions)
    : Promise<ContinuationArray<T>>;

  /** Non-paginated query - all results returned. */
  queryAll<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options?: EntityOptions & DocumentDbOperationOptions)
    : Promise<Array<T & RetrievedDocument & EntityDocument>>;
  /** Non-paginated query - all results returned. */
  queryAll<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options: EntityOptions & StrippedOptions & DocumentDbOperationOptions)
    : Promise<T[]>;

  /** Create or update a document. */
  set<T>(document: T & EntityDocument, options?: DocumentDbOperationOptions)
    : Promise<T & RetrievedDocument & EntityDocument>;
  /** Create or update a document. */
  set<T>(document: T & EntityDocument, options: DocumentDbOperationOptions & StrippedOptions): Promise<T>;
}

/** Default id for singleton entities. */
export const single = "single";
