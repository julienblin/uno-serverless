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

/** Bad request. */
export class BadRequestError extends Error implements APIGatewayProxyResultProvider {

  public constructor(message: string, public readonly error?: {}) {
    super(message);
    Object.defineProperty(this, "name", { value: this.constructor.name });
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }

  public getAPIGatewayProxyResult() {
    const errorResponse: ErrorResponse = {
      error: {
        code: "badRequest",
        data: this.error,
        message: this.message,
      },
    };

    return {
      body: JSON.stringify(errorResponse),
      statusCode: HttpStatusCodes.BAD_REQUEST,
    };
  }
}

export interface ValidationDiagnostic {
  code: string;
  message: string;
  target?: string;
}

/** Validation errors - Bad request. */
export class ValidationError extends Error implements APIGatewayProxyResultProvider {
  public constructor(public errors: ValidationDiagnostic[], message?: string) {
    super(message ? message : "Validation failed");
    Object.defineProperty(this, "name", { value: this.constructor.name });
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  public getAPIGatewayProxyResult() {
    const errorResponse: ErrorResponse = {
      error: {
        code: "badRequest",
        details: this.errors.map((e) => ({ code: e.code, message: e.message, target: e.target })),
        message: this.message,
      },
    };

    return {
      body: JSON.stringify(errorResponse),
      statusCode: HttpStatusCodes.BAD_REQUEST,
    };
  }
}
