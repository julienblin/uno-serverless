import {
  aggregateError, Event, EventFunction, FunctionArg, FunctionExecution, UnoEvent,
} from "uno-serverless";

const defaultDeserializer = <TEvent>(data: string): TEvent =>
  JSON.parse(Buffer.from(data, "base64").toString("ascii"));

/**
 * Specialized handler for AWS Kinesis events.
 * Will de-batch the event records and invoke the func one at a time.
 * Errors are collected along the way and re-throw at the end of the execution.
 * @param func The func to execute.
 * @param deserializer Custom de-serializer for the message body.
 */
export const kinesisEvent = <TEvent extends Event, TServices = any>(
  func: EventFunction<TEvent, TServices>,
  deserializer: (data: string) => TEvent = defaultDeserializer)
  : FunctionExecution<UnoEvent, TServices> => {
  return async (arg: FunctionArg<UnoEvent, TServices>) => {
    const kinesisEvt = arg.event as any;
    if (!kinesisEvt.Records && !Array.isArray(kinesisEvt.Records)) {
      throw new Error(`Unable to identify the event as coming from Kinesis: ${JSON.stringify(kinesisEvt)}`);
    }

    const allRecords = kinesisEvt.Records.map(
      (x) => ({ kinesisEventId: x.eventID, data: deserializer(x.kinesis.data) }));
    const errors: Array<{ error: Error, eventId: string, kinesisEventId: string }> = [];
    for (const record of allRecords) {
      try {
        await func({ event: record.data, context: arg.context, unoEvent: arg.event, services: arg.services });
      } catch (error) {
        errors.push({
          error,
          eventId: record.data && record.data.id,
          kinesisEventId: record.kinesisEventId,
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
            kinesisEventId: x.kinesisEventId,
          },
          message: x.error.message,
        })));
    }
  };
};
