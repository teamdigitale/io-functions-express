import * as express from "express";
import createAzureFunctionHandler from "../src/createAzureFunctionsHandler";

const app = express();

app.get("/api/HttpTest/ping", (_, res) => {
  res.send("PONG");
});

app.get("/api/HttpTest/path/:foo", (req, res) => {
  res.json({
    foo: req.params.foo
  });
});

app.get("/api/HttpTest/get", (req, res) => {
  res.json({
    query: req.query
  });
});

app.post("/api/HttpTest/post", (req, res) => {
  res.json({
    body: req.body,
    query: req.query
  });
});

app.get("/api/HttpTest/status", (req, res) => {
  console.log("reached");
  res.status(Number(req.query.status)).json({
    status: req.query.status
  });
});

app.get("/api/HttpTest/headers", (req, res) => {
  res.header("x-custom-header-out", "value").json({
    headers: req.headers
  });
});

app.post("/api/HttpTest/encoded", (req, res) => {
  res.json({
    body: req.body
  });
});

const httpTrigger = createAzureFunctionHandler(app);

export default httpTrigger;
