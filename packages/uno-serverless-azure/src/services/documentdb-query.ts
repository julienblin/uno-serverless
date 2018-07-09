import { DocumentQuery, UniqueId } from "documentdb";

export interface EntityDocument extends UniqueId {
  /** The entity type (e.g. products, users...) */
  _entity: string;
}

export enum Direction {
  ASC,
  DESC,
}

export interface DocumentQueryProducer {
  /** Gets the final DocumentQuery. */
  toDocumentQuery(): DocumentQuery;
}

export const isDocumentQueryProducer = (query: any): query is DocumentQueryProducer =>
  (typeof query === "object" && typeof query !== "string" && "toDocumentQuery" in query);

export enum Operator {
  Eq = "=",
  Gt = ">",
  Gte = ">=",
  Lt = "<",
  Lte = "<=",
  In = "In",
  Contains = "CONTAINS",
  StartsWith = "STARTSWITH",
  EndsWith = "ENDSWITH",
  ArrayContains = "ARRAY_CONTAINS",
}

export type ArrayOrArrayElement<T> = T | T[];

export type EntityWhereConditions<T> = {
  [P in keyof Partial<T>]: ArrayOrArrayElement<T[P]> | [ArrayOrArrayElement<T[P]>, Operator];
};

export type EntityOrderByConditions<T> = {
  [P in keyof Partial<T>]: Direction;
};

export interface DocumentQueryBuilder extends DocumentQueryProducer {
  /** Filters by entity type (e.g. products, users...) */
  entity(value: string): DocumentQueryBuilder;

  /** Adds a where condition. All conditions are joined using AND. */
  where(
    value: string,
    parameters?: Record<string, any>): DocumentQueryBuilder;
  /** Adds a where condition. All conditions are joined using AND. */
  where<T>(value: EntityWhereConditions<T>): DocumentQueryBuilder;

  /** Adds an order by condition. Defaults to ASC. */
  orderBy(value: string, direction?: Direction): DocumentQueryBuilder;
  /** Adds an order by condition. Defaults to ASC. */
  orderBy<T>(value: EntityOrderByConditions<T>): DocumentQueryBuilder;

  /**
   * Alternative to orderBy where "name" means ASC and "-name" means DESC.
   * Generally more useful when interacting from an API / query strings.
   */
  sort(value: string): DocumentQueryBuilder;
}

class DocumentQueryBuilderImpl implements DocumentQueryBuilder {

  private readonly whereConditions: string[] = [];
  private readonly sqlParameters: Record<string, any> = {};
  private readonly orderByConditions: string[] = [];

  public constructor(private readonly selectValue: string, private readonly from: string) { }

  public entity(value: string): DocumentQueryBuilder {
    return this.where<EntityDocument>({ _entity: value });
  }

  public where<T = any>(
    value: string | EntityWhereConditions<T>,
    parameters?: Record<string, any>): DocumentQueryBuilder {

    if (typeof value === "string") {
      this.whereConditions.push(value);
      if (parameters) {
        Object.entries(parameters).forEach((x) => {
          const parameterName = `@${x[0]}`;
          if (this.sqlParameters[parameterName]) {
            throw new Error(
              `A parameter named ${parameterName} already exits. (for ${this.sqlParameters[parameterName]}, ${x[1]})`);
          }
          this.sqlParameters[parameterName] = x[1];
        });
      }
      return this;
    } else {
      Object.entries(value).forEach((entry) => {
        const queryParts = this.resolveQueryParts(entry);
        switch (queryParts.operator) {
          case Operator.Eq:
          case Operator.Gt:
          case Operator.Gte:
          case Operator.Lt:
          case Operator.Lte:
            this.where(
              `${queryParts.leftPath} ${queryParts.operator} @${queryParts.parameterName}`,
              { [queryParts.parameterName]: queryParts.parameterValue });
            break;
          case Operator.In:
            if (!Array.isArray(queryParts.parameterValue)) {
              throw new Error("The parameter value for a IN clause must be an array.");
            }

            const parameterNames = queryParts.parameterValue.map((_, i) => `@${queryParts.parameterName}${i}`);
            this.whereConditions.push(`${queryParts.leftPath} IN (${parameterNames.join(", ")})`);
            queryParts.parameterValue.forEach((x, i) => {
              this.sqlParameters[parameterNames[i]] = x;
            });
            break;
          case Operator.Contains:
          case Operator.StartsWith:
          case Operator.EndsWith:
          case Operator.ArrayContains:
            this.where(
              `${queryParts.operator}(${queryParts.leftPath}, @${queryParts.parameterName})`,
              { [queryParts.parameterName]: queryParts.parameterValue });
            break;
        }
      });
      return this;
    }
  }

  public orderBy<T = any>(value: string | EntityOrderByConditions<T>, direction = Direction.ASC): DocumentQueryBuilder {
    if (typeof value === "string") {
      this.orderByConditions.push(`${value} ${direction === Direction.ASC ? "ASC" : "DESC"}`);
    } else {
      Object.entries(value).forEach((entry) => {
        const leftPath: string[] = [this.from, entry[0]];
        this.orderBy(`${leftPath.join(".")}`, entry[1] as Direction);
      });
    }
    return this;
  }

  public sort(value: string): DocumentQueryBuilder {
    const isDESC = value.startsWith("-");
    const propertyName = isDESC ? value.slice(1) : value;
    return this.orderBy(`${this.from}.${propertyName}`, isDESC ? Direction.DESC : Direction.ASC);
  }

  public toDocumentQuery(): DocumentQuery {
    let query = `SELECT ${this.selectValue} FROM ${this.from}`;
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(" AND ")}`;
    }
    if (this.orderByConditions.length > 0) {
      query += ` ORDER BY ${this.orderByConditions.join(", ")}`;
    }

    const sqlParameterKeys = Object.keys(this.sqlParameters);
    if (sqlParameterKeys.length > 0) {
      return {
        parameters: sqlParameterKeys.map((x) => ({ name: x, value: this.sqlParameters[x] })),
        query,
      };
    }

    return query;
  }

  private resolveQueryParts(entry: [string, any]) {
    return {
      leftPath: [this.from, entry[0]].join("."),
      operator: Array.isArray(entry[1]) ? entry[1][1] : Operator.Eq,
      parameterName: entry[0],
      parameterValue: Array.isArray(entry[1]) ? entry[1][0] : entry[1],
    };
  }
}

/** Starts a query builder. */
export const select = (selectValue = "*", from = "root") => new DocumentQueryBuilderImpl(selectValue, from);
