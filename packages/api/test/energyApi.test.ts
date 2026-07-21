import { test } from "node:test";
import assert from "node:assert/strict";
import { Teslemetry } from "../src/Teslemetry.js";
import type { Logger } from "../src/logger.js";

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

function makeTeslemetry(
  fetchImpl: (request: Request) => Promise<Response>,
): Teslemetry {
  const teslemetry = new Teslemetry(async () => "token", {
    region: "na",
    logger: silentLogger,
  });
  teslemetry.client.setConfig({ fetch: fetchImpl as typeof fetch });
  return teslemetry;
}

test("setTimeOfUseSettings posts the tou_settings body to the site's time_of_use_settings endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;
  let receivedBody: unknown;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    receivedBody = JSON.parse(await request.text());
    return new Response(
      JSON.stringify({ response: { code: 200, message: "Updated" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const touSettings = {
    tariff_content_v2: {
      code: "PGE-EV2-A",
      utility: "PG&E",
      currency: "USD",
    },
  };

  const result = await teslemetry
    .energySite(siteId)
    .setTimeOfUseSettings({ tou_settings: touSettings });

  assert.equal(receivedMethod, "POST");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/time_of_use_settings$`),
  );
  assert.deepEqual(receivedBody, { tou_settings: touSettings });
  assert.deepEqual(result, { response: { code: 200, message: "Updated" } });
});

test("getPrograms fetches the site's programs endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    return new Response(JSON.stringify({ response: { programs: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const result = await teslemetry.energySite(siteId).getPrograms();

  assert.equal(receivedMethod, "GET");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/programs$`),
  );
  assert.deepEqual(result, { response: { programs: [] } });
});

test("sendCommand posts the category/command_name/params body to the site's command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;
  let receivedBody: unknown;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    receivedBody = JSON.parse(await request.text());
    return new Response(JSON.stringify({ response: { ok: true } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const body = {
    category: "teg" as const,
    command_name: "get_system_info_request",
    params: {},
  };

  const result = await teslemetry.energySite(siteId).sendCommand(body);

  assert.equal(receivedMethod, "POST");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/command$`),
  );
  assert.deepEqual(receivedBody, body);
  assert.deepEqual(result, { response: { ok: true } });
});

test("getCommandSystemInfo fetches the gateway's system_info command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    return new Response(
      JSON.stringify({ response: { din: "abc-123" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const result = await teslemetry.energySite(siteId).getCommandSystemInfo();

  assert.equal(receivedMethod, "GET");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/command/system_info$`),
  );
  assert.deepEqual(result, { response: { din: "abc-123" } });
});

test("getCommandNetworkingStatus fetches the gateway's networking_status command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    return new Response(JSON.stringify({ response: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const result = await teslemetry
    .energySite(siteId)
    .getCommandNetworkingStatus();

  assert.equal(receivedMethod, "GET");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/command/networking_status$`),
  );
  assert.deepEqual(result, { response: {} });
});

test("getCommandAuthorizedClients fetches the gateway's authorized_clients command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    return new Response(JSON.stringify({ response: { clients: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const result = await teslemetry
    .energySite(siteId)
    .getCommandAuthorizedClients();

  assert.equal(receivedMethod, "GET");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/command/authorized_clients$`),
  );
  assert.deepEqual(result, { response: { clients: [] } });
});

test("getCommandSignedCommandsPublicKey fetches the gateway's signed_commands_public_key command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    return new Response(JSON.stringify({ response: { public_key: "key" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const result = await teslemetry
    .energySite(siteId)
    .getCommandSignedCommandsPublicKey();

  assert.equal(receivedMethod, "GET");
  assert.match(
    receivedUrl ?? "",
    new RegExp(
      `/api/1/energy_sites/${siteId}/command/signed_commands_public_key$`,
    ),
  );
  assert.deepEqual(result, { response: { public_key: "key" } });
});

test("getCommandWifiScan fetches the gateway's wifi_scan command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    return new Response(JSON.stringify({ response: { networks: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const result = await teslemetry.energySite(siteId).getCommandWifiScan();

  assert.equal(receivedMethod, "GET");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/command/wifi_scan$`),
  );
  assert.deepEqual(result, { response: { networks: [] } });
});

test("getCommandDeviceCert fetches the gateway's device_cert command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    return new Response(JSON.stringify({ response: { cert: "cert" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const result = await teslemetry.energySite(siteId).getCommandDeviceCert();

  assert.equal(receivedMethod, "GET");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/command/device_cert$`),
  );
  assert.deepEqual(result, { response: { cert: "cert" } });
});

