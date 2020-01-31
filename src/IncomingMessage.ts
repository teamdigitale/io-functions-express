import { Context } from "@azure/functions";
import { Socket } from "net";
import { Readable } from "stream";
import { TLSSocket } from "tls";

const NOOP = () => true;

function removePortFromAddress(address: string): string {
  return address ? address.replace(/:[0-9]*$/, "") : address;
}

/**
 * Create a fake connection object
 *
 * @param {Object} context Raw Azure context object for a single HTTP request
 * @returns {object} Connection object
 */
function createConnectionObject(
  context: Context
): Pick<Socket, "remoteAddress"> & Pick<TLSSocket, "encrypted"> {
  const { req } = context.bindings;
  const xForwardedFor = req.headers
    ? req.headers["x-forwarded-for"]
    : undefined;

  return {
    encrypted:
      req.originalUrl && req.originalUrl.toLowerCase().startsWith("https"),
    remoteAddress: removePortFromAddress(xForwardedFor)
  };
}

/**
 * Copy useful context properties from the native context provided by the Azure
 * Function engine
 *
 * See:
 * - https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#context-object
 * - https://github.com/christopheranderson/azure-functions-typescript/blob/master/src/context.d.ts
 *
 * @param {Object} context Raw Azure context object for a single HTTP request
 * @returns {Object} Filtered context
 */
function sanitizeContext(context: Context): Context {
  return {
    ...context,
    // We don't want the developer to mess up express flow
    // See https://github.com/yvele/azure-function-express/pull/12#issuecomment-336733540
    done: NOOP,
    log: context.log.bind(context)
  };
}

/**
 * Request object wrapper
 *
 * see also https://github.com/yvele/azure-function-express/pull/31
 *
 * @private
 */
export default class IncomingMessage extends Readable {
  /**
   * Note: IncomingMessage assumes that all HTTP in is binded to "req" property
   */
  constructor(context: Context) {
    super();

    const req = context.req || ({} as NonNullable<Context["req"]>);

    // Push the request body onto this stream
    this.push(context.bindings.req.rawBody);

    // Close the stream
    this.push(null);

    Object.assign(this, {
      ...req, // Inherit
      connection: createConnectionObject(context),
      context: sanitizeContext(context), // Specific to Azure Function
      headers: req.headers || {}, // Should always have a headers object
      socket: { destroy: NOOP },
      // tslint:disable-next-line: no-any
      url: (req as any).originalUrl
    });
  }
}
