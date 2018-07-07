import {
  Collection, DocumentClient, DocumentQuery,
  FeedOptions, RequestOptions, RetrievedDocument, UniqueId, UriFactory } from "documentdb";
import * as HttpStatusCodes from "http-status-codes";
import {
  CheckHealth, checkHealth, ContinuationArray, decodeNextToken,
  encodeNextToken, lazyAsync, WithContinuation } from "uno-serverless";
import { DocumentQueryProducer, isDocumentQueryProducer } from "./documentdb-query";

export interface EntityDocument extends UniqueId {
  /** The entity type (e.g. products, users...) */
  _entity: string;
}

export interface DocumentDbRequestOptions {
  requestOptions?: RequestOptions;
}

export interface DocumentDbFeedOptions {
  /** DocumentDb feed options */
  feedOptions?: FeedOptions;
}

export interface AdditionalPropertiesOptions {
  /** True keep all properties starting with _ (owned by DocumentDb) */
  additionalProperties: true;
}

export interface DocumentDb {
  /** Delete a document by entity type and id. */
  delete(entity: string, id: string, options?: DocumentDbRequestOptions): Promise<void>;

  /** Get a document by entity type and id. */
  get<T>(entity: string, id: string, options?: DocumentDbRequestOptions)
    : Promise<T | undefined>;
  /** Get a document by entity type and id. */
  get<T>(entity: string, id: string, options: DocumentDbRequestOptions & AdditionalPropertiesOptions)
    : Promise<T & RetrievedDocument & EntityDocument | undefined>;

  /** Paginated query. */
  query<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options?: WithContinuation & DocumentDbFeedOptions)
    : Promise<ContinuationArray<T>>;
  /** Paginated query. */
  query<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options: WithContinuation & DocumentDbFeedOptions & AdditionalPropertiesOptions)
    : Promise<ContinuationArray<T & RetrievedDocument & EntityDocument>>;

  /** Non-paginated query - all results returned. */
  queryAll<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options?: DocumentDbFeedOptions)
    : Promise<T[]>;
  /** Non-paginated query - all results returned. */
  queryAll<T>(
    query: DocumentQuery | DocumentQueryProducer,
    options: DocumentDbFeedOptions & AdditionalPropertiesOptions)
    : Promise<Array<T & RetrievedDocument & EntityDocument>>;

  /** Create or update a document. */
  set<T>(document: T & EntityDocument, options?: DocumentDbRequestOptions): Promise<T>;
  /** Create or update a document. */
  set<T>(document: T & EntityDocument, options: DocumentDbRequestOptions & AdditionalPropertiesOptions)
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
}

export class DocumentDbImpl implements DocumentDb, CheckHealth {

  private readonly lazyClient = lazyAsync(
    async () => {
      const endpoint = await this.options.endpoint;

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

    return new Promise<void>((resolve, reject) => {
      client.deleteDocument(
        documentUri,
        options && options.requestOptions ? options.requestOptions : {},
        (err) => {
          if (err) {
            return reject(err);
          }

          return resolve();
        });
    });
  }

  public async get(entity: string, id: string, options?: DocumentDbRequestOptions & AdditionalPropertiesOptions)
    : Promise<any> {
    const client = await this.lazyClient();
    const documentUri = await this.documentUri(entity, id);

    return new Promise<any>((resolve, reject) => {
      client.readDocument(
        documentUri,
        options && options.requestOptions ? options.requestOptions : {},
        (err, doc) => {
        if (err) {
          if (err.code === HttpStatusCodes.NOT_FOUND) {
            return resolve(undefined);
          } else {
            return reject(err);
          }
        }

        return resolve(this.process(doc, entity, options && options.additionalProperties) as any);
      });
    });
  }

  public async query(query: DocumentQuery | DocumentQueryProducer, options?: any): Promise<ContinuationArray<any>> {
    const client = await this.lazyClient();
    const collectionUri = await this.collectionUri();
    const documentQuery = this.getDocumentQuery(query);
    const continuation = options && options.nextToken ? decodeNextToken(options.nextToken)!.toString() : undefined;

    return new Promise<ContinuationArray<any>>((resolve, reject) => {
      const queryResult = client.queryDocuments(
        collectionUri,
        documentQuery,
        {
          continuation,
          ...(options && options.feedOptions),
        });

      queryResult.executeNext((err, docs, responseHeaders) => {
        if (err) {
          return reject(err);
        }

        let newNextToken: string | undefined;
        if (responseHeaders["x-ms-continuation"]) {
          newNextToken = encodeNextToken(responseHeaders["x-ms-continuation"]);
        }

        return resolve({
          items: docs.map((x) => this.process(x, undefined, options && options.additionalProperties)) as any,
          nextToken: newNextToken,
        });
      });
    });
  }

  public async queryAll(query: DocumentQuery | DocumentQueryProducer, options?: any): Promise<any[]> {
    const client = await this.lazyClient();
    const collectionUri = await this.collectionUri();
    const documentQuery = this.getDocumentQuery(query);

    return new Promise<any[]>((resolve, reject) => {
      const queryResult = client.queryDocuments(
        collectionUri,
        documentQuery,
        options && options.feedOptions);

      queryResult.toArray((err, docs) => {
        if (err) {
          return reject(err);
        }

        return resolve(docs.map((x) => this.process(x, undefined, options && options.additionalProperties)) as any);
      });
    });
  }

  public async set(document: any & EntityDocument, options?: DocumentDbRequestOptions & AdditionalPropertiesOptions)
    : Promise<any> {
    const client = await this.lazyClient();
    const collectionUri = await this.collectionUri();

    if (!document.id.startsWith(document._entity)) {
      document.id = this.id(document._entity, document.id);
    }

    return new Promise<any>((resolve, reject) => {
      client.upsertDocument(
        collectionUri,
        document,
        {
          ...(options && options.requestOptions ? options.requestOptions : {}),
          disableAutomaticIdGeneration: true,
        },
        (err, doc) => {
        if (err) {
          return reject(err);
        }

        return resolve(this.process(doc, document._entity, options && options.additionalProperties));
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

  private process(doc: RetrievedDocument, entity: string | undefined, additionalProperties: boolean | undefined) {
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

    if (!additionalProperties) {
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
