import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";

type AsyncRouteHandler<
  Params extends ParamsDictionary,
  ResBody,
  ReqBody,
  ReqQuery extends ParsedQs,
  Locals extends Record<string, unknown>,
> = (
  req: Request<Params, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler<
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(handler: AsyncRouteHandler<Params, ResBody, ReqBody, ReqQuery, Locals>) {
  const wrapped: RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals> = (req, res, next) => {
    void handler(req, res, next).catch(next);
  };

  return wrapped;
}
