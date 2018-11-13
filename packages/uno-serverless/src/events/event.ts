import { UnoContext, UnoEvent } from "../core/schemas";

/**
 * Base type for standard events.
 */
export interface Event {
  id: string;
  type: string;
}

/**
 * Arguments to handle processing function.
 */
export interface EventFunctionArg<TEvent, TServices> {
  event: TEvent;
  context: UnoContext;
  unoEvent: UnoEvent;
  services: TServices;
}

/**
 * An event processing function.
 */
export type EventFunction<TEvent, TServices = any, TReturn = any> =
  (arg: EventFunctionArg<TEvent, TServices>) => Promise<TReturn>;
