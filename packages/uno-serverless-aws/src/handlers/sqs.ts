import { aggregateError, Event, FunctionArg, FunctionExecution, UnoContext, UnoEvent } from "uno-serverless";

export interface EventFunctionArg<TEvent, TServices> {
  event: TEvent;
  context: UnoContext;
  lambdaEvent: UnoEvent;
  services: TServices;
}

export type EventFunction<TEvent, TServices = any> = (arg: EventFunctionArg<TEvent, TServices>) => Promise<any>;

/**
 * Specialized handler for AWS SQS Lambda events.
 * Will de-batch the event records and invoke the func one at a time.
 * Errors are collected along the way and re-throw at the end of the execution.
 * @param func The func to execute.
 * @param deserializer Custom de-serializer for the message body.
 */
export const SQSEvent = <TEvent extends Event, TServices = any>(
  func: EventFunction<TEvent, TServices>,
  deserializer: (body: string) => TEvent = (body) =>  JSON.parse(body))
  : FunctionExecution<UnoEvent, TServices> => {
  return async (arg: FunctionArg<UnoEvent, TServices>) => {
    const sqsEvt = arg.event as any;
    if (!sqsEvt.Records && !Array.isArray(sqsEvt.Records)) {
      throw new Error(`Unable to identify the event as coming from SQS: ${JSON.stringify(sqsEvt)}`);
    }

    const allRecords = sqsEvt.Records.map((x) => ({ messageId: x.messageId, body: deserializer(x.body) }));
    const errors: Array<{ error: Error, eventId: string, messageId: string }> = [];
    for (const record of allRecords) {
      try {
        await func({ event: record.body, context: arg.context, lambdaEvent: arg.event, services: arg.services });
      } catch (error) {
        errors.push({
          error,
          eventId: record.body && record.body.id,
          messageId: record.messageId,
        });
      }
    }

    if (errors.length > 0) {
      throw aggregateError(
        "One or several errors occurred while processing records.",
        errors.map((x) => ({
          code: "eventProcessing",
          data: {
            error: x.error,
            eventId: x.eventId,
            messageId: x.messageId,
          },
          message: x.error.message,
        })));
    }
  };
};

export interface EventBatchFunctionArg<TEvent, TServices> {
  events: TEvent[];
  context: UnoContext;
  lambdaEvent: UnoEvent;
  services: TServices;
}

export type EventBatchFunction<TEvent, TServices = any> =
  (arg: EventBatchFunctionArg<TEvent, TServices>) => Promise<any>;

/**
 * Specialized handler for AWS SQS Lambda events.
 * Will pass the events body as a batch for the func.
 * @param func The func to execute.
 * @param deserializer Custom de-serializer for the message body.
 */
export const SQSEventBatch = <TEvent extends Event, TServices = any>(
  func: EventBatchFunction<TEvent, TServices>,
  deserializer: (body: string) => TEvent = (body) =>  JSON.parse(body))
  : FunctionExecution<UnoEvent, TServices> => {
  return async (arg: FunctionArg<UnoEvent, TServices>) => {
    const sqsEvt = arg.event as any;
    if (!sqsEvt.Records && !Array.isArray(sqsEvt.Records)) {
      throw new Error(`Unable to identify the event as coming from SQS: ${JSON.stringify(sqsEvt)}`);
    }

    const events = sqsEvt.Records.map((x) => deserializer(x.body));
    await func({ events, context: arg.context, lambdaEvent: arg.event, services: arg.services  });
  };
};
