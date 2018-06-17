import { expect } from "chai";
import { InMemoryCache } from "../../../src/services/cache";

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

});
