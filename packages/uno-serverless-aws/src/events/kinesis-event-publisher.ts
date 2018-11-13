import { Kinesis } from "aws-sdk";
import { Data, PartitionKey, PutRecordInput } from "aws-sdk/clients/kinesis";
import { CheckHealth, checkHealth, Event, EventPublisher, HealthCheckResult } from "uno-serverless";

/**
 * Options for KinesisEventPublisher.
 */
export interface KinesisEventPublisherOptions {
  /** Determines the Kinesis partition key for a particular event. */
  partitionKeyResolver: (evt: Event) => PartitionKey | Promise<PartitionKey>;
  /** Custom serializer for events. Defaults to JSON.stringify. */
  serializer?: (evt: Event) => Data;
  /** The name of the Kinesis stream. */
  streamName: string | Promise<string>;
}

/**
 * EventPublisher implementation that pushes to a Kinesis Stream.
 */
export class KinesisEventPublisher implements EventPublisher, CheckHealth {

  private readonly kinesis = new Kinesis({ apiVersion: "2013-12-02" });

  public constructor(private readonly options: KinesisEventPublisherOptions) {
    if (!this.options.serializer) {
      this.options.serializer = (evt) => JSON.stringify(evt);
    }
  }

  public async checkHealth(): Promise<HealthCheckResult> {
    return checkHealth(
      "KinesisEventPublisher",
      await this.options.streamName,
      async () => {
        await this.kinesis.listTagsForStream({ StreamName: await this.options.streamName }).promise();
      });
  }

  public async publish(evt: Event): Promise<void> {
    const record: PutRecordInput = {
      Data: this.options.serializer!(evt),
      PartitionKey: await this.options.partitionKeyResolver(evt),
      StreamName: await this.options.streamName,
    };
    await this.kinesis.putRecord(record).promise();
  }

}
