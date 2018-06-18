import { AWSError, Response, S3 } from "aws-sdk";
import { expect } from "chai";
import * as HttpStatusCodes from "http-status-codes";
import { InMemoryCache, randomStr } from "uno-serverless";
import { S3Cache } from "../../../src/services/cache";
import { S3Client } from "../../../src/services/s3-client";

class S3ClientStub implements S3Client {

  private readonly innerCache = new InMemoryCache({ defaultTtl: 3600 });

  public deleteObject(params: S3.Types.DeleteObjectRequest) {
    return {
      promise: async () => {
        await this.innerCache.delete(params.Key);

        return {
          $response: {} as Response<S3.Types.DeleteObjectOutput, AWSError>,
        };
      },
    };
  }

  public getObject(params: S3.Types.GetObjectRequest) {
    return {
      promise: async () => {
        const object = await this.innerCache.get(params.Key);
        if (!object) {
          throw {
            statusCode: HttpStatusCodes.NOT_FOUND,
          } as AWSError;
        }
        return ({
          $response: {} as Response<S3.Types.GetObjectOutput, AWSError>,
          Body: object,
        });
      },
    };
  }

  public putObject(params: S3.Types.PutObjectRequest) {
    return {
      promise: async () => {
        await this.innerCache.set(params.Key, params.Body);

        return {
          $response: {} as Response<S3.Types.PutObjectOutput, AWSError>,
        };
      },
    };
  }
}

describe("S3Cache", () => {

  it("should fetch when ttl is 0", async () => {
    const cache = new S3Cache({ bucket: randomStr(), s3: new S3ClientStub() });
    let fetched = false;
    const result = await cache.getOrFetch(
      "key",
      async () => {
        fetched = true;

        return 0;
      },
      true,
      0);

    expect(result).equal(0);
    expect(fetched).be.true;
  });

  it("should fetch and cache", async () => {
    const cache = new S3Cache({ bucket: randomStr(), s3: new S3ClientStub() });
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
    const cache = new S3Cache({ bucket: randomStr(), s3: new S3ClientStub() });
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
