import { InMemoryKeyValueRepository } from "@src/key-value-repository";
import { expect } from "chai";
import { describe, it } from "mocha";

describe("InMemoryKeyValueRepository", () => {

  it("should get set delete.", async () => {
    const kvr = new InMemoryKeyValueRepository();
    const object = {
      foo: "bar",
    };

    const key = "key";

    expect(await kvr.get(key)).to.be.undefined;
    await kvr.set(key, object);
    expect(await kvr.get(key)).to.not.equal(object); // Because of serialization.
    expect(await kvr.get(key)).to.deep.equal(object);

    await kvr.delete(key);
    expect(await kvr.get(key)).to.be.undefined;
  });

  it("should return size, entries & clear.", async () => {
    const kvr = new InMemoryKeyValueRepository();
    const object = {
      foo: "bar",
    };

    const key = "key";

    expect(kvr.size).to.equal(0);

    await kvr.set(key, object);
    expect(kvr.size).to.equal(1);

    const firstValue = kvr.entries().next().value;
    expect(firstValue.key).to.equal(key);
    expect(firstValue.value).to.deep.equal(object);

    kvr.clear();
    expect(kvr.size).to.equal(0);
  });

});
