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

  it("should return size, list & clear.", async () => {
    const kvr = new InMemoryKeyValueRepository();
    const object = {
      foo: "bar",
    };

    const key = "key";

    expect(kvr.size).to.equal(0);

    await kvr.set(key, object);
    expect(kvr.size).to.equal(1);

    const firstValue = (await kvr.list()).items[0];
    expect(firstValue.id).to.equal(key);
    expect(firstValue.item).to.deep.equal(object);

    kvr.clear();
    expect(kvr.size).to.equal(0);
  });

  it("should list items", async () => {
    const kvr = new InMemoryKeyValueRepository();
    const object = {
      foo: "bar",
    };

    for (let index = 0; index < 100; index++) {
      await kvr.set(index.toString(), object);
    }

    const listResult1 = await kvr.list({ max: 10 });
    expect(listResult1.items.length).to.equal(10);
    expect(listResult1.nextToken).to.not.be.undefined;
    expect(listResult1.items[0].id).to.equal("0");

    const listResult2 = await kvr.list({ nextToken: listResult1.nextToken });
    expect(listResult2.items.length).to.equal(10);
    expect(listResult2.nextToken).to.not.be.undefined;
    expect(listResult2.items[0].id).to.equal("10");

    const listResult3 = await kvr.list();
    expect(listResult3.items.length).to.equal(100);
    expect(listResult3.nextToken).to.be.undefined;

    const listResult4 = await kvr.list({ prefix: "9" });
    expect(listResult4.items.length).to.equal(11);

    const listResult5 = await kvr.list({ prefix: "7", max: 3 });
    expect(listResult5.items.length).to.equal(3);
    expect(listResult5.nextToken).to.not.be.undefined;
  });

  it("should check health.", async () => {
    const kvr = new InMemoryKeyValueRepository();
    const result = await kvr.checkHealth();
    expect(result.status).to.equal(HealthCheckStatus.Ok);
    expect(result.name).to.equal("InMemoryKeyValueRepository");
  });

});

// tslint:disable-next-line:only-arrow-functions
describe("FileKeyValueRepository", function() {
  this.timeout(10000);

  it("should get set delete.", async () => {
    const kvr = new FileKeyValueRepository();
    await kvr.clear();
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

  it("should list items", async () => {
    const kvr = new FileKeyValueRepository();
    await kvr.clear();
    const object = {
      foo: "bar",
    };

    for (let index = 0; index < 20; index++) {
      await kvr.set(index.toString(), object);
    }

    const listResult1 = await kvr.list({ max: 10 });
    expect(listResult1.items.length).to.equal(10);
    expect(listResult1.nextToken).to.not.be.undefined;
    expect(listResult1.items[0].id).to.equal("0");

    const listResult2 = await kvr.list({ nextToken: listResult1.nextToken });
    expect(listResult2.items.length).to.equal(10);
    expect(listResult2.nextToken).to.be.undefined;
    expect(listResult2.items[0].id).to.equal("18");

    const listResult3 = await kvr.list();
    expect(listResult3.items.length).to.equal(20);
    expect(listResult3.nextToken).to.be.undefined;

    const listResult4 = await kvr.list({ prefix: "9" });
    expect(listResult4.items.length).to.equal(1);

    const listResult5 = await kvr.list({ prefix: "1", max: 3 });
    expect(listResult5.items.length).to.equal(3);
    expect(listResult5.nextToken).to.not.be.undefined;
  });
});
