import { ChildProcess, spawn, exec } from "child_process";
import * as qs from "querystring";
import axios from "axios";

// do not convert to default import despite vscode hints :-)
import * as treeKill from "tree-kill";

// eslint-disable-next-line functional/no-let
let spawnedFunc: ChildProcess;
// eslint-disable-next-line functional/no-let
let funcAddress: string;
// eslint-disable-next-line functional/no-let
let isStopping = false;

// do not reject promise on non-200 statuses
// eslint-disable-next-line functional/immutable-data
axios.defaults.validateStatus = () => true;

const startFunc = () =>
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  new Promise<{ p: ChildProcess; address: string }>(res => {
    const func = spawn("func", ["start"], { detached: true });
    func.stdout.on("data", data => {
      if (!isStopping) {
        // eslint-disable-next-line no-console
        console.log(`${data}`);
      }
      const matches = String(data).match(/(http:\/\/[^{]+)/);
      if (matches && matches[1]) {
        // eslint-disable-next-line no-console
        console.log("serving function at %s", matches[1]);
        res({
          address: matches[1].replace("localhost", "127.0.0.1"),
          p: func
        });
      }
    });
  });

const stopFunc = (p: ChildProcess) => {
  console.log(`Stopping functions ${p.pid}...`);
  isStopping = true;
  // we call John Wick to kill hanging processes
  exec(`ps -ef | grep "[f]unc start" | awk '{print $2}' | xargs -I{} kill -9 {}`);
};

beforeAll(done => {
  startFunc()
    .then(({ p, address }) => {
      spawnedFunc = p;
      funcAddress = address;
      done();
    })
    .catch(_ => 0);
});

afterAll(done => {
  spawnedFunc && stopFunc(spawnedFunc);
  done();
});

describe("Azure functions handler", () => {
  it("should handle a simple GET request", async () => {
    const result = await axios.get(`${funcAddress}HttpTest/ping`);
    expect(result.status).toEqual(200);
    expect(result.data).toEqual("PONG");
  });

  it("should parse path params", async () => {
    const result = await axios.get(`${funcAddress}HttpTest/path/foo`);
    expect(result.status).toEqual(200);
    expect(result.data).toEqual({ foo: "foo" });
  });

  it("should parse params of GET request", async () => {
    const result = await axios.get(`${funcAddress}HttpTest/get?param1=param1`);
    expect(result.status).toEqual(200);
    expect(result.data).toEqual({
      query: { param1: "param1" }
    });
  });

  it("should parse params of POST request", async () => {
    const result = await axios.post(
      `${funcAddress}HttpTest/post?param1=param1`,
      {
        data: "data"
      }
    );
    expect(result.status).toEqual(200);
    expect(result.data).toEqual({
      body: { data: "data" },
      query: { param1: "param1" }
    });
  });

  it("should handle 404 status", async () => {
    const result = await axios.get(`${funcAddress}HttpTest/status?status=404`);
    expect(result.status).toEqual(404);
  });

  it("should handle 500 status", async () => {
    const result = await axios.get(`${funcAddress}HttpTest/status?status=500`);
    expect(result.status).toEqual(500);
  });

  it("should parse and respond with custom headers", async () => {
    const result = await axios.get(`${funcAddress}HttpTest/headers`, {
      headers: {
        "x-custom-header-in": "value"
      }
    });
    expect(result.status).toEqual(200);
    expect(result.data).toMatchObject({
      headers: { "x-custom-header-in": "value" }
    });
    expect(result.headers).toMatchObject({
      "x-custom-header-out": "value"
    });
  });

  it("should parse urlencoded request", async () => {
    const result = await axios.post(
      `${funcAddress}HttpTest/encoded`,
      qs.stringify({
        body: "foobar"
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    expect(result.status).toEqual(200);
    expect(result.data).toMatchObject({
      body: "body=foobar"
    });
  });
});
