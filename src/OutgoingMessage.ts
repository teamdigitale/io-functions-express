// eslint-disable camelcase

import { Context } from "@azure/functions";
import {
  OutgoingHttpHeaders,
  OutgoingMessage as NativeOutgoingMessage,
  ServerResponse
} from "http";

import { statusCodes } from "./statusCodes";

/**
 * OutgoingMessage mock based on https://github.com/nodejs/node/blob/v6.x
 *
 * Note: This implementation is only meant to be working with Node.js v6.x
 *
 * @private
 */
export default class OutgoingMessage extends NativeOutgoingMessage {
  public _hasBody = true;
  public _headerNames = {};
  public _headers = null;
  public _removedHeader = {};
  public statusMessage!: string;
  public statusCode!: number;

  /**
   * Original implementation: https://github.com/nodejs/node/blob/v6.x/lib/_http_outgoing.js#L48
   */
  constructor(
    private readonly updateResponse: (
      updater: (
        prev: NonNullable<Context["res"]>
      ) => NonNullable<Context["res"]>
    ) => void,
    private readonly done: () => void
  ) {
    super();
  }

  // Those methods cannot be prototyped because express explicitelly overrides __proto__
  // See https://github.com/expressjs/express/blob/master/lib/middleware/init.js#L29
  public end: NativeOutgoingMessage["end"] = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chunkOrCb?: any
  ) => {
    // 1. Write head
    this.writeHead(this.statusCode); // Make jshttp/on-headers able to trigger

    // 2. Return raw body to Azure Function runtime
    this.updateResponse(res => ({
      ...res,
      body: chunkOrCb,
      isRaw: true
    }));
    this.done();
  };

  /**
   * https://nodejs.org/api/http.html#http_response_writehead_statuscode_statusmessage_headers
   * Original implementation: https://github.com/nodejs/node/blob/v6.x/lib/_http_server.js#L160
   */
  public writeHead: ServerResponse["writeHead"] = (
    statusCode: number,
    reasonOrHeaders?: string | OutgoingHttpHeaders,
    headersOrUndefined?: OutgoingHttpHeaders
  ) => {
    // 1. Status code
    const statusCodeOrDefault = statusCode || 0;
    if (statusCodeOrDefault < 100 || statusCodeOrDefault > 999) {
      throw new RangeError(`Invalid status code: ${statusCode}`);
    }

    // 2. Status message
    // eslint-disable-next-line functional/immutable-data
    this.statusMessage =
      typeof reasonOrHeaders === "string"
        ? reasonOrHeaders
        : statusCodes[statusCodeOrDefault] || "unknown";

    // 3. Headers
    const headers =
      typeof reasonOrHeaders === "object" &&
      typeof headersOrUndefined === "undefined"
        ? reasonOrHeaders
        : headersOrUndefined;

    if (this._headers && headers !== undefined) {
      // Slow-case: when progressive API and header fields are passed.
      Object.keys(headers).forEach(k => {
        const v = headers[k];
        if (v) {
          this.setHeader(k, v);
        }
      });
    }

    // 4. Sets everything
    this.updateResponse(res => ({
      ...res,
      // In order to uniformize node 6 behaviour with node 8 and 10,
      // we want to never have undefined headers, but instead empty object
      headers:
        this._headers && headers === undefined
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any)._renderHeaders()
          : headers !== undefined
          ? headers
          : {},

      status: statusCodeOrDefault
    }));
  };
}
