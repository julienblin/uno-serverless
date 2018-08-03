import {
  Collection, ConsistencyLevel, DocumentClient,
  DocumentOptions, DocumentQuery, FeedOptions, RequestOptions, RetrievedDocument, UniqueId, UriFactory,
} from "documentdb";
import {
  CheckHealth, checkHealth, conflictError, ContinuationArray,
  decodeNextToken, encodeNextToken, HttpStatusCodes, lazyAsync, WithContinuation,
} from "uno-serverless";
import { DocumentQueryProducer, EntityDocument, isDocumentQueryProducer } from "./documentdb-query";

export interface DocumentDbRequestOptions {
  requestOptions?: RequestOptions;
}

export interface DocumentDbFeedOptions {
  /** DocumentDb feed options */
  feedOptions?: FeedOptions;
}

export interface MetadataOptions {
  /** True keep all properties starting with _ (owned by DocumentDb) */
  metadata: true;
}

export interface ETagDocument {
  /** The document ETag, if any. */
  _etag?: string;
}

export interface DocumentDb {
  /** Delete a document by entity type and id. */
  delete(entity: string, id: string, options?: DocumentDbRequestOptions): Promise<void>;

  /** Get a document by entity type and id. */
  get<T>(entity: string, id: string, options?: DocumentDbRequestOptions)
    : Promise<T | undefined>;
  /** Get a document by entity type and id. */
  get<T>(entity: string, id: string, options: DocumentDbRequestOptions & MetadataOptions)
    : Promise<T & RetrievedDocument & EntityDocument | undefined>;

  /** Paginated query. */
  query<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options?: WithContinuation & DocumentDbFeedOptions)
    : Promise<ContinuationArray<T>>;
  /** Paginated query. */
  query<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options: WithContinuation & DocumentDbFeedOptions & MetadataOptions)
    : Promise<ContinuationArray<T & RetrievedDocument & EntityDocument>>;

  /** Non-paginated query - all results returned. */
  queryAll<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options?: DocumentDbFeedOptions)
    : Promise<T[]>;
  /** Non-paginated query - all results returned. */
  queryAll<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options: DocumentDbFeedOptions & MetadataOptions)
    : Promise<Array<T & RetrievedDocument & EntityDocument>>;

  /**
   * Create or update a document.
   * Will honor ETag concurrency validation if document has an _etag property.
   */
  set<T>(document: T & EntityDocument & ETagDocument, options?: DocumentDbRequestOptions): Promise<T>;
  /**
   * Create or update a document.
   * Will honor ETag concurrency validation if document has an _etag property.
   */
  set<T>(document: T & EntityDocument & ETagDocument, options: DocumentDbRequestOptions & MetadataOptions)
    : Promise<T & RetrievedDocument & EntityDocument>;
}

/** Default id for singleton entities. */
export const single = "single";

export interface DocumentDbImplOptions {
  endpoint: string | Promise<string>;
  primaryKey: string | Promise<string>;
  databaseId: string | Promise<string>;
  collectionId: string | Promise<string>;
  entitySeparator?: string;
  collectionCreationOptions?: Partial<Collection>;
  defaultConsistencyLevel?: ConsistencyLevel;
}

export class DocumentDbImpl implements DocumentDb, CheckHealth {

  private readonly lazyClient = lazyAsync(
    async () => {
      return new DocumentClient(
        await this.options.endpoint,
        {
          masterKey: await this.options.primaryKey,
        });
    });

  public constructor(private readonly options: DocumentDbImplOptions) {
    if (!this.options.entitySeparator) {
      this.options.entitySeparator = "-";
    }
  }

  public async checkHealth() {
    const databaseId = await this.options.databaseId;
    const collectionId = await this.options.collectionId;
    return checkHealth(
      "DocumentDb",
      `${databaseId}/${collectionId}`,
      async () => {
        const client = await this.lazyClient();
        return new Promise((resolve, reject) => {
          client.createDatabase({ id: databaseId }, (dbErr) => {
            if (dbErr && dbErr.code !== HttpStatusCodes.CONFLICT) {
              return reject(dbErr);
            }

            const databaseLink = UriFactory.createDatabaseUri(databaseId);
            client.createCollection(
              databaseLink, { ...this.options.collectionCreationOptions, id: collectionId }, (collErr) => {
                if (collErr && collErr.code !== HttpStatusCodes.CONFLICT) {
                  return reject(collErr);
                }

                resolve();
              });
          });
        });
      });
  }

  public async delete(entity: string, id: string, options?: DocumentDbRequestOptions): Promise<void> {
    const client = await this.lazyClient();
    const documentUri = await this.documentUri(entity, id);
    const requestOptions: RequestOptions = options && options.requestOptions ? options.requestOptions : {};
    if (this.options.defaultConsistencyLevel && !requestOptions.consistencyLevel) {
      requestOptions.consistencyLevel = this.options.defaultConsistencyLevel;
    }
    return new Promise<void>((resolve, reject) => {
      client.deleteDocument(
        documentUri,
        requestOptions,
        (err) => {
          if (err) {
            return reject(err);
          }

          return resolve();
        });
    });
  }

