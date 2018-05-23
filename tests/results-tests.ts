import { expect } from "chai";
import * as HttpStatusCodes from "http-status-codes";
import { describe, it } from "mocha";
import { defaultBodySerializer } from "../src/lambda-proxy";
import * as results from "../src/results";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion

describe("results", () => {

  const LOCATION = "https://example.org";

  it("should return NO_CONTENT on undefined ok", async () => {
    const result = results.ok().getAPIGatewayProxyResult(defaultBodySerializer);
    expect(result.statusCode).to.equal(HttpStatusCodes.NO_CONTENT);
  });

  it("should return OK on defined ok", async () => {
    const result = results.ok({}, { foo: "bar"}).getAPIGatewayProxyResult(defaultBodySerializer);
    expect(result.statusCode).to.equal(HttpStatusCodes.OK);
    expect(result.headers!.foo).to.equal("bar");
  });

  it("should return CREATED", async () => {
    const result = results.created(LOCATION).getAPIGatewayProxyResult(defaultBodySerializer);
    expect(result.statusCode).to.equal(HttpStatusCodes.CREATED);
    expect(result.headers!.Location).to.equal(LOCATION);
  });

  it("should return CREATED with headers", async () => {
    const result = results.created(LOCATION, {}, { foo: "bar" }).getAPIGatewayProxyResult(defaultBodySerializer);
    expect(result.statusCode).to.equal(HttpStatusCodes.CREATED);
    expect(result.headers!.Location).to.equal(LOCATION);
    expect(result.headers!.foo).to.equal("bar");
  });

  it("should return ACCEPTED", async () => {
    const result = results.accepted().getAPIGatewayProxyResult(defaultBodySerializer);
    expect(result.statusCode).to.equal(HttpStatusCodes.ACCEPTED);
  });

  it("should return SEE_OTHER", async () => {
    const result = results.redirect(LOCATION).getAPIGatewayProxyResult(defaultBodySerializer);
    expect(result.statusCode).to.equal(HttpStatusCodes.SEE_OTHER);
    expect(result.headers!.Location).to.equal(LOCATION);
  });

  it("should return MOVED_PERMANENTLY", async () => {
    const result = results.redirect(LOCATION, true).getAPIGatewayProxyResult(defaultBodySerializer);
    expect(result.statusCode).to.equal(HttpStatusCodes.MOVED_PERMANENTLY);
    expect(result.headers!.Location).to.equal(LOCATION);
  });

  it("should return base64 binary", async () => {
    const buffer = new Buffer("hello");
    const result = results.binary(buffer).getAPIGatewayProxyResult(defaultBodySerializer);
    expect(result.statusCode).to.equal(HttpStatusCodes.OK);
    expect(result.headers!["Content-Type"]).to.equal("application/octet-stream");
    expect(result.body).to.equal(buffer.toString("base64"));
  });

});
