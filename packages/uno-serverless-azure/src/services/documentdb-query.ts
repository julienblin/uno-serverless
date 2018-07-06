import { DocumentQuery, SqlParameter } from "documentdb";

export enum Direction {
  ASC,
  DESC,
}

export interface DocumentQueryProducer {
  /** Gets the final DocumentQuery. */
  toDocumentQuery(): DocumentQuery;
}

export interface DocumentQueryBuilder extends DocumentQueryProducer {
  /** Filters by entity type (e.g. products, users...) */
  entity(value: string): DocumentQueryBuilder;

  /** Adds a where condition. All conditions are joined using AND. */
  where(value: string, parameters?: Record<string, any>): DocumentQueryBuilder;

  /** Adds a where condition. All conditions are joined using AND. */
  and(value: string, parameters?: Record<string, any>): DocumentQueryBuilder;

  /** Adds an order by condition. Defaults to ASC. */
  orderBy(value: string, direction?: Direction): DocumentQueryBuilder;
}

class DocumentQueryBuilderImpl implements DocumentQueryBuilder {

  private readonly whereConditions: string[] = [];
  private readonly sqlParameters: SqlParameter[] = [];
  private readonly orderByConditions: string[] = [];

  public constructor(private readonly selectValue: string, private readonly from: string) {}

  public entity(value: string): DocumentQueryBuilder {
    this.whereConditions.push(`${this.from}._entity = "${value}"`);
    return this;
  }

  public where(value: string, parameters?: Record<string, any>): DocumentQueryBuilder {
    this.whereConditions.push(value);
    if (parameters) {
      Object.entries(parameters).forEach((x) => {
        this.sqlParameters.push({ name: `@${x[0]}`, value: x[1]  });
      });
    }
    return this;
  }

  public and(value: string, parameters?: Record<string, any>): DocumentQueryBuilder {
    return this.where(value, parameters);
  }

  public orderBy(value: string, direction = Direction.ASC): DocumentQueryBuilder {
    this.orderByConditions.push(`${value} ${direction === Direction.ASC ? "ASC" : "DESC"}`);
    return this;
  }

  public toDocumentQuery(): DocumentQuery {
    let query = `SELECT ${this.selectValue} FROM ${this.from}`;
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(" AND ")}`;
    }
    if (this.orderByConditions.length > 0) {
      query += ` ORDER BY ${this.orderByConditions.join(", ")}`;
    }

    return {
      parameters: this.sqlParameters,
      query,
    };
  }
}

/** Starts a query builder. */
export const select = (selectValue = "*", from = "root") => new DocumentQueryBuilderImpl(selectValue, from);
