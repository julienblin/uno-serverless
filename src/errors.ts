import * as HttpStatusCodes from "http-status-codes";
import { APIGatewayProxyResultProvider } from "./results";

export interface ErrorData {
  code: string;
  data?: object;
  details?: ErrorData[];
  message: string;
  target?: string;
}

export const buildError = (
  errorData: ErrorData,
  httpStatusCode: number): Error & ErrorData & APIGatewayProxyResultProvider => {

  const error: any = new Error(errorData.message);
  error.code = errorData.code;
  error.data = errorData.data;
  error.details = errorData.details;
  error.target = errorData.target;
  error.getAPIGatewayProxyResult = () => ({
    body: JSON.stringify({ error: errorData }),
    statusCode: httpStatusCode,
  });
  Object.freeze(error);

  return error;
};

export const internalServerError = (message: string) =>
  buildError(
    {
      code: "internalServerError",
      message,
    },
    HttpStatusCodes.INTERNAL_SERVER_ERROR);

export const notFoundError = (target: string, message?: string) =>
    buildError(
      {
        code: "notFound",
        message: message ? message : `The target ${target} could not be found.`,
        target,
      },
      HttpStatusCodes.NOT_FOUND);

export const badRequestError = (message: string, data?: object) =>
  buildError(
    {
      code: "badRequest",
      data,
      message,
    },
    HttpStatusCodes.BAD_REQUEST);

export const validationError = (errors: ErrorData[], message?: string) =>
    buildError(
      {
        code: "validationFailed",
        details: errors.map((e) => ({ code: e.code, message: e.message, target: e.target, data: e.data })),
        message: message ? message : "Validation failed",
      },
      HttpStatusCodes.BAD_REQUEST);
