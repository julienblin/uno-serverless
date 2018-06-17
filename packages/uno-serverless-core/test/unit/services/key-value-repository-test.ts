import { expect } from "chai";
import { describe, it } from "mocha";
import { HealthCheckStatus } from "../../../src/services/health-check";
import { FileKeyValueRepository, InMemoryKeyValueRepository } from "../../../src/services/key-value-repository";

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

  it("should check health.", async () => {
    const kvr = new InMemoryKeyValueRepository();
    const result = await kvr.checkHealth();
    expect(result.status).to.equal(HealthCheckStatus.Ok);
    expect(result.name).to.equal("InMemoryKeyValueRepository");
  });

});

describe("FileKeyValueRepository", () => {

  it("should get set delete.", async () => {
    const kvr = new FileKeyValueRepository();
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

  it("should check health.", async () => {
    const kvr = new FileKeyValueRepository();
    const result = await kvr.checkHealth();
    expect(result.status).to.equal(HealthCheckStatus.Ok);
    expect(result.name).to.equal("FileKeyValueRepository");
  });
});
