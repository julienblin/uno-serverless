import { expect } from "chai";
import { createCacheKey, InMemoryCache } from "../../../src/services/cache";

describe("InMemoryCache", () => {

  it("should fetch when disabled", async () => {
    const cache = new InMemoryCache({ defaultTtl: 0 });
    let fetched = false;
    const result = await cache.getOrFetch("key", async () => {
      fetched = true;

      return 0; });

    expect(result).equal(0);
    expect(fetched).be.true;
  });

  it("should fetch and cache", async () => {
    const cache = new InMemoryCache({ defaultTtl: 5 });
    let fetched = 0;
    let result = await cache.getOrFetch("key", async () => {
      ++fetched;

      return 0; });

    expect(result).equal(0);
    expect(fetched).equal(1);
    result = await cache.getOrFetch("key", async () => {
      ++fetched;

      return 0; });

    expect(result).equal(0);
    expect(fetched).equal(1);
  });

  it("should fetch when useCache is false.", async () => {
    const cache = new InMemoryCache({ defaultTtl: 5 });
    let fetched = 0;
    let result = await cache.getOrFetch("key", async () => {
      ++fetched;

      return 0; });

    expect(result).equal(0);
    expect(fetched).equal(1);
    result = await cache.getOrFetch(
      "key",
      async () => {
        ++fetched;

        return 0; },
      false);

    expect(result).equal(0);
    expect(fetched).equal(2);
  });

  it("should list keys", async () => {
    const cache = new InMemoryCache({ defaultTtl: 10 });
    await cache.set("key1", {});
    await cache.set("key2", {});

    const keys = await cache.listKeys();
    expect(keys.items).to.have.lengthOf(2);
  });

});

describe("createCacheKey", () => {

  it("should create unique cache keys", () => {

    const value1 = { foo: "bar" };
    const value2 = { bar: "foo" };

    const key1 = createCacheKey(value1, "pre");
    const key2 = createCacheKey(value2, "pre");
    const key12 = createCacheKey(value1, "pre2");
    const key13 = createCacheKey(value1, "pre");

    expect(key1).to.not.equal(key2);
    expect(key12).to.not.equal(key1);
    expect(key13).to.equal(key1);
  });

});
