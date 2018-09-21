import { expect } from "chai";
import { randomBytes } from "crypto";
import { createReadStream } from "streamifier";
import { randomStr } from "../../../src/core/utils";
import { FileAssetsRepository, InMemoryAssetsRepository } from "../../../src/services/assets-repository";

describe("InMemoryAssetsRepository", () => {

  let assetsRepo: InMemoryAssetsRepository;

  beforeEach(() => {
    assetsRepo = new InMemoryAssetsRepository();
  });

  it("should get and set buffers", async () => {
    const source = randomBytes(512);
    const path = "foo/bar";
    const mediaType = randomStr();

    const result = await assetsRepo.set({ mediaType, path, source });
    expect(result.path).to.equal(path);
    expect(result.mediaType).to.equal(mediaType);
    expect(result.etag).to.not.be.undefined;

    const asset = await assetsRepo.get(path);
    expect(asset).to.not.be.undefined;
    expect(asset!.data.compare(source)).to.equal(0);
    expect(asset!.path).to.equal(result.path);
    expect(asset!.mediaType).to.equal(result.mediaType);
    expect(asset!.etag).to.equal(result.etag);
  });

  it("should get and set streams", async () => {
    const sourceBuffer = randomBytes(512);
    const source = createReadStream(sourceBuffer);
    const path = "foo/bar";
    const mediaType = randomStr();

    const result = await assetsRepo.set({ mediaType, path, source });
    expect(result.path).to.equal(path);
    expect(result.mediaType).to.equal(mediaType);
    expect(result.etag).to.not.be.undefined;

    const asset = await assetsRepo.get(path);
    expect(asset).to.not.be.undefined;
    expect(asset!.data.compare(sourceBuffer)).to.equal(0);
    expect(asset!.path).to.equal(result.path);
    expect(asset!.mediaType).to.equal(result.mediaType);
    expect(asset!.etag).to.equal(result.etag);
  });

  it("should clear", async () => {
    const source = randomBytes(512);
    const path = "foo/bar";
    const mediaType = randomStr();

    await assetsRepo.set({ mediaType, path, source });
    let result = await assetsRepo.get(path);
    expect(result).to.not.be.undefined;

    await assetsRepo.clear();
    result = await assetsRepo.get(path);
    expect(result).to.be.undefined;
  });

  it("should list", async () => {
    const path1 = "foo/1";
    const path2 = "foo/2";
    const path3 = "bar/1";

    await assetsRepo.set({ mediaType: randomStr(), path: path1, source: randomBytes(512) });
    await assetsRepo.set({ mediaType: randomStr(), path: path2, source: randomBytes(512) });
    await assetsRepo.set({ mediaType: randomStr(), path: path3, source: randomBytes(512) });

    let result = await assetsRepo.list("foo");
    expect(result).to.deep.equal([ path1, path2 ]);

    result = await assetsRepo.list("bar");
    expect(result).to.deep.equal([ path3 ]);
  });

  it("should exists", async () => {
    const path = "foo/bar";

    await assetsRepo.set({ mediaType: randomStr(), path, source: randomBytes(512) });

    let result = await assetsRepo.exists(path);
    expect(result).to.not.be.undefined;

    result = await assetsRepo.exists(randomStr());
    expect(result).to.be.undefined;
  });

});

describe("FileAssetsRepository", () => {

  let assetsRepo: FileAssetsRepository;

  beforeEach(() => {
    assetsRepo = new FileAssetsRepository();
  });

  afterEach(async () => {
    await assetsRepo.clear();
  });

  it("should get and set buffers", async () => {
    const source = randomBytes(512);
    const path = "foo/bar";
    const mediaType = randomStr();

    const result = await assetsRepo.set({ mediaType, path, source });
    expect(result.path).to.equal(path);
    expect(result.mediaType).to.be.undefined;
    expect(result.etag).to.be.undefined;

    const asset = await assetsRepo.get(path);
    expect(asset).to.not.be.undefined;
    expect(asset!.data.compare(source)).to.equal(0);
    expect(asset!.path).to.equal(result.path);
    expect(asset!.mediaType).to.equal(result.mediaType);
    expect(asset!.etag).to.equal(result.etag);
  });

  it("should get and set streams", async () => {
    const sourceBuffer = randomBytes(512);
    const source = createReadStream(sourceBuffer);
    const path = "foo/bar";
    const mediaType = randomStr();

    const result = await assetsRepo.set({ mediaType, path, source });
    expect(result.path).to.equal(path);
    expect(result.mediaType).to.be.undefined;
    expect(result.etag).to.be.undefined;

    const asset = await assetsRepo.get(path);
    expect(asset).to.not.be.undefined;
    expect(asset!.data.compare(sourceBuffer)).to.equal(0);
    expect(asset!.path).to.equal(result.path);
    expect(asset!.mediaType).to.equal(result.mediaType);
    expect(asset!.etag).to.equal(result.etag);
  });

  it("should clear", async () => {
    const source = randomBytes(512);
    const path = "foo/bar";
    const mediaType = randomStr();

    await assetsRepo.set({ mediaType, path, source });
    let result = await assetsRepo.get(path);
    expect(result).to.not.be.undefined;

    await assetsRepo.clear();
    result = await assetsRepo.get(path);
    expect(result).to.be.undefined;
  });

  it("should list", async () => {
    const path1 = "foo/1";
    const path2 = "foo/2";
    const path3 = "bar/1";

    await assetsRepo.set({ mediaType: randomStr(), path: path1, source: randomBytes(512) });
    await assetsRepo.set({ mediaType: randomStr(), path: path2, source: randomBytes(512) });
    await assetsRepo.set({ mediaType: randomStr(), path: path3, source: randomBytes(512) });

    let result = await assetsRepo.list("foo");
    expect(result).to.deep.equal([ path1, path2 ]);

    result = await assetsRepo.list("bar");
    expect(result).to.deep.equal([ path3 ]);
  });

  it("should exists", async () => {
    const path = "foo/bar";

    await assetsRepo.set({ mediaType: randomStr(), path, source: randomBytes(512) });

    let result = await assetsRepo.exists(path);
    expect(result).to.not.be.undefined;

    result = await assetsRepo.exists(randomStr());
    expect(result).to.be.undefined;
  });

});
