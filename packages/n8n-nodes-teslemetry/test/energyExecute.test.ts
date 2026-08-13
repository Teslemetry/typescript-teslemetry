import { test } from "node:test";
import assert from "node:assert/strict";
import { TeslemetryEnergy } from "../src/nodes/TeslemetryEnergy.node.js";
import { withMockedFetch, captureRequest, fakeExecuteContext } from "./testHelpers.js";

const SITE_ID = 123;

type Case = {
  operation: string;
  params?: Record<string, unknown>;
  path: string;
  method: "GET" | "POST";
  body?: Record<string, unknown> | null;
};

const CASES: Case[] = [
  { operation: "getLiveStatus", path: "live_status", method: "GET", body: null },
  { operation: "getSiteInfo", path: "site_info", method: "GET", body: null },
  // getTariff has no dedicated endpoint - it reads from getSiteInfo().
  { operation: "getTariff", path: "site_info", method: "GET", body: null },
  {
    operation: "setBackupReserve",
    params: { backup_reserve_percent: 30 },
    path: "backup",
    method: "POST",
    body: { backup_reserve_percent: 30 },
  },
  {
    operation: "setOperationMode",
    params: { default_real_mode: "self_consumption" },
    path: "operation",
    method: "POST",
    body: { default_real_mode: "self_consumption" },
  },
  {
    operation: "setStormMode",
    params: { enabled: true },
    path: "storm_mode",
    method: "POST",
    body: { enabled: true },
  },
  {
    operation: "gridImportExport",
    params: {
      customer_preferred_export_rule: "pv_only",
      disallow_charge_from_grid_with_solar_installed: true,
    },
    path: "grid_import_export",
    method: "POST",
    body: {
      customer_preferred_export_rule: "pv_only",
      disallow_charge_from_grid_with_solar_installed: true,
    },
  },
  {
    operation: "setOffGridVehicleChargingReserve",
    params: { off_grid_vehicle_charging_reserve_percent: 25 },
    path: "off_grid_vehicle_charging_reserve",
    method: "POST",
    body: { off_grid_vehicle_charging_reserve_percent: 25 },
  },
];

for (const c of CASES) {
  test(`TeslemetryEnergy.execute dispatches ${c.operation} to the correct endpoint and argument shape`, async () => {
    const { handler, getRequest } = captureRequest({
      response: { tariff_id: "t1", tariff_content: {}, tariff_content_v2: {} },
    });
    const node = new TeslemetryEnergy();
    const context = fakeExecuteContext([{ operation: c.operation, siteId: SITE_ID, ...c.params }]);

    const result = await withMockedFetch(handler, () => node.execute.call(context));

    const request = getRequest();
    assert.ok(request, "expected a request to be sent");
    assert.equal(request!.method, c.method);
    assert.ok(
      new URL(request!.url).pathname.endsWith(`/api/1/energy_sites/${SITE_ID}/${c.path}`),
      `expected path ending in ${c.path}, got ${new URL(request!.url).pathname}`,
    );

    if (c.body !== null && c.body !== undefined) {
      const sentBody = await request!.clone().json();
      assert.deepEqual(sentBody, c.body);
    }

    assert.equal(result[0].length, 1);
  });
}

test("TeslemetryEnergy.execute getTariff shapes the result as { response: {...} }", async () => {
  const { handler } = captureRequest({
    response: {
      tariff_id: "t1",
      tariff_content: { foo: 1 },
      tariff_content_v2: { bar: 2 },
      unrelated_field: "should not leak in",
    },
  });
  const node = new TeslemetryEnergy();
  const context = fakeExecuteContext([{ operation: "getTariff", siteId: SITE_ID }]);

  const result = await withMockedFetch(handler, () => node.execute.call(context));

  assert.deepEqual(result[0][0].json, {
    response: {
      tariff_id: "t1",
      tariff_content: { foo: 1 },
      tariff_content_v2: { bar: 2 },
    },
  });
});

test("TeslemetryEnergy.execute throws on failure when Continue On Fail is disabled", async () => {
  const node = new TeslemetryEnergy();
  const context = fakeExecuteContext([{ operation: "getLiveStatus", siteId: SITE_ID }], false);

  await assert.rejects(() =>
    withMockedFetch(
      () => new Response(null, { status: 500, statusText: "Server Error" }),
      () => node.execute.call(context),
    ),
  );
});

test("TeslemetryEnergy.execute returns an error item per failed item when Continue On Fail is enabled", async () => {
  const node = new TeslemetryEnergy();
  const context = fakeExecuteContext(
    [
      { operation: "getLiveStatus", siteId: SITE_ID },
      { operation: "setStormMode", siteId: SITE_ID, enabled: false },
    ],
    true,
  );

  let call = 0;
  const result = await withMockedFetch(
    () => {
      call += 1;
      if (call === 1) {
        return new Response(null, { status: 500, statusText: "Server Error" });
      }
      return new Response(JSON.stringify({ response: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    () => node.execute.call(context),
  );

  assert.equal(result[0].length, 2);
  assert.ok((result[0][0].json as { error?: string }).error);
  assert.deepEqual(result[0][1].json, { response: {} });
});

test("TeslemetryEnergy.execute throws for an unknown operation", async () => {
  const node = new TeslemetryEnergy();
  const context = fakeExecuteContext([{ operation: "notARealOperation", siteId: SITE_ID }]);

  await assert.rejects(() => node.execute.call(context), /Unknown operation/);
});
