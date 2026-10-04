# Teslemetry TypeScript Monorepo

pnpm workspaces + changesets. `packages/api` is the `@teslemetry/api` SDK; the other packages depend on it via `workspace:*`. The ioBroker adapter lives in its own repo, [Teslemetry/ioBroker.teslemetry](https://github.com/Teslemetry/ioBroker.teslemetry).

## Development

```bash
pnpm install
pnpm build                                # or --filter <package> build
pnpm --filter <package> test              # tsx --test test/*.test.ts (Node's runner)
pnpm --filter @teslemetry/api client      # regenerate the OpenAPI client
pnpm --filter @teslemetry/api verify:client  # fail if the committed client calls a path the public spec lacks
pnpm lint                                 # oxlint, single root invocation (pnpm lint:fix to fix)
pnpm -r --no-bail tsc                     # typecheck every package
```

To make a change: branch, edit, `pnpm build`, `pnpm changeset`, commit (including `.changeset/`), open a PR. Release mechanics: `RELEASE.md`.

- **TypeScript 7.x**: no `baseUrl`, no `node`/`node10` `moduleResolution`, and `types` defaults to `[]` - a tsconfig needing Node types must set `"types": ["node"]`.
- tsdown's `rolldown-plugin-dts` (not tsdown) consumes the compiler API; it must support the installed `typescript` major or declaration emit breaks.
- The `.oxlintrc.json` `overrides` silence deliberate patterns (typed-emitter declaration merging, Node-RED `const node = this;`), not bugs.
- Never hand-edit the generated client (`packages/api/src/client/**`) and never add lint overrides for it.

## `@teslemetry/api` (core SDK)

- **Before assuming a capability gap**, grep `src/client/sdk.gen.ts`: the endpoint usually exists, and the work is a wrapper method in `TeslemetryVehicleApi.ts`/`TeslemetryEnergyApi.ts`.
- **Codegen source**: generate only from the live `https://api.teslemetry.com/openapi.yaml` (the public surface). Never generate from the api repo's `openapi.json` or a dev server's spec - those are the internal surface and would publish routes production never serves. If a merged api change is not live yet, wait for the deploy (Cloudflare caches the spec 4h; bust with `?cachebust=<epoch>`).
- `@hey-api/openapi-ts` is pinned to a `0.0.0-next-*` build because stable releases crash on `typescript@7.x`. Move to stable once `typescript` leaves a stable tag's dependency tree.
- **Credential leak**: the access token travels as `?token=...`, so `request.url`/`response.url` carry the credential. Any logging, error-reporting or telemetry code must strip the whole query string before it reaches a consumer-wired `logger`.
- `tesla-fleet-api` is a devDependency on purpose: tsdown bundles devDependencies, so it is inlined with no runtime dependency. Deep-import its leaf modules (`dist/tariff.js`, `dist/types/*.js`), never the package root, and check those leaves before hand-maintaining a constant. Any new bundled devDependency needs a `deps.onlyBundle` entry in `tsdown.config.ts`.

**Streaming rules**:
- Energy SSE events do not agree on the site identifier (`site_id` vs `id`). Check the backend schema for a new event's field; do not assume `site_id`.
- Every `on()` override in the stream classes must call `super.on()` **before** replaying a cached value, or `once()` breaks.
- `src/sseTopics.ts`'s `SSE_TOPICS` mirrors the API repo's `src/lib/sseTopics.ts` allowlist - keep both in sync. Expand presets client-side; never send a preset name or wildcard over the wire.
- `tariff_content_v2: null` is the server's tariff-removal signal, distinct from `undefined` (never received). Cache/replay logic must not treat `null` as falsy-skip.

## `node-red-contrib-teslemetry`

- New backend telemetry fields need no code here (the signal node's dropdown comes from `getFields()`). Only new SDK **commands** or missing **streams** are real gaps. Do not reimplement threshold or transition logic that core `switch`/`change`/`function` nodes can compose.
- New streaming nodes extend `attachStreamStatus()` in `src/shared.ts` instead of duplicating listener wiring. Input validation goes in `src/validation.ts`.
- Local testing: `pnpm build && pnpm link --global`, then `pnpm link --global node-red-contrib-teslemetry` from `~/.node-red`.

## `n8n-nodes-teslemetry`

- A node's `version` field must match `package.json`.
- The Trigger node's Signal event covers any `getFields()` field, and `vehicleData()`/`getLiveStatus()`/`getSiteInfo()` cover reads - add operations only for new **commands**.
- Local testing: `pnpm build && pnpm link --global`, then `pnpm link --global n8n-nodes-teslemetry` from `~/.n8n/nodes`.

## `homebridge-teslemetry`

- Publishing requires npm trusted publishing registered for this package name (an npm org owner action).
- **Typing**: generic helpers over HomeKit `Service`/`Characteristic` statics need `WithUUID<{ new (...): T }>`-shaped types (see `*-services/base.ts`), not `typeof Service`, or `addService`/`getCharacteristic` overloads break.
- **subType**: siblings that share a HAP service type (LockMechanism, Switch) must each pass a stable unique `subType`, or they collapse onto one service. Services with no sibling of their type (Information, Battery, Climate) must omit `subType`, or default `AccessoryInformation` reuse breaks. Covered by `test/serviceCollision.test.ts` and `test/energyServiceCollision.test.ts`.
- **Gating**: never register model- or config-dependent services unconditionally. Gate model-specific services on `useTeslaModel(vehicle.vin)`; gate config-dependent pieces on vehicle metadata (e.g. `config.can_actuate_trunks`).
- **Never default a not-yet-received reading to "safe"**: either create the sensor lazily when its first signal arrives, or hold `StatusFault` at `GENERAL_FAULT` until the first real payload.
- **Contact-sensor polarity** (whole package): `CONTACT_DETECTED` = normal (closed, no fault, grid up); `CONTACT_NOT_DETECTED` = triggered/abnormal.
- `setStreamFault()` sets `StatusFault` only when the service type lists it in `service.optionalCharacteristics` (not `testCharacteristic()`); for control services it is a deliberate no-op. A lazily-populated per-entity sensor map must hydrate from the persisted accessory cache at construction (see `WallConnectorService`).
- **Signal choice**: check `packages/api/src/client/types.gen.ts` for whether a narrow boolean or a state enum is the true source (e.g. heating state comes from `HvacPower`, not `HvacACEnabled`).
- **No mapping is better than a wrong one**: leave distance/energy signals unwired rather than forcing them onto an unrelated HAP sensor type.
- **Energy data path**: `energy-services/*` subscribe to `site.api` events and never touch `site.sse`; only `src/energy.ts` re-wraps stream events onto `site.api`. Stream `site_info` is a partial subset, so it is merged, never treated as the full REST shape.
- **Testing**: use the fakes in `test/fake*.ts` with real hap-nodejs classes; drive characteristics via `handleSetRequest`/`handleGetRequest`, not `setValue`.

## CI/CD

- `.github/workflows/reusable-ci.yml` is the one place for CI checks; `ci.yml` and `publish.yml`'s `validate` job both call it.
- There is no branch protection: `publish.yml`'s `release` job must keep `needs: validate` in the same run. Do not inline CI steps into `publish.yml` or drop that gate.
- `pnpm/action-setup` stays `@v4` with no `version:`, so it reads `packageManager`. A drifted pin makes `changeset publish` fall back to `npm publish` and fail with `EUNKNOWNCONFIG`.
- On an `EBADENGINE` publish failure, compare `npm view npm@latest engines` with the workflow's `node-version` first.

## Maintaining this file

Keep only what an agent cannot learn by reading the code: commands, rules that differ from normal practice, safety boundaries, and decisions with their reason. Prune before appending.
