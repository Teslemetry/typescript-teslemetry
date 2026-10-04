---
name: add-homebridge-service
description: Use when adding or changing a HomeKit service in homebridge-teslemetry - the subType, gating, StatusFault, contact-sensor polarity and test-fake checklist.
---

# Add a homebridge HomeKit service

Work in `packages/homebridge-teslemetry`. Vehicle services live in `src/vehicle-services/`, energy services in `src/energy-services/`.

1. **Choose the signal and HAP type.**
   - Check `packages/api/src/client/types.gen.ts` for the true source. Prefer a state enum to a narrow boolean (heating state comes from `HvacPower`, not `HvacACEnabled`).
   - If no stock hap-nodejs characteristic means the value (arbitrary distance or energy), do not add the service. No mapping is better than a wrong one.
   - Contact sensors: `CONTACT_DETECTED` = normal (closed, no fault, grid up); `CONTACT_NOT_DETECTED` = triggered or abnormal.

2. **Write the class.** Extend `BaseService` (`vehicle-services/base.ts`) or `BaseEnergyService` (`energy-services/base.ts`). Copy a neighbour: `sentry.ts` (Switch), `tonneau.ts` (WindowCovering), `grid-outage.ts` (energy ContactSensor).
   - **subType**: if another service on the accessory already uses the same HAP type (Switch, LockMechanism, ContactSensor), pass a stable unique `subType`. Without it the two collapse onto one HAP service. If the type has no sibling (like Information, Battery, Climate), omit `subType`.
   - **Vehicle data**: `this.subscribeSignal(signal, Characteristic, mapper)`.
   - **Energy data**: subscribe to `site.api` events (`this.subscribeToEvent("liveStatus" | "siteInfo", ...)`) and read `data.response`. Never touch `site.sse`. Stream `site_info` is a partial subset; do not expect the full REST shape.
   - **Commands**: `this.registerCharacteristicSet(Characteristic, async (value) => { await this.command(vehicle.api.<method>(...)); })`. `command()` turns a refused `result: false` into a HomeKit failure.
   - **Generic helpers** over `Service`/`Characteristic` statics need `WithUUID<{ new (...): T }>` types, as in `base.ts`. `typeof Service` breaks the `addService`/`getCharacteristic` overloads.

3. **Never show a safe value before the first reading.** Do one of these:
   - Create the sensor lazily when its first signal arrives (`presence.ts`, `wall-connector.ts`).
   - Construct it eagerly, set `StatusFault` to `GENERAL_FAULT`, and set `NO_FAULT` on the first real payload (`grid-outage.ts`, `tpms.ts`).

   If you keep a lazily-populated per-entity map, hydrate it from the cached accessory services in the constructor, as `WallConnectorService` does.

4. **StatusFault on stream failure.** `setStreamFault()` in the base classes works only for service types that list `StatusFault` in `service.optionalCharacteristics` (sensors). For control services it is a deliberate no-op; do not force it with `getCharacteristic()`. If the class owns more than one HAP `Service`, override `setStreamFault()` to loop over all of them (`tpms.ts`, `door.ts`).

5. **Register and gate** it in `src/vehicle.ts` `initializeServices()` or in `src/energy.ts`.
   - If the hardware exists on one model only, gate on `useTeslaModel(this.vehicle.vin)` (see `TonneauService`).
   - If it depends on vehicle config, gate on metadata (see `door.ts`: `vehicle.metadata.config.can_actuate_trunks`).
   - Never register a model- or config-dependent service unconditionally.

6. **Test** in `test/<name>.test.ts` with `createFakePlatform`/`createFakeAccessory` (`test/fakePlatform.ts`) and `createFakeVehicle` (`test/fakeVehicle.ts`) or `createFakeEnergySite` (`test/fakeEnergySite.ts`). Real hap-nodejs classes are used.
   - Drive vehicle signals with `sse.emitSignal(...)`.
   - Drive characteristics with `handleSetRequest`/`handleGetRequest`, not `setValue` (it fires the handler with nothing to await).
   - If you add a sibling of an existing HAP type, update the counts and subtypes in `test/serviceCollision.test.ts` or `test/energyServiceCollision.test.ts`.

7. **Check and release.** `pnpm --filter homebridge-teslemetry build`, `pnpm --filter homebridge-teslemetry test`, `pnpm -r --no-bail tsc`, `pnpm lint`, then `pnpm changeset` (minor for a new service).
