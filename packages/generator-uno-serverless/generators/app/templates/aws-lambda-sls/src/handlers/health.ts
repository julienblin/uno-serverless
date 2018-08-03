import { Container, httpFunc } from "@common";
import { health } from "uno-serverless";

export const handler = httpFunc()
  .handler(health<Container>(
    "<%= projectName %>",
    async ({ services }) => ([
      services.configService() as any,
    ]),
  ));
