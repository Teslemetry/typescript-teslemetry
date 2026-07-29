---
"@teslemetry/api": patch
---

Unblock the `pnpm client` codegen script, which was crashing outright on this repo's pinned toolchain (`@hey-api/openapi-ts@0.88.0` against `typescript@7.0.2`, `TypeError: Cannot read properties of undefined (reading 'LineFeed')`) - `@hey-api/openapi-ts` bumped to a `next` prerelease that dropped its runtime dependency on the `typescript` package entirely (no stable release with this fix exists yet). Regenerating the client against the current API spec also picked up: the general SSE route's path param renaming from `vin` to `id` (`getSseByVin_` -> `getSseById_`), and a wider surface of schema changes accumulated since the client was last regenerated.
