import { Context } from "@azure/functions";
import EventEmitter = require("events");
import { Application } from "express";

import IncomingMessage from "./IncomingMessage";
import OutgoingMessage from "./OutgoingMessage";

/**
 * @param {Object} context Azure Function native context object
 * @throws {Error}
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isValidContext = (context: any): context is Context =>
  context !== undefined &&
  typeof context === "object" &&
  context.bindings &&
  typeof context.bindings === "object" &&
  context.bindings.req &&
  typeof context.bindings.req === "object" &&
  context.bindings.req.originalUrl &&
  typeof context.bindings.req.originalUrl === "string";

export type RequestListener = (...args: readonly unknown[]) => void;

/**
 * Express adapter allowing to handle Azure Function requests by wrapping in request events.
 *
 * @class
 * @fires request
 */
export default class ExpressAdapter extends EventEmitter {
  /**
   * @param {Object=} application Request listener (typically an express/connect instance)
   */
  public constructor(application: Application) {
    super();

    if (application !== undefined) {
      this.addRequestListener(application);
    }
  }

  /**
   * Adds a request listener (typically an express/connect instance).
   *
   * @param {Object} application Request listener (typically an express/connect instance)
   */
  public addRequestListener(application: Application): void {
    this.addListener("request", application);
  }

  /**
   * Create function ready to be exposed to Azure Function for request handling.
   */
  public createAzureFunctionHandler = () => (context: Context) => {
    if (!isValidContext(context)) {
      return;
    }

    const updateResponse = (
      updater: (
        prev: NonNullable<Context["res"]>
      ) => NonNullable<Context["res"]>
    ) => {
      // eslint-disable-next-line functional/immutable-data
      context.res = updater(context.res || {});
    };

    // 2. Wrapping
    const req = new IncomingMessage(context);
    const res = new OutgoingMessage(updateResponse, context.done);

    // 3. Synchronously calls each of the listeners registered for the event
    this.emit("request", req, res);
  };
}
