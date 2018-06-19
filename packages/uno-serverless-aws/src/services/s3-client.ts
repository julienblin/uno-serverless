import { AWSError, S3 } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";

export interface S3Client {
  deleteObject(params: S3.Types.DeleteObjectRequest): {
    promise(): Promise<PromiseResult<S3.Types.DeleteObjectOutput, AWSError>>;
  };
  getObject(params: S3.Types.GetObjectRequest): {
    promise(): Promise<PromiseResult<S3.Types.GetObjectOutput, AWSError>>;
  };
  listObjectsV2(params: S3.Types.ListObjectsV2Request): {
    promise(): Promise<PromiseResult<S3.Types.ListObjectsV2Output, AWSError>>;
  };
  putObject(params: S3.Types.PutObjectRequest): {
    promise(): Promise<PromiseResult<S3.Types.PutObjectOutput, AWSError>>;
  };
}
