---
"@teslemetry/api": minor
---

Support Teslemetry for Business API keys (`sk_...`). A business key is detected by its prefix and sent only in the `Authorization` header. The new `teslemetry.business` namespace lists consented products (`products()`, `createProducts()`) and learns each product's region, so requests and streams go straight to that region's host instead of pinning the client to one region. With a business key, `teslemetry.sse` opens one `/sse/{id}` stream per product instead of the account-wide stream, reconnects after the api's planned 5-minute stream end without a `disconnect`, and stops only the affected product's stream when that product is refused. Business error codes are thrown as typed errors (`TeslemetryBusinessError` and subclasses). Consumer tokens behave as before.
