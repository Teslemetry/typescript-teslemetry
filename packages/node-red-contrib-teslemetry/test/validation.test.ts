import { test } from "node:test";
import assert from "node:assert/strict";
import { validateParameters } from "../src/validation.js";

test("wrong-type sensitive parameter values never appear in the error message (only their JS type does)", () => {
  assert.throws(
    () =>
      validateParameters(
        { password: 12345 },
        { password: { required: true, type: "string", sensitive: true } },
      ),
    (err: Error) => {
      assert.match(err.message, /got number/);
      assert.doesNotMatch(err.message, /12345/);
      return true;
    },
  );
});

test("sensitive numeric parameter out-of-range values are redacted", () => {
  assert.throws(
    () =>
      validateParameters(
        { limitMph: 5 },
        {
          limitMph: {
            required: true,
            type: "number",
            min: 50,
            max: 90,
            sensitive: true,
          },
        },
      ),
    (err: Error) => {
      assert.match(err.message, /\[redacted\]/);
      assert.doesNotMatch(err.message, /\b5\b/);
      return true;
    },
  );
});

test("non-sensitive parameter values are still included in validation error messages", () => {
  assert.throws(
    () =>
      validateParameters(
        { percent: 150 },
        { percent: { required: true, type: "number", min: 0, max: 100 } },
      ),
    (err: Error) => {
      assert.match(err.message, /150/);
      return true;
    },
  );
});

test("object type rejects arrays unless isArray is set", () => {
  assert.throws(
    () =>
      validateParameters(
        { seasons: [1, 2, 3] },
        { seasons: { required: true, type: "object" } },
      ),
    (err: Error) => {
      assert.match(err.message, /must be an object, got array/);
      return true;
    },
  );
});

test("object type with isArray rejects a plain object", () => {
  assert.throws(
    () =>
      validateParameters(
        { daily_charges: { foo: "bar" } },
        { daily_charges: { required: true, type: "object", isArray: true } },
      ),
    (err: Error) => {
      assert.match(err.message, /must be an array, got object/);
      return true;
    },
  );
});

test("object type accepts a plain object", () => {
  assert.doesNotThrow(() =>
    validateParameters(
      { seasons: { winter: {} } },
      { seasons: { required: true, type: "object" } },
    ),
  );
});

test("missing required sensitive parameter does not leak into the error message", () => {
  assert.throws(
    () =>
      validateParameters(
        {},
        { password: { required: true, type: "string", sensitive: true } },
      ),
    (err: Error) => {
      assert.match(err.message, /Required parameter 'password' is missing/);
      return true;
    },
  );
});
