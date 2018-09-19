import {
  Collection, ConsistencyLevel, DocumentClient,
  DocumentOptions, DocumentQuery, FeedOptions, RequestOptions, RetrievedDocument, UniqueId, UriFactory,
} from "documentdb";
import {
  CheckHealth, checkHealth, conflictError, ContinuationArray,
  debug, decodeNextToken, encodeNextToken, HttpStatusCodes, lazyAsync, WithContinuation,
} from "uno-serverless";
import {
  DocumentQueryProducer, ENTITY_TYPE_SEPARATOR, EntityDocument, isDocumentQueryProducer,
} from "./documentdb-query";

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

export interface SetOptions {
  /**
   * If set to false, the operation will fail if the document id exists.
   * Defaults to true.
   */
  overwrite?: boolean;
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
  set<T>(document: T & EntityDocument & ETagDocument, options?: DocumentDbRequestOptions & SetOptions): Promise<T>;
  /**
   * Create or update a document.
   * Will honor ETag concurrency validation if document has an _etag property.
   */
  set<T>(document: T & EntityDocument & ETagDocument, options: DocumentDbRequestOptions & SetOptions & MetadataOptions)
    : Promise<T & RetrievedDocument & EntityDocument>;
}

/** Default id for singleton entities. */
export const single = "single";

export interface DocumentDbImplOptions {
  collectionCreationOptions?: Partial<Collection>;
  collectionId: string | Promise<string>;
  databaseId: string | Promise<string>;
  debug?: boolean | Promise<boolean>;
  defaultConsistencyLevel?: ConsistencyLevel;
  endpoint: string | Promise<string>;
  primaryKey: string | Promise<string>;
}

const DOCUMENT_DB_NAME = "DocumentDb";

export class DocumentDbImpl implements DocumentDb, CheckHealth {

  private readonly lazyClient = lazyAsync(
    async () => {
      return new DocumentClient(
        await this.options.endpoint,
        {
          masterKey: await this.options.primaryKey,
        });
    });

  public constructor(private readonly options: DocumentDbImplOptions) { }