test("scheduleBackupEvent posts the scheduling_info body to the site's schedule_backup_event command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;
  let receivedBody: unknown;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    receivedBody = JSON.parse(await request.text());
    return new Response(
      JSON.stringify({ response: { request_id: "req-1" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const scheduling_info = { start_time: "2026-07-21T00:00:00Z", duration_seconds: 3600 };

  const result = await teslemetry
    .energySite(siteId)
    .scheduleBackupEvent(scheduling_info);

  assert.equal(receivedMethod, "POST");
  assert.match(
    receivedUrl ?? "",
    new RegExp(
      `/api/1/energy_sites/${siteId}/command/schedule_backup_event$`,
    ),
  );
  assert.deepEqual(receivedBody, { scheduling_info });
  assert.deepEqual(result, { response: { request_id: "req-1" } });
});

test("cancelBackupEvent posts to the site's cancel_backup_event command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    return new Response(
      JSON.stringify({ response: { request_id: "req-2" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const result = await teslemetry.energySite(siteId).cancelBackupEvent();

  assert.equal(receivedMethod, "POST");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/command/cancel_backup_event$`),
  );
  assert.deepEqual(result, { response: { request_id: "req-2" } });
});

test("setLocalSiteConfig posts the body to the site's set_local_site_config command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;
  let receivedBody: unknown;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    receivedBody = JSON.parse(await request.text());
    return new Response(
      JSON.stringify({ response: { request_id: "req-3" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const body = { some_field: "value" };

  const result = await teslemetry
    .energySite(siteId)
    .setLocalSiteConfig(body);

  assert.equal(receivedMethod, "POST");
  assert.match(
    receivedUrl ?? "",
    new RegExp(
      `/api/1/energy_sites/${siteId}/command/set_local_site_config$`,
    ),
  );
  assert.deepEqual(receivedBody, body);
  assert.deepEqual(result, { response: { request_id: "req-3" } });
});

test("setIslandMode posts the mode/force body to the site's set_island_mode command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;
  let receivedBody: unknown;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    receivedBody = JSON.parse(await request.text());
    return new Response(
      JSON.stringify({ response: { request_id: "req-4" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const result = await teslemetry
    .energySite(siteId)
    .setIslandMode(1, true);

  assert.equal(receivedMethod, "POST");
  assert.match(
    receivedUrl ?? "",
    new RegExp(`/api/1/energy_sites/${siteId}/command/set_island_mode$`),
  );
  assert.deepEqual(receivedBody, { mode: 1, force: true });
  assert.deepEqual(result, { response: { request_id: "req-4" } });
});

test("addAuthorizedClient posts the body to the site's add_authorized_client command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;
  let receivedBody: unknown;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    receivedBody = JSON.parse(await request.text());
    return new Response(
      JSON.stringify({ response: { request_id: "req-5" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const body = {
    key_type: 1,
    public_key: "base64key",
    authorized_client_type: 2,
    description: "installer laptop",
  };

  const result = await teslemetry
    .energySite(siteId)
    .addAuthorizedClient(body);

  assert.equal(receivedMethod, "POST");
  assert.match(
    receivedUrl ?? "",
    new RegExp(
      `/api/1/energy_sites/${siteId}/command/add_authorized_client$`,
    ),
  );
  assert.deepEqual(receivedBody, body);
  assert.deepEqual(result, { response: { request_id: "req-5" } });
});

test("removeAuthorizedClient posts the body to the site's remove_authorized_client command endpoint", async () => {
  const siteId = 12345;
  let receivedUrl: string | undefined;
  let receivedMethod: string | undefined;
  let receivedBody: unknown;

  const teslemetry = makeTeslemetry(async (request) => {
    receivedUrl = request.url;
    receivedMethod = request.method;
    receivedBody = JSON.parse(await request.text());
    return new Response(
      JSON.stringify({ response: { request_id: "req-6" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const body = { identifier: "installer-key-1" };

  const result = await teslemetry
    .energySite(siteId)
    .removeAuthorizedClient(body);

  assert.equal(receivedMethod, "POST");
  assert.match(
    receivedUrl ?? "",
    new RegExp(
      `/api/1/energy_sites/${siteId}/command/remove_authorized_client$`,
    ),
  );
  assert.deepEqual(receivedBody, body);
  assert.deepEqual(result, { response: { request_id: "req-6" } });
});
