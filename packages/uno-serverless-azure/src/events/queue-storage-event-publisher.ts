import { createQueueService, QueueService } from "azure-storage";
import { checkHealth, CheckHealth, Event, EventPublisher, lazyAsync } from "uno-serverless";

export interface QueueStorageEventPublisherOptionsWithService {
  /** The Storage queue service instance */
  queueService: QueueService;
}

export interface QueueStorageEventPublisherOptionsWithConnectionString {
  /** The Storage connection string */
  connectionString: string | Promise<string>;
}

export interface QueueStorageEventPublisherCommonOptions {
  /** Queue storage queue name. */
  queue: string | Promise<string>;

  /** Custom serializer. */
  serialize?(evt: Event): string;
}

/**
 * Options for QueueStorageEventPublisher.
 */
export type QueueStorageEventPublisherOptions =
  (QueueStorageEventPublisherOptionsWithService | QueueStorageEventPublisherOptionsWithConnectionString)
  & QueueStorageEventPublisherCommonOptions;

/** EventPublisher implementation that sends event to a Azure Storage Queue. */
export class QueueStorageEventPublisher implements EventPublisher, CheckHealth {

  private readonly queueService = lazyAsync(() => this.buildQueueService());

  public constructor(options: QueueStorageEventPublisherOptions) {
    this.options = {
      ...options,
      serialize: options.serialize || ((evt: Event) => JSON.stringify(value)),
    };
  }

  public async checkHealth() {
    return checkHealth(
      "QueueStorageEventPublisher",
      await this.options.queue,
      async () => this.createQueueIfNotExists());
  }

  public async publish(evt: Event): Promise<void> {
    const svc = await this.queueService();
    const queue = await this.options.queue;

    return new Promise<void>((resolve, reject) => {
      svc.createMessage(queue, this.options.serialize!(evt), (err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }

  public async createQueueIfNotExists() {
    const svc = await this.queueService();
    const queue = await this.options.queue;
    return new Promise<void>((resolve, reject) => {
      svc.createQueueIfNotExists(queue, (err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }

  private async buildQueueService(): Promise<QueueService> {
    if ((this.options as any).queueService) {
      return (this.options as any).queueService;
    }

    return createQueueService(await (this.options as any).connectionString);
  }
}
