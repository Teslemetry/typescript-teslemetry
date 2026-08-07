import { test } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry, useTeslaModel } from "../src/Teslemetry.js";

test("response interceptor does not log the access token from the response URL", async () => {
  const logged: string[] = [];
  const teslemetry = new Teslemetry("fake-access-token", {
    logger: {
      debug: (...args: unknown[]) => logged.push(args.join(" ")),
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  const responseInterceptor = teslemetry.client.interceptors.response.fns[0];
  assert.ok(responseInterceptor);

  const fakeResponse = {
    url: "https://api.teslemetry.com/api/1/vehicles?token=super-secret-fake-token-value",
    status: 200,
    headers: new Headers(),
  };

  await responseInterceptor(fakeResponse as never, {} as never, {} as never);

  assert.ok(logged.length > 0);
  for (const line of logged) {
    assert.ok(
      !line.includes("token") && !line.includes("secret"),
      `logged line leaked query string: ${line}`,
    );
  }
});

test("useTeslaModel decodes the 4th VIN character to a model name", () => {
  assert.equal(useTeslaModel("5YJ3E1EA1KF000000"), "Model 3");
  assert.equal(useTeslaModel("5YJSA1E11KF000000"), "Model S");
  assert.equal(useTeslaModel("5YJXA1E11KF000000"), "Model X");
  assert.equal(useTeslaModel("5YJYGDEE1LF000000"), "Model Y");
  assert.equal(useTeslaModel("7SACGDEE1PF000000"), "Cybertruck");
  assert.equal(useTeslaModel("7SATGDEE1PF000000"), "Semi");
  assert.equal(useTeslaModel("7SAAGDEE1PF000000"), "Cybercab");
  assert.equal(useTeslaModel("0000000000000000"), "Unknown");
});
