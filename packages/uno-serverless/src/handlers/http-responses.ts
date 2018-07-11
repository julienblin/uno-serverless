import * as HttpStatusCodes from "http-status-codes";
import { HttpUnoResponse } from "../core/schemas";

/**
 * 200 OK
 */
export const ok = (body?: {}, headers?: Record<string, string>): HttpUnoResponse => ({
  body,
  headers,
  statusCode: HttpStatusCodes.OK,
});

/**
 * 201 CREATED
 */
export const created = (location: string, body?: {}, headers?: Record<string, string>): HttpUnoResponse => ({
  body,
  headers: {
    ...headers,
    Location: location,
  },
  statusCode: HttpStatusCodes.CREATED,
});

/**
 * 202 ACCEPTED
 */
export const accepted = (body?: {}, headers?: Record<string, string>): HttpUnoResponse => ({
  body,
  headers,
  statusCode: HttpStatusCodes.ACCEPTED,
});

/**
 * 204 NO CONTENT
 */
export const noContent = (headers?: Record<string, string>): HttpUnoResponse => ({
  headers,
  statusCode: HttpStatusCodes.NO_CONTENT,
});

/**
 * 303 SEE OTHER or 301 - MOVED PERMANENTLY
 */
export const redirect = (location: string, permanent = false, headers?: Record<string, string>): HttpUnoResponse => ({
  headers: {
    ...headers,
    Location: location,
  },
  statusCode: permanent ? HttpStatusCodes.MOVED_PERMANENTLY : HttpStatusCodes.SEE_OTHER,
});

/**
 * 200 OK with binary body.
 */
export const binary = (
  body: Buffer, contentType = "application/octet-stream", headers?: Record<string, string>): HttpUnoResponse => ({
  body,
  headers: {
    ...headers,
    "Content-Type": contentType,
  },
  statusCode: HttpStatusCodes.OK,
});
