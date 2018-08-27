import { aggregateError } from "../core/errors";
import { Event } from "./event";
import { EventPublisher } from "./event-publisher";

/** EventDisptacher is responsible for executing actions related to events. */
export interface EventDispatcher {
  /**
   * Dispatches the event.
   * Execution is awaited until all processors are runned.
   */
  dispatch(evt: Event): Promise<void>;
}

export interface EventProcessor {
  process(evt: Event): Promise<void>;
}

export interface LocalEventDispatcherOptions {
  /**
   * The processors to run, organized by event type.
   * "*"" means that all events will be dispatched.
   */
  processors: Record<string, Array<((evt: Event) => Promise<void>) | EventProcessor>>;
}

export class LocalEventDispatcher implements EventPublisher, EventDispatcher {

  public constructor(private readonly options: LocalEventDispatcherOptions) {}

  public async dispatch(evt: Event): Promise<void> {
    const allErrors: any[] = [];
    const processors = this.options.processors[evt.type] || [];
    if (this.options.processors["*"]) {
      processors.push(...this.options.processors["*"]);
    }
    for (const processor of processors) {
      try {
        if (typeof processor === "function") {
          await processor(evt);
        } else {
          await processor.process(evt);
        }
      } catch (processorError) {
        allErrors.push(processorError);
      }
    }

    if (allErrors.length > 0) {
      if (allErrors.length === 1) {
        throw allErrors[0];
      } else {
        throw aggregateError(
          "Several errors occured while running LocalEventDispatcher.",
          allErrors.map((x) => ({ code: x.code, message: x.message })));
      }
    }
  }

  public async publish(evt: Event): Promise<void> {
    return this.dispatch(evt);
  }

}

/**
 * Very simple EventDispatcher that forwards events to a different EventPublisher.
 */
export class ForwardEventDispatcher implements EventDispatcher {

  public constructor(private readonly publisher: EventPublisher) {}

  public dispatch(evt: Event): Promise<void> {
    return this.publisher.publish(evt);
  }

}
