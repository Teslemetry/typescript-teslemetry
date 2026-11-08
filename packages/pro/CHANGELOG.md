# @teslemetry/pro

## 0.1.2

### Patch Changes

- bb43c77: The stream now resumes from the last `cursor` received when it reconnects, so the server's snapshot starts after it instead of resending everything. Vehicle `data`, `alerts`, `errors` and `connectivity` event types carry the optional `cursor`.

## 0.1.1

### Patch Changes

- e72e709: Build against `tesla-fleet-api` 0.4, importing its `tariff`, `const` and `types` subpaths instead of the removed `dist/...` deep imports. The bundled output is unchanged in behaviour and still has no runtime `tesla-fleet-api` dependency.

## 0.1.0

### Minor Changes

- Initial release: a copy of `@teslemetry/api` with its client generated from the Teslemetry for Business schema (`https://api.teslemetry.pro/openapi.yaml`). It talks to `api.teslemetry.pro`, discovers consented products through `GET /api/business/products`, and emits the business stream's `product` event. Wrappers for routes the business API does not serve are not included.
