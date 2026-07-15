import { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 does not catch rejected promises thrown from async route handlers —
// an uncaught rejection here crashes the whole process. Wrap every async
// handler with this so errors reach the error-handling middleware instead.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
