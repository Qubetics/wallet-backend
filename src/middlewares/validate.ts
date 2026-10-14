import http from "http";
import { NextFunction, Request, Response } from "express";
import Joi from "joi";

/*
 * Request validation, replacing the retired express-validation package.
 * It keeps express-validation 4.1 behaviour with its default options, so the
 * routes, the validator schemas and the error response stay the same:
 * - each request segment that has a schema is validated, values are not rewritten
 * - on failure, next() gets a ValidationError with statusCode 400, error
 *   "Bad Request", message "Validation Failed" and the Joi details per segment
 */

const SEGMENTS = ["headers", "params", "query", "cookies", "signedCookies", "body"] as const;
type Segment = (typeof SEGMENTS)[number];
export type ValidationSchema = Partial<Record<Segment, Joi.Schema>>;

export class ValidationError extends Error {
  public statusCode: number;
  public error: string | undefined;
  public details: Partial<Record<Segment, Joi.ValidationErrorItem[]>>;

  constructor(details: Partial<Record<Segment, Joi.ValidationErrorItem[]>>, statusCode = 400) {
    super("Validation Failed");
    this.name = "ValidationError";
    this.statusCode = statusCode;
    this.error = http.STATUS_CODES[statusCode];
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export const validate = (schema: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let errors: Partial<Record<Segment, Joi.ValidationErrorItem[]>> | null = null;
      for (const segment of SEGMENTS) {
        const value = (req as any)[segment];
        const segmentSchema = schema[segment];
        if (!value || !segmentSchema) continue;
        try {
          await segmentSchema.validateAsync(value, { warnings: true });
        } catch (error: any) {
          errors = { ...(errors || {}), [segment]: error.details };
        }
      }
      if (errors) {
        next(new ValidationError(errors));
      } else {
        next();
      }
    } catch (err) {
      next(err);
    }
  };
};

export { Joi };