  public async checkHealth() {
    const databaseId = await this.options.databaseId;
    const collectionId = await this.options.collectionId;
    return checkHealth(
      DOCUMENT_DB_NAME,
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
    const debugEnabled = await this.options.debug;

    return new Promise<void>((resolve, reject) => {
      client.deleteDocument(
        documentUri,
        requestOptions,
        (err, _, headers) => {
          if (debugEnabled) {
            debug(DOCUMENT_DB_NAME, "cyan", `DELETE ${headers["content-location"]}`);
          }
          if (err) {
            if (debugEnabled) {
              debug(DOCUMENT_DB_NAME, "red", err);
            }
            return reject(err);
          }

          if (debugEnabled) {
            this.debugHeaders(headers);
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
    const debugEnabled = await this.options.debug;
    return new Promise<any>((resolve, reject) => {
      client.readDocument(
        documentUri,
        requestOptions,
        (err, doc, headers) => {
          if (debugEnabled) {
            debug(DOCUMENT_DB_NAME, "cyan", `GET ${headers["content-location"]}`);
          }

          if (err) {
            if (err.code === HttpStatusCodes.NOT_FOUND) {
              debug(DOCUMENT_DB_NAME, "green", "NOT_FOUND");
              return resolve(undefined);
            } else {
              debug(DOCUMENT_DB_NAME, "red", err);
              return reject(err);
            }
          }

          const result = this.process(doc, entity, options && options.metadata) as any;
          if (debugEnabled) {
            debug(DOCUMENT_DB_NAME, "green", result);
            this.debugHeaders(headers);
          }

          return resolve(result);
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

    const debugEnabled = await this.options.debug;

    return new Promise<ContinuationArray<any>>((resolve, reject) => {
      const queryResult = client.queryDocuments(
        collectionUri,
        documentQuery,
        feedOptions);

      queryResult.executeNext((err, docs, responseHeaders) => {
        if (debugEnabled) {
          debug(DOCUMENT_DB_NAME, "cyan", documentQuery);
        }

        if (err) {
          if (debugEnabled) {
            debug(DOCUMENT_DB_NAME, "red", err);
          }
          return reject(err);
        }

        let newNextToken: string | undefined;
        if (responseHeaders["x-ms-continuation"]) {
          newNextToken = encodeNextToken(responseHeaders["x-ms-continuation"]);
        }

        const result = {
          items: docs.map((x) => this.process(x, undefined, options && options.metadata)) as any,
          nextToken: newNextToken,
        };

        if (debugEnabled) {
          debug(DOCUMENT_DB_NAME, "green", result);
          this.debugHeaders(responseHeaders);
        }

        return resolve(result);
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
    const debugEnabled = await this.options.debug;

    return new Promise<any[]>((resolve, reject) => {
      const queryResult = client.queryDocuments(
        collectionUri,
        documentQuery,
        feedOptions);

      if (debugEnabled) {
        debug(DOCUMENT_DB_NAME, "cyan", documentQuery);
      }

      queryResult.toArray((err, docs, responseHeaders) => {
        if (err) {
          if (debugEnabled) {
            debug(DOCUMENT_DB_NAME, "red", err);
          }
          return reject(err);
        }

        const result = docs.map((x) => this.process(x, undefined, options && options.metadata)) as any;

        if (debugEnabled) {
          debug(DOCUMENT_DB_NAME, "green", result);
          if (responseHeaders) {
            this.debugHeaders(responseHeaders);
          } else {
            debug(DOCUMENT_DB_NAME, "yellow", "No response headers. Be careful to use queryAll only when appropriate.");
          }
        }

        return resolve(result);
      });
    });
  }

  public async set(
    document: any & EntityDocument & ETagDocument,
    options?: DocumentDbRequestOptions & SetOptions & MetadataOptions)
    : Promise<any> {
    const client = await this.lazyClient();
    const collectionUri = await this.collectionUri();

    if (!document.id.startsWith(document._entity)) {
      document.id = this.id(document._entity, document.id);
    }

    const etagOptions = document._etag
      ? { accessCondition: { condition: document._etag!, type: "IfMatch" } }
      : {};

    const debugEnabled = await this.options.debug;

    return new Promise<any>((resolve, reject) => {
      const documentOptions: DocumentOptions = {
        ...etagOptions,
        disableAutomaticIdGeneration: true,
        ...(options && options.requestOptions ? options.requestOptions : {}),
      };
      if (this.options.defaultConsistencyLevel && !documentOptions.consistencyLevel) {
        documentOptions.consistencyLevel = this.options.defaultConsistencyLevel;
      }

      const method = options && options.overwrite === false ? "createDocument" : "upsertDocument";

      client[method](
        collectionUri,
        document,
        documentOptions,
        (err, doc, headers) => {
          if (debugEnabled) {
            debug(DOCUMENT_DB_NAME, "cyan", `SET ${collectionUri}/${document.id}`);
          }

          if (err) {
            switch (err.code) {
              case HttpStatusCodes.PRECONDITION_FAILED:
                if (debugEnabled) {
                  debug(DOCUMENT_DB_NAME, "red", `PRECONDITION_FAILED`);
                }
                return reject(
                  conflictError(
                    `There has been a conflict while updating document ${document.id}. The ETag did not match.`,
                    {
                      etag: document._etag,
                    }));
              case HttpStatusCodes.CONFLICT:
                if (debugEnabled) {
                  debug(DOCUMENT_DB_NAME, "red", `CONFLICT`);
                }
                return reject(
                  conflictError(`The document with id ${document.id} already exists.`));
              default:
                if (debugEnabled) {
                  debug(DOCUMENT_DB_NAME, "red", err);
                }
                return reject(err);
            }
          }

          const result = this.process(doc, document._entity, options && options.metadata);
          if (debugEnabled) {
            debug(DOCUMENT_DB_NAME, "green", result);
            this.debugHeaders(headers);
          }
          return resolve(result);
        });
    });
  }

  private async collectionUri() {
    const databaseId = await this.options.databaseId;
    const collectionId = await this.options.collectionId;

    return UriFactory.createDocumentCollectionUri(databaseId, collectionId);
  }

  private debugHeaders(headers: any) {
    if (headers) {
      debug(
        DOCUMENT_DB_NAME,
        "grey",
        // tslint:disable-next-line:max-line-length
        `RU: ${headers["x-ms-request-charge"]} / Retry count: ${headers["x-ms-throttle-retry-count"]} / Session: ${headers["x-ms-session-token"]} / Activity id: ${headers["x-ms-activity-id"]}`);
    }
  }

  private async documentUri(entity: string, id: string) {
    const databaseId = await this.options.databaseId;
    const collectionId = await this.options.collectionId;

    return UriFactory.createDocumentUri(databaseId, collectionId, this.id(entity, id));
  }

  private id(entity: string, id: string) { return `${entity}${ENTITY_TYPE_SEPARATOR}${id}`; }

  private process(doc: RetrievedDocument, entity: string | undefined, metadata: boolean | undefined) {
    if (doc.id) {
      if (entity) {
        doc.id = doc.id.slice(entity.length + ENTITY_TYPE_SEPARATOR.length);
      } else {
        if (doc._entity) {
          doc.id = doc.id.slice(doc._entity.length + ENTITY_TYPE_SEPARATOR.length);
        } else {
          doc.id = doc.id.slice(doc.id.indexOf(ENTITY_TYPE_SEPARATOR) + 1);
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
