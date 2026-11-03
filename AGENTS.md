# Teslemetry TypeScript Monorepo

pnpm workspaces + changesets. `packages/api` is the `@teslemetry/api` SDK; the other packages except `n8n-nodes-teslemetry` and `pro` (`@teslemetry/pro`, its copy for the teslemetry.pro schema) depend on it via `workspace:*`. The ioBroker adapter lives in its own repo, [Teslemetry/ioBroker.teslemetry](https://github.com/Teslemetry/ioBroker.teslemetry).

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

- A changeset names each package by the `name` in its `package.json` (`@teslemetry/node-red-contrib-teslemetry`, not the directory name). A wrong name fails Publish with `mapGetOrThrow`; `pnpm changeset status` shows it before merge.
- The Node-RED package bundles `@teslemetry/api` (a devDependency), so changesets never bumps it for an api change. An api change that Node-RED users need must also carry a `@teslemetry/node-red-contrib-teslemetry` changeset. `homebridge-teslemetry` depends on the api at runtime and is bumped automatically.
- **TypeScript 7.x**: no `baseUrl`, no `node`/`node10` `moduleResolution`, and `types` defaults to `[]` - a tsconfig needing Node types must set `"types": ["node"]`.
- tsdown's `rolldown-plugin-dts` (not tsdown) consumes the compiler API; it must support the installed `typescript` major or declaration emit breaks.
- The `.oxlintrc.json` `overrides` silence deliberate patterns (typed-emitter declaration merging, Node-RED `const node = this;`), not bugs.
- Never hand-edit the generated clients (`packages/api/src/client/**`, `packages/pro/src/client/**`) and never add lint overrides for them.

## `@teslemetry/api` (core SDK)

- **Before assuming a capability gap**, grep `src/client/sdk.gen.ts`: the endpoint usually exists, and the work is a wrapper method in `TeslemetryVehicleApi.ts`/`TeslemetryEnergyApi.ts`.
- **Codegen source**: generate only from the live `https://api.teslemetry.com/openapi.yaml` (the public surface). Never generate from the api repo's `openapi.json` or a dev server's spec - those are the internal surface and would publish routes production never serves. If a merged api change is not live yet, wait for the deploy (Cloudflare caches the spec 4h; bust with `?cachebust=<epoch>`). `packages/pro` generates from `https://api.teslemetry.pro/openapi.yaml` under the same rule.
- `packages/pro` is a hand-kept copy of `packages/api`. Fix a bug in their shared code in `packages/api` in its own PR, then copy the fix into `packages/pro`; do not bundle api fixes into a pro PR.
- `@hey-api/openapi-ts` is pinned to a `0.0.0-next-*` build because stable releases crash on `typescript@7.x`. Move to stable once `typescript` leaves a stable tag's dependency tree.
- **Credential leak**: the access token travels as `?token=...`, so `request.url`/`response.url` carry the credential. Any logging, error-reporting or telemetry code must strip the whole query string before it reaches a consumer-wired `logger`.
- `tesla-fleet-api` is a devDependency on purpose: tsdown bundles devDependencies, so it is inlined with no runtime dependency. Import its subpaths (`tesla-fleet-api/tariff`, `/const`, `/types`), never the package root (it pulls in `@teslemetry/tesla-protocol`) or `dist/...` (blocked by its `exports` map), and check those subpaths before hand-maintaining a constant. Any new bundled devDependency needs a `deps.onlyBundle` entry in `tsdown.config.ts`.

**Streaming rules**:
- Energy SSE events do not agree on the site identifier (`site_id` vs `id`). Check the backend schema for a new event's field; do not assume `site_id`.
- Every `on()` override in the stream classes must call `super.on()` **before** replaying a cached value, or `once()` breaks.
- `src/sseTopics.ts`'s `SSE_TOPICS` mirrors the API repo's `src/lib/sseTopics.ts` allowlist - keep both in sync. Expand presets client-side; never send a preset name or wildcard over the wire.
- `tariff_content_v2: null` is the server's tariff-removal signal, distinct from `undefined` (never received). Cache/replay logic must not treat `null` as falsy-skip.

## `@teslemetry/node-red-contrib-teslemetry`

- New backend telemetry fields need no code here (the signal node's dropdown comes from `getFields()`). Only new SDK **commands** or missing **streams** are real gaps. Do not reimplement threshold or transition logic that core `switch`/`change`/`function` nodes can compose.
- New streaming nodes extend `attachStreamStatus()` in `src/shared.ts` instead of duplicating listener wiring. Input validation goes in `src/validation.ts`.

## `@teslemetry/n8n-nodes-teslemetry`

- The package must pass n8n's community-node verification, so it never uses `@teslemetry/api`: every request goes through `teslemetryRequest()` in `nodes/shared.ts` (n8n's `httpRequestWithAuthentication`), with no timers, `events`, global `fetch` or `console`. Meet n8n's constraints in this package, never by changing the SDK. The licence stays MIT because verification requires it.
- `pnpm validate` (`n8n-node lint`) checks the source. `npx @n8n/scan-community-package` scans only versions already on npm.
- The Trigger node's Signal event covers any `getFields()` field, and the `vehicleData`/`getLiveStatus`/`getSiteInfo` operations cover reads - add operations only for new **commands**.

## `homebridge-teslemetry`

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
- The `main` ruleset requires the two "Build, Lint & Typecheck" checks and CodeRabbit on PRs, but admins bypass it, so `publish.yml`'s `release` job must keep `needs: validate` in the same run. Do not inline CI steps into `publish.yml` or drop that gate.
- The "chore: version packages" PR gets no CI run on its own, because pushes made with `GITHUB_TOKEN` start no workflows. Push an empty commit to `changeset-release/main` to start CI. A later merge to `main` rebuilds that branch and drops the commit, so confirm the checks ran on the current head.
- A package name's first release needs an npm org owner to register npm trusted publishing for that name (or publish the first version by hand); otherwise `changeset publish` fails for it.
- `pnpm/action-setup` stays `@v4` with no `version:`, so it reads `packageManager`. A drifted pin makes `changeset publish` fall back to `npm publish` and fail with `EUNKNOWNCONFIG`.
- On an `EBADENGINE` publish failure, compare `npm view npm@latest engines` with the workflow's `node-version` first.

## Maintaining this file

Keep only what an agent cannot learn by reading the code: commands, rules that differ from normal practice, safety boundaries, and decisions with their reason. Prune before appending.
