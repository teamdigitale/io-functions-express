import { AzureFunction, Context, HttpRequest } from "@azure/functions";

import * as express from "express";
import createAzureFunctionHandler from "../src/createAzureFunctionsHandler";

const app = express();
app.get("/api/HttpTest/:foo", (req, res) => {
  res.json({
    foo: req.params.foo
  });
});

const httpTrigger = createAzureFunctionHandler(app);

// const httpTrigger: AzureFunction = async (
//   context: Context,
//   req: HttpRequest
// ): Promise<void> => {
//   context.log("HTTP trigger function processed a request.");
//   const name = req.query.name || (req.body && req.body.name);

//   if (name) {
//     context.res = {
//       // status: 200, /* Defaults to 200 */
//       body: "Hello " + (req.query.name || req.body.name)
//     };
//   } else {
//     context.res = {
//       status: 400,
//       body: "Please pass a name on the query string or in the request body"
//     };
//   }
// };

export default httpTrigger;