  public async get(entity: string, id: string, options?: DocumentDbRequestOptions & MetadataOptions)
    : Promise<any> {
    const client = await this.lazyClient();
    const documentUri = await this.documentUri(entity, id);
    const requestOptions: RequestOptions = options && options.requestOptions ? options.requestOptions : {};
    if (this.options.defaultConsistencyLevel && !requestOptions.consistencyLevel) {
      requestOptions.consistencyLevel = this.options.defaultConsistencyLevel;
    }
    return new Promise<any>((resolve, reject) => {
      client.readDocument(
        documentUri,
        requestOptions,
        (err, doc) => {
          if (err) {
            if (err.code === HttpStatusCodes.NOT_FOUND) {
              return resolve(undefined);
            } else {
              return reject(err);
            }
          }

          return resolve(this.process(doc, entity, options && options.metadata) as any);
        });
    });
  }

  public async query(query: DocumentQuery | DocumentQueryProducer, options?: any): Promise<ContinuationArray<any>> {
    const client = await this.lazyClient();
    const collectionUri = await this.collectionUri();
    const documentQuery = this.getDocumentQuery(query);
    const feedOptions: FeedOptions = options && options.feedOptions ? options.feedOptions : {};
    if (this.options.defaultConsistencyLevel && !feedOptions.consistencyLevel) {
      feedOptions.consistencyLevel = this.options.defaultConsistencyLevel;
    }
    const continuation = options && options.nextToken ? decodeNextToken(options.nextToken)!.toString() : undefined;
    if (continuation && !feedOptions.continuation) {
      feedOptions.continuation = continuation;
    }

    return new Promise<ContinuationArray<any>>((resolve, reject) => {
      const queryResult = client.queryDocuments(
        collectionUri,
        documentQuery,
        feedOptions);

      queryResult.executeNext((err, docs, responseHeaders) => {
        if (err) {
          return reject(err);
        }

        let newNextToken: string | undefined;
        if (responseHeaders["x-ms-continuation"]) {
          newNextToken = encodeNextToken(responseHeaders["x-ms-continuation"]);
        }

        return resolve({
          items: docs.map((x) => this.process(x, undefined, options && options.metadata)) as any,
          nextToken: newNextToken,
        });
      });
    });
  }

  public async queryAll(query: DocumentQuery | DocumentQueryProducer, options?: any): Promise<any[]> {
    const client = await this.lazyClient();
    const collectionUri = await this.collectionUri();
    const documentQuery = this.getDocumentQuery(query);
    const feedOptions: FeedOptions = options && options.feedOptions ? options.feedOptions : {};
    if (this.options.defaultConsistencyLevel && !feedOptions.consistencyLevel) {
      feedOptions.consistencyLevel = this.options.defaultConsistencyLevel;
    }

    return new Promise<any[]>((resolve, reject) => {
      const queryResult = client.queryDocuments(
        collectionUri,
        documentQuery,
        feedOptions);

      queryResult.toArray((err, docs) => {
        if (err) {
          return reject(err);
        }

        return resolve(docs.map((x) => this.process(x, undefined, options && options.metadata)) as any);
      });
    });
  }

  public async set(document: any & EntityDocument & ETagDocument, options?: DocumentDbRequestOptions & MetadataOptions)
    : Promise<any> {
    const client = await this.lazyClient();
    const collectionUri = await this.collectionUri();

    if (!document.id.startsWith(document._entity)) {
      document.id = this.id(document._entity, document.id);
    }

    const etagOptions = document._etag
      ? { accessCondition: { condition: document._etag!, type: "IfMatch" } }
      : {};

    return new Promise<any>((resolve, reject) => {
      const documentOptions: DocumentOptions = {
        ...etagOptions,
        disableAutomaticIdGeneration: true,
        ...(options && options.requestOptions ? options.requestOptions : {}),
      };
      if (this.options.defaultConsistencyLevel && !documentOptions.consistencyLevel) {
        documentOptions.consistencyLevel = this.options.defaultConsistencyLevel;
      }

      client.upsertDocument(
        collectionUri,
        document,
        documentOptions,
        (err, doc) => {
          if (err) {
            if (err.code === HttpStatusCodes.PRECONDITION_FAILED) {
              return reject(
                conflictError(
                  `There has been a conflict while updating document ${document.id}. The ETag did not match.`,
                  {
                    etag: document._etag,
                  }));
            } else {
              return reject(err);
            }
          }

          return resolve(this.process(doc, document._entity, options && options.metadata));
        });
    });
  }

  private async collectionUri() {
    const databaseId = await this.options.databaseId;
    const collectionId = await this.options.collectionId;

    return UriFactory.createDocumentCollectionUri(databaseId, collectionId);
  }

  private async documentUri(entity: string, id: string) {
    const databaseId = await this.options.databaseId;
    const collectionId = await this.options.collectionId;

    return UriFactory.createDocumentUri(databaseId, collectionId, this.id(entity, id));
  }

  private id(entity: string, id: string) { return `${entity}${this.options.entitySeparator}${id}`; }

  private process(doc: RetrievedDocument, entity: string | undefined, metadata: boolean | undefined) {
    if (doc.id) {
      if (entity) {
        doc.id = doc.id.slice(entity.length + this.options.entitySeparator!.length);
      } else {
        if (doc._entity) {
          doc.id = doc.id.slice(doc._entity.length + this.options.entitySeparator!.length);
        } else {
          doc.id = doc.id.slice(doc.id.indexOf(this.options.entitySeparator!) + 1);
        }
      }
    }

    if (!metadata) {
      delete doc.ttl;
      Object.keys(doc).filter((k) => k.startsWith("_")).forEach((k) => { delete doc[k]; });
    }

    return doc;
  }

  private getDocumentQuery(query: DocumentQuery | DocumentQueryProducer): DocumentQuery {
    if (isDocumentQueryProducer(query)) {
      return query.toDocumentQuery();
    }

    return query;
  }
}
