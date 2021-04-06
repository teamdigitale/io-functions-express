import { Context } from "@azure/functions";
import { Application } from "express";

import ExpressAdapter from "./ExpressAdapter";

/**
 * Creates a function ready to be exposed to Azure Function for request handling.
 *
 * @param {Object} requestListener Request listener (typically an express/connect instance)
 * @returns {function(context: Object)} Azure Function handle
 */
const createAzureFunctionHandler = (
  application: Application
): ((context: Context) => void) => {
  const adapter = new ExpressAdapter(application);
  return adapter.createAzureFunctionHandler();
};

export default createAzureFunctionHandler;
