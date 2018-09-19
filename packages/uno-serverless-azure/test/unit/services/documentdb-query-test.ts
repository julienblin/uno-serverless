import { expect } from "chai";
import { Direction, Operator, select } from "../../../src/services/documentdb-query";

describe("DocumentQueryBuilderImpl", () => {

  interface Address {
    city: string;
    street: string;
  }

  interface Order {
    address: Address;
    createdAt: number;
    id: string;
    name: string;
    states: string[];
  }

  [
    {
      query: select(),
      result: "SELECT * FROM root",
    },
    {
      query: select("TOP 10 states", "foo"),
      result: "SELECT TOP 10 states FROM foo",
    },
    {
      query: select().entity("orders"),
      result: {
        parameters: [
          { name: "@_entity", value: "orders" },
        ],
        query: `SELECT * FROM root WHERE (root._entity = @_entity)`,
      },
    },
    {
      query: select().where(`root.name = "foobar"`),
      result: `SELECT * FROM root WHERE (root.name = "foobar")`,
    },
    {
      query: select().where(`root.name = "foobar"`).where(`root._ts > 12345`),
      result: `SELECT * FROM root WHERE (root.name = "foobar") AND (root._ts > 12345)`,
    },
    {
      query: select().where(`root.name = @param1`, { param1: "foobar" }).where(`root._ts > @param2`, { param2: 12345 }),
      result: {
        parameters: [
          { name: "@param1", value: "foobar" },
          { name: "@param2", value: 12345 },
        ],
        query: `SELECT * FROM root WHERE (root.name = @param1) AND (root._ts > @param2)`,
      },
    },
    {
      query: select().orderBy("root.name"),
      result: `SELECT * FROM root ORDER BY root.name ASC`,
    },
    {
      query: select().orderBy<Order>({ name: Direction.ASC }),
      result: `SELECT * FROM root ORDER BY root.name ASC`,
    },
    {
      query: select().orderBy("root.name", Direction.DESC),
      result: `SELECT * FROM root ORDER BY root.name DESC`,
    },
    {
      query: select().orderBy<Order>({ name: Direction.DESC }),
      result: `SELECT * FROM root ORDER BY root.name DESC`,
    },
    {
      query: select().sort("name"),
      result: `SELECT * FROM root ORDER BY root.name ASC`,
    },
    {
      query: select().sort("-name"),
      result: `SELECT * FROM root ORDER BY root.name DESC`,
    },
    {
      query: select().where<Order>({ name: "foobar" }),
      result: {
        parameters: [
          { name: "@name", value: "foobar" },
        ],
        query: `SELECT * FROM root WHERE (root.name = @name)`,
      },
    },
    {
      query: select().where<Order>({ id: "foobar" }),
      result: {
        parameters: [
          { name: "@id", value: "foobar" },
        ],
        query: `SELECT * FROM root WHERE (root.id = @id)`,
      },
    },
    {
      query: select().entity("orders").where<Order>({ id: "foobar" }),
      result: {
        parameters: [
          { name: "@_entity", value: "orders" },
          { name: "@id", value: "orders-foobar" },
        ],
        query: `SELECT * FROM root WHERE (root._entity = @_entity) AND (root.id = @id)`,
      },
    },
    {
      query: select().where<Order>({ name: [Operator.Neq, "foobar"] }),
      result: {
        parameters: [
          { name: "@name", value: "foobar" },
        ],
        query: `SELECT * FROM root WHERE (root.name != @name)`,
      },
    },
    {
      query: select().where<Order>({ name: [ Operator.In, ["foo", "bar"]] }),
      result: {
        parameters: [
          { name: "@name0", value: "foo" },
          { name: "@name1", value: "bar" },
        ],
        query: `SELECT * FROM root WHERE (root.name IN (@name0, @name1))`,
      },
    },
    {
      query: select().entity("orders").where<Order>({ id: [ Operator.In, ["foo", "bar"]] }),
      result: {
        parameters: [
          { name: "@_entity", value: "orders" },
          { name: "@id0", value: "orders-foo" },
          { name: "@id1", value: "orders-bar" },
        ],
        query: `SELECT * FROM root WHERE (root._entity = @_entity) AND (root.id IN (@id0, @id1))`,
      },
    },
    {
      query: select().where<Order>({ name: [ Operator.In, []] }),
      result: "SELECT * FROM root WHERE (1=0)",
    },
    {
      query: select().where<Order>({ name: [ Operator.Contains, "foo" ] }),
      result: {
        parameters: [
          { name: "@name", value: "foo" },
        ],
        query: `SELECT * FROM root WHERE (CONTAINS(root.name, @name))`,
      },
    },
    {
      query: select().where<Order>({ name: [ Operator.StartsWith, "foo" ] }),
      result: {
        parameters: [
          { name: "@name", value: "foo" },
        ],
        query: `SELECT * FROM root WHERE (STARTSWITH(root.name, @name))`,
      },
    },
    {
      query: select().where<Order>({ name: [ Operator.EndsWith, "foo" ] }),
      result: {
        parameters: [
          { name: "@name", value: "foo" },
        ],
        query: `SELECT * FROM root WHERE (ENDSWITH(root.name, @name))`,
      },
    },
    {
      query: select().entity("orders").where<Order>({ name: "foobar" }).where<Order>({ createdAt: 12345 }),
      result: {
        parameters: [
          { name: "@_entity", value: "orders" },
          { name: "@name", value: "foobar" },
          { name: "@createdAt", value: 12345 },
        ],
        // tslint:disable-next-line:max-line-length
        query: `SELECT * FROM root WHERE (root._entity = @_entity) AND (root.name = @name) AND (root.createdAt = @createdAt)`,
      },
    },
    {
      query: select().entity("orders").where<Order>({ name: "foobar", createdAt: 12345 }),
      result: {
        parameters: [
          { name: "@_entity", value: "orders" },
          { name: "@name", value: "foobar" },
          { name: "@createdAt", value: 12345 },
        ],
        // tslint:disable-next-line:max-line-length
        query: `SELECT * FROM root WHERE (root._entity = @_entity) AND (root.name = @name) AND (root.createdAt = @createdAt)`,
      },
    },
    {
      query: select().where<Order>({ createdAt: [ Operator.Gt, 12345 ] }),
      result: {
        parameters: [
          { name: "@createdAt", value: 12345 },
        ],
        query: `SELECT * FROM root WHERE (root.createdAt > @createdAt)`,
      },
    },
    {
      query: select().where<Order>({ createdAt: [ Operator.Lt, 12345 ] }),
      result: {
        parameters: [
          { name: "@createdAt", value: 12345 },
        ],
        query: `SELECT * FROM root WHERE (root.createdAt < @createdAt)`,
      },
    },
    {
      query: select()
        .where<Order>({ createdAt: [ Operator.Gt, 12345 ] })
        .where<Order>({ createdAt: [ Operator.Lt, 54321 ] }),
      result: {
        parameters: [
          { name: "@createdAt", value: 12345 },
          { name: "@createdAt1", value: 54321 },
        ],
        query: `SELECT * FROM root WHERE (root.createdAt > @createdAt) AND (root.createdAt < @createdAt1)`,
      },
    },
    {
      query: select().where<Order>({ states: [ Operator.ArrayContains, "florida" ] }),
      result: {
        parameters: [
          { name: "@states", value: "florida" },
        ],
        query: `SELECT * FROM root WHERE (ARRAY_CONTAINS(root.states, @states))`,
      },
    },
  ].forEach((x: any) => {
    it("should generate queries", () => {
      const query = x.query;
      const documentQuery = query.toDocumentQuery();
      if (typeof documentQuery === "string") {
        expect(documentQuery.toString()).to.equal(x.result);
      } else {
        expect(documentQuery.query).to.equal(x.result.query);
        expect(documentQuery.parameters).to.deep.equal(x.result.parameters);
      }
    });
  });

});
