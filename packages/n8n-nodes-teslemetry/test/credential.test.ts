import { strict as assert } from "node:assert";
import { test } from "node:test";
import { TeslemetryApi } from "../src/credentials/TeslemetryApi.credentials";

test("credential tests the token against /api/test with a bearer header", () => {
  const credential = new TeslemetryApi();
  assert.equal(credential.test.request.baseURL, "https://api.teslemetry.com");
  assert.equal(credential.test.request.url, "/api/test");
  assert.equal(credential.authenticate.type, "generic");
  assert.equal(
    (credential.authenticate.properties.headers as Record<string, string>).Authorization,
    "=Bearer {{$credentials.accessToken}}",
  );
});

test("credential documentation link is the live docs page", () => {
  assert.equal(new TeslemetryApi().documentationUrl, "https://teslemetry.com/docs");
});
