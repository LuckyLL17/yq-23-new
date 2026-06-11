import { Response } from 'express';
import { ApiResponse, ErrorDetail } from '../types';

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

export enum ApiCode {
  SUCCESS = 0,
  BAD_REQUEST = 40000,
  UNAUTHORIZED = 40100,
  FORBIDDEN = 40300,
  NOT_FOUND = 40400,
  VALIDATION_ERROR = 42200,
  INTERNAL_ERROR = 50000,
}

function sendResponse<T>(res: Response, statusCode: number, code: number, message: string, data: T): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    code,
    message,
    data,
  });
}

export function success<T>(res: Response, data: T, message = 'Success'): Response<ApiResponse<T>> {
  return sendResponse(res, HttpStatus.OK, ApiCode.SUCCESS, message, data);
}

export function created<T>(res: Response, data: T, message = 'Created successfully'): Response<ApiResponse<T>> {
  return sendResponse(res, HttpStatus.CREATED, ApiCode.SUCCESS, message, data);
}

export function badRequest(res: Response, message = 'Bad request', data: unknown = null): Response<ApiResponse<unknown>> {
  return sendResponse(res, HttpStatus.BAD_REQUEST, ApiCode.BAD_REQUEST, message, data);
}

export function unauthorized(res: Response, message = 'Unauthorized'): Response<ApiResponse<null>> {
  return sendResponse(res, HttpStatus.UNAUTHORIZED, ApiCode.UNAUTHORIZED, message, null);
}

export function forbidden(res: Response, message = 'Forbidden'): Response<ApiResponse<null>> {
  return sendResponse(res, HttpStatus.FORBIDDEN, ApiCode.FORBIDDEN, message, null);
}

export function notFound(res: Response, message = 'Resource not found'): Response<ApiResponse<null>> {
  return sendResponse(res, HttpStatus.NOT_FOUND, ApiCode.NOT_FOUND, message, null);
}

export function validationError(res: Response, errors: ErrorDetail[], message = 'Validation failed'): Response {
  return res.status(HttpStatus.BAD_REQUEST).json({
    code: ApiCode.VALIDATION_ERROR,
    message,
    errors,
  });
}

export function internalError(res: Response, message = 'Internal server error'): Response<ApiResponse<null>> {
  return sendResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, ApiCode.INTERNAL_ERROR, message, null);
}
