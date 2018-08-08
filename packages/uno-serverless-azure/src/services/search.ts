import {
  ContinuationArray, decodeNextToken, encodeNextToken, HttpClient,
  httpClientFactory, lazyAsync, WithContinuation,
} from "uno-serverless";

export type AzureSearchIndexFieldType =
  "Edm.String" | "Collection(Edm.String)" | "Edm.Int32" | "Edm.Int64" | "Edm.Double"
  | "Edm.Boolean" | "Edm.DateTimeOffset" | "Edm.GeographyPoint";

export interface AzureSearchIndexField {
  name: string;
  type: AzureSearchIndexFieldType;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  facetable?: boolean;
  key?: boolean;
  retrievable?: boolean;
  analyzer?: string;
  searchAnalyzer?: string;
  indexAnalyzer?: string;
}

export interface AzureSearchSuggester {
  name: string;
  searchMode: "analyzingInfixMatching" | string;
  sourceFields: string[];
}

export interface AzureSearchScoringProfileFunction {
  type: "freshness" | "magnitude" | "distance" | "tag" | string;
  fieldName: string;
  boost: number;
  interpolation?: "constant" | "linear" | "quadratic" | "logarithmic" | string;
  magnitude?: {
    boostingRangeStart: number;
    boostingRangeEnd: number;
    constantBoostBeyondRange?: boolean;
  };
  freshness?: {
    boostingDuration: string;
  };
  distance?: {
    referencePointParameter: string;
    boostingDistance: number;
  };
  tag?: {
    tagsParameter: string;
  };
}

export interface AzureSearchScoringProfile {
  name: string;
  text?: {
    weights: Record<string, number>;
  };
  functions?: AzureSearchScoringProfileFunction[];
  functionAggregation?: "sum" | "average" | "minimum" | "maximum" | "firstMatching" | string;
}

/**
 * Schema for index definition
 * See https://docs.microsoft.com/en-us/rest/api/searchservice/create-index
 */
export interface AzureSearchIndexDefinition {
  fields: AzureSearchIndexField[];
  suggesters?: AzureSearchSuggester[];
  scoringProfiles?: AzureSearchScoringProfile[];
  analyzers?: any[];
  charFilters?: any[];
  tokenizers?: any[];
  tokenFilters?: any[];
  defaultScoringProfile?: string;
  corsOptions?: {
    allowedOrigins: string[];
    maxAgeInSeconds?: number;
  };
}

export interface AzureSearchClientOptions {
  apiKey: string | Promise<string>;
  apiVersion?: string | Promise<string | undefined>;
  /** true to base64-encode ids. Azure Search has some contraints on ids formats. */
  encodeIds?: boolean;
  url: string | Promise<string>;
}

export interface AzureSearchDocument {
  id: string;
  [x: string]: any;
}

export interface SetDocumentStatus {
  key: string;
  status: boolean;
  errorMessage?: string;
  statusCode: number;
}

export interface QueryOptions extends WithContinuation {
  searchMode?: "any" | "all";
  searchFields?: string[];
  queryType?: "simple" | "full";
  skip?: number;
  top?: number;
  count?: boolean;
  orderby?: string[];
  select?: string[];
  facets?: string[];
  filter?: string;
  highlight?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
  scoringProfile?: string;
  scoringParameters?: string[];
  minimumCoverage?: number;
}

export interface FacetResult {
  value?: any;
  from?: any;
  to?: any;
  count: number;
}

export interface SearchResultAttributes {
  score?: number;
  highlights?: Record<string, string[]>;
}

export interface SearchResult<T> extends ContinuationArray<T & SearchResultAttributes> {
  count?: number;
  coverage?: number;
  facets?: Record<string, FacetResult>;
}

export interface SuggestOptions {
  highlightPreTag?: string;
  highlightPostTag?: string;
  fuzzy?: boolean;
  searchFields?: string[];
  top?: number;
  filter?: string;
  orderby?: string[];
  select?: string[];
  minimumCoverage?: number;
}

export interface SuggestResultAttributes {
  text: string;
}

export interface SuggestResult<T> {
  coverage?: number;
  items: Array<T & SuggestResultAttributes>;
}

export type ExludedDocumentsProperties = SearchResultAttributes & SuggestResultAttributes;

export const DEFAULT_AZURE_SEARCH_API_VERSION = "2017-11-11";

export class AzureSearchClient {

  private readonly lazyClient = lazyAsync(async () => httpClientFactory({
    baseURL: this.options.url,
    headers: {
      "api-key": await this.options.apiKey,
    },
    params: {
      "api-version": await (this.options.apiVersion) || DEFAULT_AZURE_SEARCH_API_VERSION,
    },
  }));

