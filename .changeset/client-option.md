---
"@teslemetry/api": minor
---

Add a `client` option to the `Teslemetry` constructor. Set it to your app's name and version, such as `"my-app/1.2.3"`, and the SDK sends it as an `X-Client` header on every request. `X-Library` is unchanged.
