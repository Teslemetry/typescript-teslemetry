# @teslemetry/pro

## 0.1.0

### Minor Changes

- Initial release: a copy of `@teslemetry/api` with its client generated from the Teslemetry for Business schema (`https://api.teslemetry.pro/openapi.yaml`). It talks to `api.teslemetry.pro`, discovers consented products through `GET /api/business/products`, and emits the business stream's `product` event. Wrappers for routes the business API does not serve are not included.
