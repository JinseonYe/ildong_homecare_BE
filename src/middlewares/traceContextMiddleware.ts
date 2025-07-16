import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import rTracer from 'cls-rtracer';

/**
 * 요청 ID와 사용자 정보를 포함한 Trace ID를 생성해
 * 요청 context에 저장하는 미들웨어
 */
export const traceContextMiddleware = (
  getUuidFromToken: (req: Request) => { uuid: string; name: string },
) => {
  const requestIdFactory = (req: Request) => {
    const requestId = uuidv4();
    const tokenPayload = req.headers['authorization']
      ? getUuidFromToken(req)
      : { uuid: 'anonymous', name: 'guest' };

    return `${requestId}|${tokenPayload.uuid}:${tokenPayload.name}`;
  };

  return rTracer.expressMiddleware({ requestIdFactory });
};
