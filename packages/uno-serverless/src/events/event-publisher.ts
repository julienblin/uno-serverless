import { Event } from "./event";

/** EventPublisher publishes event for deferred execution. */
export interface EventPublisher {

  /**
   * Publishes the event.
   * Execution is awaited until the event is successfully published.
   */
  publish(evt: Event): Promise<void>;

}
