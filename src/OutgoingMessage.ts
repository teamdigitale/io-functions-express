// eslint-disable camelcase

import {
  OutgoingHttpHeaders,
  OutgoingMessage as NativeOutgoingMessage,
  ServerResponse
} from "http";
import { Context } from "@azure/functions";

import { statusCodes } from "./statusCodes";

/**
 * OutgoingMessage mock based on https://github.com/nodejs/node/blob/v6.x
 *
 * Note: This implementation is only meant to be working with Node.js v6.x
 *
 * @private
 */
export default class OutgoingMessage extends NativeOutgoingMessage {
  public readonly _hasBody = true;
  public readonly _headerNames = {};
  public readonly _headers = null;
  public readonly _removedHeader = {};
  // eslint-disable-next-line functional/prefer-readonly-type
  public statusMessage!: string;
  public readonly statusCode!: number;

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
  public readonly end: NativeOutgoingMessage["end"] = (
    chunkOrCb: Parameters<NativeOutgoingMessage["end"]>[0]
  ) => {
    // 1. Write head
    // eslint-disable-next-line no-invalid-this
    this.writeHead(this.statusCode); // Make jshttp/on-headers able to trigger

    // 2. Return raw body to Azure Function runtime
    // eslint-disable-next-line no-invalid-this
    this.updateResponse(res => ({
      ...res,
      body: chunkOrCb,
      isRaw: true
    }));
    // eslint-disable-next-line no-invalid-this
    this.done();
  };

  /**
   * https://nodejs.org/api/http.html#http_response_writehead_statuscode_statusmessage_headers
   * Original implementation: https://github.com/nodejs/node/blob/v6.x/lib/_http_server.js#L160
   */
  public readonly writeHead: ServerResponse["writeHead"] = (
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
    // eslint-disable-next-line functional/immutable-data, no-invalid-this
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

    // eslint-disable-next-line no-underscore-dangle, no-invalid-this
    if (this._headers && headers !== undefined) {
      // Slow-case: when progressive API and header fields are passed.
      Object.keys(headers).forEach(k => {
        const v = headers[k];
        if (v) {
          // eslint-disable-next-line no-invalid-this
          this.setHeader(k, v);
        }
      });
    }

    // 4. Sets everything
    // eslint-disable-next-line no-invalid-this
    this.updateResponse(res => ({
      ...res,
      // In order to uniformize node 6 behaviour with node 8 and 10,
      // we want to never have undefined headers, but instead empty object
      headers:
        // eslint-disable-next-line no-underscore-dangle, no-invalid-this
        this._headers && headers === undefined
          ? // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any, no-invalid-this
            (this as any)._renderHeaders()
          : headers !== undefined
          ? headers
          : {},

      status: statusCodeOrDefault
    }));
  };
}