  public constructor(private readonly options: AzureSearchClientOptions) { }

  /**
   * Gets the underlying, pre-configured HttpClient.
   * The baseUrl, api-key and api-version parameters are already set.
   */
  public async client(): Promise<HttpClient> {
    return this.lazyClient();
  }

  /** Create indexes definitions if they don't exist. */
  public async setIndexes(indexes: Record<string, AzureSearchIndexDefinition>): Promise<void> {
    const client = await this.lazyClient();
    for (const indexName of Object.keys(indexes)) {
      const indexDefinition = indexes[indexName];
      if (indexDefinition.fields.filter((x) => x.key).length === 0) {
        indexDefinition.fields.push({
          key: true,
          name: "id",
          retrievable: true,
          searchable: false,
          type: "Edm.String",
        });
      }
      await client.put(`indexes/${indexName}`, indexes[indexName]);
    }
  }

  /** Merge or upload documents */
  public async set(index: string, ...docs: Array<Exclude<AzureSearchDocument, ExludedDocumentsProperties>>)
    : Promise<SetDocumentStatus[]> {
    const client = await this.lazyClient();
    const response = await client.post(
      `/indexes/${index}/docs/index`,
      {
        value: docs.map((x) => {
          const message = { ...x, "@search.action": "mergeOrUpload" };
          if (this.options.encodeIds) {
            message.id = Buffer.from(x.id).toString("base64");
          }

          return message;
        }),
      });
    return response.data.value || [];
  }

  public async delete(index: string, ...ids: string[]): Promise<SetDocumentStatus[]> {
    const client = await this.lazyClient();
    const response = await client.post(
      `/indexes/${index}/docs/index`,
      {
        value: ids.map((x) => ({
          "@search.action": "delete",
          "id": this.options.encodeIds ? Buffer.from(x).toString("base64") : x,
        })),
      });
    return response.data.value || [];
  }

  public async search<T>(index: string, search: string, options: QueryOptions = {}): Promise<SearchResult<T>> {
    const client = await this.lazyClient();
    const {
      facets,
      highlight,
      scoringParameters,
      searchFields,
      select,
      nextToken,
      orderby,
      ...filteredOptions } = options;
    const submittedOptions = nextToken
      ? decodeNextToken(nextToken)
      : {
        ...filteredOptions,
        facets: facets && facets.join(","),
        highlight: highlight && highlight.join(","),
        orderby: orderby && orderby.join(","),
        scoringParameters: scoringParameters && scoringParameters.join(","),
        search,
        searchFields: searchFields && searchFields.join(","),
        select: select && select.join(","),
      };

    const response = await client.post(`/indexes/${index}/docs/search`, submittedOptions);

    return {
      count: response.data["@odata.count"],
      coverage: response.data["@search.coverage"],
      facets: response.data["@search.facets"],
      items: response.data.value.map((x) => {
        const score = x["@search.score"];
        let highlights = x["@search.highlights"];
        delete x["@search.score"];
        delete x["@search.highlights"];

        if (this.options.encodeIds && x.id) {
          x.id = Buffer.from(x.id, "base64").toString();
        }

        if (highlights) {
          highlights = Object.keys(highlights)
            .filter((y) => !y.endsWith("@odata.type"))
            .reduce((acc, cur) => { acc[cur] = highlights[cur]; return acc; }, {});
        }

        return {
          highlights,
          score,
          ...x,
        };
      }),
      nextToken:
        response.data["@search.nextPageParameters"] && encodeNextToken(response.data["@search.nextPageParameters"]),
    };
  }

  public async suggest<T>(index: string, suggesterName: string, search: string, options: SuggestOptions = {})
    : Promise<SuggestResult<T>> {

    const client = await this.lazyClient();
    const {
      searchFields,
      select,
      orderby,
      ...filteredOptions } = options;

    const response = await client.post(
      `/indexes/${index}/docs/suggest`,
      {
        ...filteredOptions,
        orderby: orderby && orderby.join(","),
        search,
        searchFields: searchFields && searchFields.join(","),
        select: select && select.join(","),
        suggesterName,
      });

    return {
      coverage: response.data["@search.coverage"],
      items: response.data.value.map((x) => {
        const text = x["@search.text"];
        delete x["@search.text"];

        if (this.options.encodeIds && x.id) {
          x.id = Buffer.from(x.id, "base64").toString();
        }

        return {
          text,
          ...x,
        };
      }),
    };
  }

}
