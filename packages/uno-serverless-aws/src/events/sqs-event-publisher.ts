import { SQS } from "aws-sdk";
import { CredentialsOptions } from "aws-sdk/lib/credentials";
import { CheckHealth, checkHealth, Event, EventPublisher, HealthCheckResult, lazyAsync } from "uno-serverless";

export interface SQSEventPublisherOptions {
  /** Credentials to connect to the queue, if not provided by the environment. */
  credentials?: CredentialsOptions | Promise<CredentialsOptions | undefined>;
  /** The queue url */
  queueUrl: string | Promise<string>;

  /** The AWS Region, if not provided by the environment. */
  region?: string | Promise<string | undefined>;

  /** Pre-configured SQS client to use, if needed. */
  sqsClient?: SQS;

  /** Custom serializer. */
  serialize?(evt: Event): string;
}

/**
 * AWS Simple Queue Service implementation for EventPublisher.
 */
export class SQSEventPublisher implements EventPublisher, CheckHealth {

  private readonly lazyClient = lazyAsync(async () => {
    return this.options.sqsClient || new SQS({
      credentials: await this.options.credentials,
      region: await this.options.region,
    });
  });

  public constructor(private readonly options: SQSEventPublisherOptions) {
    if (!this.options.serialize) {
      this.options.serialize = ((evt: Event) => JSON.stringify(evt));
    }
  }

  public async checkHealth(): Promise<HealthCheckResult> {
    return checkHealth(
      "SQSEventPublisher",
      await this.options.queueUrl,
      async () => {
        const client = await this.lazyClient();
        const queueUrl = await this.options.queueUrl;
        return new Promise<void>((resolve, reject) => {
          client.getQueueAttributes({ QueueUrl: queueUrl }, (err, _) => {
            if (err) {
              return reject(err);
            }

            return resolve();
          });
        });
      });
  }

  public async publish(evt: Event): Promise<void> {
    const client = await this.lazyClient();
    const params: SQS.Types.SendMessageRequest = {
      MessageAttributes: {
        EventId: {
          DataType: "String",
          StringValue: evt.id,
        },
        EventType: {
          DataType: "String",
          StringValue: evt.type,
        },
      },
      MessageBody: this.options.serialize!(evt),
      QueueUrl: await this.options.queueUrl,
    };
    return new Promise<void>((resolve, reject) => {
      client.sendMessage(params, (err, _) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

}
