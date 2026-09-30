---
"@teslemetry/n8n-nodes-teslemetry": minor
---

Make the package installable in n8n, and make failures visible.

- **Loading.** Every earlier version listed a single bundle in its manifest, and n8n (which takes each class name from its file name) loaded no nodes and no credential from it. The package now builds one file per node and credential, so it installs from Community Nodes and shows Teslemetry Vehicle, Teslemetry Energy, Teslemetry Trigger and the Teslemetry API credential. It also declares `n8nNodesApiVersion` and the `n8n-workflow` peer dependency, ships a LICENSE file, and the Vehicle node has an icon instead of a question mark.
- **Errors.** A failed Teslemetry request now shows the API's own message (for example "Active subscription required") with its HTTP status, in the node's error, in the error item when Continue On Fail is on, and in the vehicle, site and field dropdowns. Previously the error was blank. A command the API answers with `result: false` now fails with its reason instead of passing as a success, unless the reason is `already_set`, `not_charging` or `requested`.
- **Trigger.** The Trigger node checks the token and subscription before it opens the stream, so a wrong or revoked token or a lapsed subscription fails activation with a message instead of putting n8n into a reactivation loop. A subscription that lapses later is reported once, and a rate-limited stream is logged once while it keeps retrying.
- **Logging.** SDK log lines go through n8n's logger at debug level instead of being written to the process output, and one SDK client is built per execution rather than per item.

Also picks up the bundled SDK's stream reconnect fix: the backoff resets as soon as any traffic arrives on the stream.
