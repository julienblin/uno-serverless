import { Container, httpFunc } from "@common";
import { Config } from "@config";
import { readFile } from "fs";
import { http } from "uno-serverless";

export const handler = httpFunc()
  .handler(http<Container>(async ({ event, services: { configService } }) => {
    const eventUrl = new URL(event.url);
    const environment = await configService().get(Config.Environment);
    return new Promise((resolve, reject) => {
      readFile("./openapi.json", (err, file) => {
        if (err) {
          return reject(err);
        }

        const openapi = JSON.parse(file.toString("utf8"));
        openapi.servers = [{
          description: environment,
          url: eventUrl.origin,
        }];
        return resolve(openapi);
      });
    });
  }));
