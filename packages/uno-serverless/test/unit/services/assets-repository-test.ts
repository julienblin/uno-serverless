import { expect } from "chai";
import { randomBytes } from "crypto";
import { createReadStream } from "streamifier";
import { randomStr } from "../../../src/core/utils";
import { InMemoryAssetsRepository } from "../../../src/services/assets-repository";

describe("InMemoryAssetsRepository", () => {

  let assetsRepo: InMemoryAssetsRepository;

  beforeEach(() => {
    assetsRepo = new InMemoryAssetsRepository();
  });

  it("should get and set buffers", async () => {
    const source = randomBytes(512);
    const path = randomStr();
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
    const path = randomStr();
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
    const path = randomStr();
    const mediaType = randomStr();

    await assetsRepo.set({ mediaType, path, source });
    let result = await assetsRepo.get(path);
    expect(result).to.not.be.undefined;

    await assetsRepo.clear();
    result = await assetsRepo.get(path);
    expect(result).to.be.undefined;
  });

});
