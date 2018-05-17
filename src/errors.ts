import * as HttpStatusCodes from "http-status-codes";
import { APIGatewayProxyResultProvider } from "./results";

// tslint:disable:max-classes-per-file

export interface ErrorResponse {
  error: ErrorResponseDetail;
}

export interface ErrorResponseDetail {
  code: string;
  data?: object;
  details?: ErrorResponseDetail[];
  message: string;
  target?: string;
}

/** Internal Server Error. */
export class InternalServerError extends Error implements APIGatewayProxyResultProvider {

  public constructor(message: string) {
    super(message);
    Object.defineProperty(this, "name", { value: this.constructor.name });
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }

  public getAPIGatewayProxyResult() {
    const errorResponse: ErrorResponse = {
      error: {
        code: "internalServerError",
        message: this.message,
      },
    };

    return {
      body: JSON.stringify(errorResponse),
      statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
    };
  }
}

/** Target not found. */
export class NotFoundError extends Error implements APIGatewayProxyResultProvider {

  public constructor(public readonly target: string, message?: string) {
    super(message ? message : `The target ${target} could not be found.`);
    Object.defineProperty(this, "name", { value: this.constructor.name });
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  public getAPIGatewayProxyResult() {
    const errorResponse: ErrorResponse = {
      error: {
        code: "notFound",
        message: this.message,
        target: this.target,
      },
    };

    return {
      body: JSON.stringify(errorResponse),
      statusCode: HttpStatusCodes.NOT_FOUND,
    };
  }
}
