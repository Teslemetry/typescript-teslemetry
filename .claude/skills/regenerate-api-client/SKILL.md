---
name: regenerate-api-client
description: Use when @teslemetry/api needs a new or changed Teslemetry endpoint - regenerate packages/api/src/client from the live public spec, verify it, and add the wrapper method.
---

# Regenerate the `@teslemetry/api` client

1. **Check first.** Grep `packages/api/src/client/sdk.gen.ts` for the route (for example `command/flash_lights`). If the function exists, skip to step 5: the work is only a wrapper method.
2. **Confirm the route is live.** The only permitted source is `https://api.teslemetry.com/openapi.yaml` (the `input:` in `packages/api/openapi-ts.config.ts`). Never point `input:` at the api repo's `openapi.json` or a dev server: those are the internal surface and publish routes production never serves. Check the live spec with a cache-buster, because Cloudflare caches it for 4 hours:
   ```bash
   curl -s "https://api.teslemetry.com/openapi.json?cachebust=$(date +%s)" | grep -c '"/api/1/vehicles/{vin}/command/<name>"'
   ```
   If the route is not there yet, wait for the api deploy. Do not change the source.
3. **Regenerate.** `pnpm --filter @teslemetry/api client`. Never hand-edit `src/client/**` or add lint overrides for it. If `openapi-ts` crashes, check that `@hey-api/openapi-ts` is still the `0.0.0-next-*` pin in `packages/api/package.json` (stable releases crash on `typescript@7.x`).
4. **Verify.** `pnpm --filter @teslemetry/api verify:client` must pass. It fails if the committed client calls a path the public spec does not serve. Expect unrelated drift in the regenerated files: the live spec moves. Keep it, unless it removes something a wrapper still uses.
5. **Wrap it.** Add a public async method to `src/TeslemetryVehicleApi.ts` or `src/TeslemetryEnergyApi.ts`. Copy a neighbour such as `flashLights()`: import the generated function, pass `path` and `client: this.root.client`, return `data`. Never log `request.url`/`response.url`: the token travels as `?token=...`.
6. **Check.** `pnpm --filter @teslemetry/api build`, `pnpm --filter @teslemetry/api test`, `pnpm --filter @teslemetry/api tsc`, `pnpm lint`. If `tsc` fails in `test/vehicleApi.test.ts`, the regenerated client documents a `vehicle_data` endpoint that `VehicleDataEndpoints` in `src/TeslemetryVehicleApi.ts` lacks: add it there and to the test lists.
7. **Changeset.** `pnpm changeset`: a `minor` bump for `@teslemetry/api` when you add a method. Commit `.changeset/` with the code.

To expose the new command in Node-RED, n8n or homebridge, continue with the `add-command-to-integrations` skill.
