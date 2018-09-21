import * as computeEtag from "etag";
import * as streamToPromise from "stream-to-promise";

export interface AssetMetadata {
  etag: string;
  mediaType: string;
  path: string;
}

export interface Asset extends AssetMetadata {
  data: Buffer;
}

export interface SetAssetRequest {
  path: string;
  source: Buffer | NodeJS.ReadableStream;
  mediaType: string;
}

/**
 * Allows manipulation of assets data (e.g. binaries, images, etc.)
 */
export interface AssetsRepository {
  get(path: string): Promise<Asset | undefined>;
  set(request: SetAssetRequest): Promise<AssetMetadata>;
}

/**
 * AssetsRepository in-memory implementation.
 * Useful for unit-testing.
 */
export class InMemoryAssetsRepository implements AssetsRepository {

  /** The storage. */
  private readonly storage = new Map<string, Asset>();

  public async clear() {
    this.storage.clear();
  }

  public async get(path: string): Promise<Asset | undefined> {
    return this.storage.get(path);
  }

  public async set(request: SetAssetRequest): Promise<AssetMetadata> {
    const data: Buffer = Buffer.isBuffer(request.source)
      ? request.source
      : await streamToPromise(request.source);

    const metadata: AssetMetadata = {
      etag: computeEtag(data),
      mediaType: request.mediaType,
      path: request.path,
    };

    this.storage.set(
      request.path,
      {
        data,
        ...metadata,
      });

    return metadata;
  }

}
