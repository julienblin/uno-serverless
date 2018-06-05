import { HttpClientConfig, HttpClientError, httpClientFactory, mockHttpClientFactory } from "@src/http-client";
import { randomStr } from "@src/utils";
import { expect } from "chai";
import * as HttpStatusCodes from "http-status-codes";
import { describe, it } from "mocha";

describe("httpClientFactory", () => {

  const baseURL = async () => "https://jsonplaceholder.typicode.com";

  interface Post {
    body: string;
    title: string;
  }

  it("should get", async () => {
    const client = httpClientFactory({
      baseURL: baseURL(),
    });

    const response = await client.get<Post>("/posts/1");
    expect(response.data.title).to.not.be.undefined;
  });

  it("should post", async () => {
    const client = httpClientFactory({
      baseURL: baseURL(),
    });

    const title = randomStr();
    const response = await client.post<Post>(
      "/posts",
      { title });

    expect(response.data.title).to.equal(title);
  });

  it("should put", async () => {
    const client = httpClientFactory({
      baseURL: baseURL(),
    });

    const title = randomStr();
    const response = await client.put<Post>(
      "/posts/1",
      { title });

    expect(response.data.title).to.equal(title);
  });

  it("should patch", async () => {
    const client = httpClientFactory({
      baseURL: baseURL(),
    });

    const title = randomStr();
    const response = await client.patch<Post>(
      "/posts/1",
      { title });

    expect(response.data.title).to.equal(title);
  });

  it("should delete", async () => {
    const client = httpClientFactory({
      baseURL: baseURL(),
    });

    const response = await client.delete("/posts/1");

    expect(response.status).to.equal(HttpStatusCodes.OK);
  });

  it("should throw errors", async () => {
    const client = httpClientFactory({
      baseURL: baseURL(),
    });

    const data = { title: randomStr() };
    try {
      await client.post<Post>(`/posts/${randomStr()}`, data);
      expect(false);
    } catch (error) {
      const httpClientError = error as HttpClientError;
      expect(JSON.parse(httpClientError.request!.data)).to.deep.equal(data);
      expect(httpClientError.request!.method).to.equal("post");
      expect(httpClientError.response!.status).to.equal(HttpStatusCodes.NOT_FOUND);
    }
  });
});

describe("mockHttpClientFactory", () => {

  interface Post {
    body: string;
    title: string;
  }

  it("should mock responses", async () => {
    const { client, mock } = mockHttpClientFactory();

    const mockedPost = { title: randomStr() };
    mock.onGet("/posts/1").reply(HttpStatusCodes.OK, mockedPost);

    const response = await client.get<Post>("/posts/1");
    expect(response.data.title).to.equal(mockedPost.title);
  });

  it("should mock errors", async () => {
    const { client, mock } = mockHttpClientFactory();

    const mockedPost = { title: randomStr() };
    mock.onPost("/posts").reply(HttpStatusCodes.BAD_REQUEST, { error: "Invalid data"});

    try {
      await client.post<Post>("/posts");
    } catch (error) {
      const httpClientError = error as HttpClientError;
      expect(httpClientError.request!.method).to.equal("post");
      expect(httpClientError.response!.status).to.equal(HttpStatusCodes.BAD_REQUEST);
    }
  });
});
